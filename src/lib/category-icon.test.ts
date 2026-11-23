import { describe, expect, it } from "vitest";
import { categoryIconKey } from "./category-icon";

describe("categoryIconKey", () => {
  it("cobre as categorias de hoje", () => {
    const cases: [string, string][] = [
      ["Mercado", "bag"],
      ["Alimentação", "coffee"],
      ["Lazer", "dining"],
      ["Aluguel", "house"],
      ["Gasolina", "fuel"],
      ["Transporte", "car"],
      ["Seguro carro", "shield"],
      ["Pet", "paw"],
      ["Assinaturas", "repeat"],
      ["Salário", "wallet"],
      ["Entrada", "arrowIn"],
      ["Luz", "bulb"],
      ["Internet", "wifi"],
      ["Plano de Celular", "phone"],
      ["Remédio", "pill"],
      ["Saúde", "heart"],
      ["Bebê", "bottle"],
      ["Faculdade", "cap"],
      ["Extra", "pig"],
    ];
    for (const [name, key] of cases) expect([name, categoryIconKey(name)]).toEqual([name, key]);
  });

  it("ignora acentos, maiúsculas e espaços", () => {
    expect(categoryIconKey("  SAUDE ")).toBe("heart");
    expect(categoryIconKey("remedio")).toBe("pill");
    expect(categoryIconKey("Bebe")).toBe("bottle");
  });

  it("'seguro' vence 'carro' e 'celular' vence 'plano'", () => {
    expect(categoryIconKey("Seguro do carro")).toBe("shield");
    expect(categoryIconKey("Celular")).toBe("phone");
  });

  it("nome desconhecido ou vazio usa o ícone neutro", () => {
    expect(categoryIconKey("Viagem ao Japão")).toBe("tag");
    expect(categoryIconKey("")).toBe("tag");
    expect(categoryIconKey(null)).toBe("tag");
  });
});
