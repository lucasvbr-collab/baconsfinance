"""One-shot: categorize CSV with OpenAI and write SQL inserts for Supabase MCP."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import urllib.request
from pathlib import Path

HOUSEHOLD_ID = "540be4e2-0c0c-4b43-a178-74df6ee912a2"
USER_ID = "b7512df9-b111-40cd-946e-b6971bf467db"

SEED = [
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
]


def load_env():
    root = Path(__file__).resolve().parents[1]
    env = root / ".env.local"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        t = line.strip()
        if not t or t.startswith("#") or "=" not in t:
            continue
        k, v = t.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def import_hash(day: str, amount: float, description: str, typ: str) -> str:
    raw = f"csv|{day}|{amount:.2f}|{description}|{typ}"
    return hashlib.sha256(raw.encode()).hexdigest()


def openai_categorize(items: list[dict], categories: list[str]) -> dict[int, str]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {}
    result: dict[int, str] = {}
    batch_size = 40
    for start in range(0, len(items), batch_size):
        batch = items[start : start + batch_size]
        body = {
            "model": "gpt-4o-mini",
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You categorize Canadian bank transactions. "
                        f"Available categories (use EXACTLY one): {', '.join(categories)}. "
                        'Respond ONLY JSON: {"assignments":[{"index":number,"category":string}]}.'
                    ),
                },
                {"role": "user", "content": json.dumps(batch)},
            ],
            "max_tokens": 2000,
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
            raw = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw)
            lower = {c.lower(): c for c in categories}
            for a in parsed.get("assignments", []):
                idx = a.get("index")
                cat = a.get("category")
                if isinstance(idx, int) and isinstance(cat, str):
                    name = lower.get(cat.lower())
                    if name:
                        result[idx] = name
            print(f"AI batch {start}-{start+len(batch)}: {len(result)} assigned so far")
        except Exception as e:
            print("AI batch failed:", e)
    return result


def main():
    load_env()
    csv_path = Path(r"C:\Users\lucas\Downloads\documents\rbc-chequing-2026-03-08.csv")
    out_dir = Path(__file__).resolve().parent / "out"
    out_dir.mkdir(exist_ok=True)

    rows = []
    with csv_path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            day = row["Transaction Date"].strip()
            signed = float(row["CAD$"])
            if signed == 0:
                continue
            desc = (row.get("Description 1") or "Sem descrição").strip()
            typ = "expense" if signed < 0 else "income"
            amount = abs(signed)
            rows.append(
                {
                    "day": day,
                    "date_iso": f"{day}T12:00:00+00:00",
                    "description": desc,
                    "amount": amount,
                    "type": typ,
                    "import_hash": import_hash(day, amount, desc, typ),
                }
            )

    print(f"CSV rows: {len(rows)}")
    ai = openai_categorize(
        [
            {"index": i, "description": r["description"], "type": r["type"]}
            for i, r in enumerate(rows)
        ],
        SEED,
    )

    # SQL: seed categories
    seed_sql = []
    for name in SEED:
        seed_sql.append(
            f"""insert into categories_baconsfinance (household_id, user_id, name, monthly_limit)
select {sql_str(HOUSEHOLD_ID)}::uuid, {sql_str(USER_ID)}::uuid, {sql_str(name)}, 0
where not exists (
  select 1 from categories_baconsfinance
  where household_id = {sql_str(HOUSEHOLD_ID)}::uuid and lower(name) = lower({sql_str(name)})
);"""
        )
    (out_dir / "01_seed_categories.sql").write_text(
        "\n".join(seed_sql), encoding="utf-8"
    )

    # Build category lookup will happen in SQL via subquery by name
    inserts = []
    for i, r in enumerate(rows):
        cat = ai.get(i, "Outros")
        merchant = re.sub(r"\s+", " ", r["description"]).strip()[:200]
        inserts.append(
            f"""insert into transactions_baconsfinance (
  household_id, user_id, description, amount, date, category_id, type,
  source, status, merchant_name, import_hash
)
select
  {sql_str(HOUSEHOLD_ID)}::uuid,
  {sql_str(USER_ID)}::uuid,
  {sql_str(r['description'])},
  {r['amount']:.2f},
  {sql_str(r['date_iso'])}::timestamptz,
  c.id,
  {sql_str(r['type'])},
  'csv',
  'pending_review',
  {sql_str(merchant)},
  {sql_str(r['import_hash'])}
from categories_baconsfinance c
where c.household_id = {sql_str(HOUSEHOLD_ID)}::uuid
  and lower(c.name) = lower({sql_str(cat)})
  and not exists (
    select 1 from transactions_baconsfinance t
    where t.household_id = {sql_str(HOUSEHOLD_ID)}::uuid
      and t.import_hash = {sql_str(r['import_hash'])}
  );"""
        )

    # Write in chunks of 40
    chunk_size = 40
    files = []
    for i in range(0, len(inserts), chunk_size):
        chunk = inserts[i : i + chunk_size]
        fp = out_dir / f"02_insert_{i // chunk_size:03d}.sql"
        fp.write_text("\n".join(chunk), encoding="utf-8")
        files.append(fp.name)

    meta = {
        "total": len(rows),
        "ai_assigned": len(ai),
        "seed_file": "01_seed_categories.sql",
        "insert_files": files,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote SQL under {out_dir} ({len(files)} insert files, AI={len(ai)})")


if __name__ == "__main__":
    main()
