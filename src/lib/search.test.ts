import { describe, expect, it } from "vitest";
import { searchPattern } from "./search";

describe("searchPattern", () => {
  it("procura o texto em qualquer parte da descrição", () => {
    expect(searchPattern("uber")).toBe("%uber%");
  });

  it("neutraliza curingas digitados pela pessoa", () => {
    expect(searchPattern("50%_off")).toBe(String.raw`%50\%\_off%`);
  });

  it("texto vazio ou só espaços não filtra", () => {
    expect(searchPattern("   ")).toBeNull();
    expect(searchPattern(undefined)).toBeNull();
  });

  it("limita o tamanho da busca", () => {
    expect(searchPattern("a".repeat(200))!.length).toBe(82);
  });
});
