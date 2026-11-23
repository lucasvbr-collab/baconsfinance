/**
 * Import RBC CSV into Bacon's Finance using the same pipeline as the app.
 *
 * Usage:
 *   npx tsx scripts/import-rbc-csv.ts [path-to-csv]
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY (for AI categorization fallback)
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const HOUSEHOLD_ID = "540be4e2-0c0c-4b43-a178-74df6ee912a2";
const USER_ID = "b7512df9-b111-40cd-946e-b6971bf467db";

const SEED_CATEGORIES = [
  "Mercado",
  "Restaurante",
  "Transporte",
  "Combustível",
  "Moradia",
  "Saúde",
  "Pets",
  "Compras",
  "Salário",
  "Transferências",
  "Serviços",
  "Outros",
];

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function parseCsv(raw: string): {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  importHash: string;
}[] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  const lines = text.split(/\r?\n/);
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf("transaction date");
  const descIdx = header.indexOf("description 1");
  const cadIdx = header.findIndex((h) => h === "cad$" || h === "cad");
  if (dateIdx < 0 || cadIdx < 0) throw new Error("CSV header invalid");

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const row = splitCsv(lines[i]!);
    if (!row.length) continue;
    const day = row[dateIdx]?.trim() ?? "";
    const signed = Number.parseFloat((row[cadIdx] ?? "").replace(/,/g, ""));
    if (!day || !Number.isFinite(signed) || signed === 0) continue;
    const description = (row[descIdx] ?? "Sem descrição").trim();
    const type = signed < 0 ? "expense" : "income";
    const amount = Math.abs(signed);
    const importHash = createHash("sha256")
      .update(`csv|${day}|${amount.toFixed(2)}|${description}|${type}`)
      .digest("hex");
    out.push({
      date: new Date(`${day}T12:00:00`).toISOString(),
      description,
      amount,
      type: type as "income" | "expense",
      importHash,
    });
  }
  return out;
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (ch === "," && !q) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function normalizeMerchant(text: string): string {
  return text
    .toUpperCase()
    .replace(/#\s*\d+/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function aiCategorize(
  items: { index: number; description: string; type: string }[],
  categoryNames: string[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || items.length === 0) return result;
  const openai = new OpenAI({ apiKey });
  const batchSize = 40;
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You categorize Canadian bank transactions.
Available categories (use EXACTLY one): ${categoryNames.join(", ")}.
Respond ONLY JSON: {"assignments":[{"index":number,"category":string}]}.`,
          },
          { role: "user", content: JSON.stringify(batch) },
        ],
        max_tokens: 2000,
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) continue;
      const json = JSON.parse(raw) as {
        assignments?: { index?: number; category?: string }[];
      };
      const lower = new Map(
        categoryNames.map((n) => [n.toLocaleLowerCase("pt-BR"), n]),
      );
      for (const a of json.assignments ?? []) {
        if (typeof a.index !== "number" || typeof a.category !== "string") {
          continue;
        }
        const name = lower.get(a.category.toLocaleLowerCase("pt-BR"));
        if (name) result.set(a.index, name);
      }
    } catch (e) {
      console.warn("AI batch failed", e);
    }
  }
  return result;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const csvPath = resolve(
    process.argv[2] ??
      "C:/Users/lucas/Downloads/documents/rbc-chequing-2026-03-08.csv",
  );
  const txs = parseCsv(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${txs.length} transactions from CSV`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Seed categories
  const catByName = new Map<string, string>();
  for (const name of SEED_CATEGORIES) {
    const { data: existing } = await supabase
      .from("categories_baconsfinance")
      .select("id, name")
      .eq("household_id", HOUSEHOLD_ID)
      .ilike("name", name)
      .maybeSingle();
    if (existing) {
      catByName.set(existing.name, existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from("categories_baconsfinance")
      .insert({
        household_id: HOUSEHOLD_ID,
        user_id: USER_ID,
        name,
        monthly_limit: 0,
      })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    catByName.set(created.name, created.id);
  }
  console.log(`Categories ready: ${[...catByName.keys()].join(", ")}`);

  // Dedup
  const hashes = txs.map((t) => t.importHash);
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const chunk = hashes.slice(i, i + 200);
    const { data } = await supabase
      .from("transactions_baconsfinance")
      .select("import_hash")
      .eq("household_id", HOUSEHOLD_ID)
      .in("import_hash", chunk);
    for (const row of data ?? []) {
      if (row.import_hash) existing.add(row.import_hash);
    }
  }
  const fresh = txs.filter((t) => !existing.has(t.importHash));
  console.log(`New: ${fresh.length}, skipped duplicates: ${txs.length - fresh.length}`);

  if (fresh.length === 0) {
    console.log("Nothing to import.");
    return;
  }

  // AI categorize all as pending_review
  const aiMap = await aiCategorize(
    fresh.map((t, i) => ({
      index: i,
      description: t.description,
      type: t.type,
    })),
    [...catByName.keys()],
  );

  const fallbackId = catByName.get("Outros")!;
  const rows = fresh.map((t, i) => {
    const name = aiMap.get(i);
    const categoryId = name
      ? (catByName.get(name) ?? fallbackId)
      : fallbackId;
    return {
      household_id: HOUSEHOLD_ID,
      user_id: USER_ID,
      description: t.description,
      amount: t.amount,
      date: t.date,
      category_id: categoryId,
      type: t.type,
      source: "csv",
      status: "pending_review",
      merchant_name: normalizeMerchant(t.description) || t.description,
      import_hash: t.importHash,
    };
  });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase
      .from("transactions_baconsfinance")
      .insert(chunk);
    if (error) throw new Error(error.message);
    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${rows.length}`);
  }

  console.log(
    `Done. inserted=${inserted} pending_review=${rows.length} (AI assigned ${aiMap.size})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
