import OpenAI from "openai";

export type CategoryKind = "income" | "expense";

/**
 * Normaliza descrição/comerciante para casar com regras:
 * maiúsculas, sem números de loja/terminal, espaços colapsados.
 */
export function normalizeMerchant(text: string): string {
  return text
    .toUpperCase()
    .replace(/#\s*\d+/g, " ") // "#1234"
    .replace(/\b\d{4,}\b/g, " ") // números longos (terminais, refs)
    .replace(/[*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type CategoryRule = {
  id: string;
  pattern: string;
  category_id: string;
};

/**
 * Regra cujo padrão está contido no texto normalizado. Se várias casarem,
 * vence o padrão mais longo (mais específico): "COSTCO WHOLESAL" ganha de "COSTCO".
 */
export function matchRule(
  rules: CategoryRule[],
  text: string,
): CategoryRule | null {
  const norm = normalizeMerchant(text);
  if (!norm) return null;
  let best: CategoryRule | null = null;
  for (const rule of rules) {
    if (!rule.pattern || !norm.includes(rule.pattern)) continue;
    if (!best || rule.pattern.length > best.pattern.length) best = rule;
  }
  return best;
}

export type AiCategorizeItem = {
  index: number;
  description: string;
  type: CategoryKind;
};

export type AiCategory = { name: string; kind: CategoryKind };

/** Exemplo do histórico já confirmado: comerciante → categoria. */
export type AiExample = { description: string; category: string };

/**
 * Categoriza em lote via gpt-4o-mini. Retorna map index → nome de categoria.
 * Só aceita categorias do mesmo tipo da transação (receita/despesa).
 * Sem OPENAI_API_KEY, retorna map vazio.
 */
export async function aiCategorize(
  items: AiCategorizeItem[],
  categories: AiCategory[],
  examples: AiExample[] = [],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || items.length === 0 || categories.length === 0) {
    return result;
  }

  const expenseNames = categories
    .filter((c) => c.kind === "expense")
    .map((c) => c.name);
  const incomeNames = categories
    .filter((c) => c.kind === "income")
    .map((c) => c.name);

  const exampleText =
    examples.length > 0
      ? `\nExemplos já confirmados pelo usuário (siga este padrão):\n${examples
          .map((e) => `- "${e.description}" → ${e.category}`)
          .join("\n")}`
      : "";

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você categoriza transações bancárias canadenses (RBC).
Para despesas, use EXATAMENTE um destes nomes: ${expenseNames.join(", ") || "(nenhum)"}.
Para receitas, use EXATAMENTE um destes nomes: ${incomeNames.join(", ") || "(nenhum)"}.
Nunca use uma categoria de receita para despesa, nem o contrário.${exampleText}
Responda APENAS um JSON: {"assignments":[{"index":number,"category":string}]}.
Se nenhuma categoria servir para uma transação, omita-a da resposta.`,
        },
        {
          role: "user",
          content: JSON.stringify(
            items.map((i) => ({
              index: i.index,
              description: i.description,
              type: i.type === "income" ? "receita" : "despesa",
            })),
          ),
        },
      ],
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return result;
    const json = JSON.parse(raw) as {
      assignments?: { index?: number; category?: string }[];
    };
    const byLower = new Map(
      categories.map((c) => [c.name.toLocaleLowerCase("pt-BR"), c]),
    );
    const typeByIndex = new Map(items.map((i) => [i.index, i.type]));
    for (const a of json.assignments ?? []) {
      if (typeof a.index !== "number" || typeof a.category !== "string") {
        continue;
      }
      const cat = byLower.get(a.category.toLocaleLowerCase("pt-BR"));
      if (cat && cat.kind === typeByIndex.get(a.index)) {
        result.set(a.index, cat.name);
      }
    }
  } catch {
    // IA indisponível → tudo cai na categoria padrão como pending_review.
  }
  return result;
}
