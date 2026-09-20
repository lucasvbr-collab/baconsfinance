import OpenAI from "openai";

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

/** Primeira regra cujo padrão está contido no texto normalizado. */
export function matchRule(
  rules: CategoryRule[],
  text: string,
): CategoryRule | null {
  const norm = normalizeMerchant(text);
  if (!norm) return null;
  for (const rule of rules) {
    if (rule.pattern && norm.includes(rule.pattern)) return rule;
  }
  return null;
}

export type AiCategorizeItem = {
  index: number;
  description: string;
  type: "income" | "expense";
};

/**
 * Categoriza em lote via gpt-4o-mini. Retorna map index → nome de categoria
 * (apenas nomes da lista fornecida). Sem OPENAI_API_KEY, retorna map vazio.
 */
export async function aiCategorize(
  items: AiCategorizeItem[],
  categoryNames: string[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || items.length === 0 || categoryNames.length === 0) {
    return result;
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você categoriza transações bancárias canadenses (RBC).
Categorias disponíveis (use EXATAMENTE um destes nomes): ${categoryNames.join(", ")}.
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
    const lowerToName = new Map(
      categoryNames.map((n) => [n.toLocaleLowerCase("pt-BR"), n]),
    );
    for (const a of json.assignments ?? []) {
      if (typeof a.index !== "number" || typeof a.category !== "string") {
        continue;
      }
      const name = lowerToName.get(a.category.toLocaleLowerCase("pt-BR"));
      if (name) result.set(a.index, name);
    }
  } catch {
    // IA indisponível → tudo cai na categoria padrão como pending_review.
  }
  return result;
}
