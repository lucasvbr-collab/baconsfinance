import { describe, expect, it } from "vitest";
import { AVATAR_OPTIONS, defaultAvatar, parseAvatar } from "./avatar";

describe("defaultAvatar", () => {
  it("masculino começa de boné, feminino de laço", () => {
    expect(defaultAvatar("masculino")).toEqual({
      style: "masculino",
      color: "rosa",
      accessory: "bone",
      background: "lima",
    });
    expect(defaultAvatar("feminino").accessory).toBe("laco");
  });
});

describe("parseAvatar", () => {
  it("sem avatar salvo usa o padrão masculino", () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar("masculino"));
  });

  it("aceita uma configuração válida do banco", () => {
    expect(
      parseAvatar({ style: "feminino", color: "lilas", accessory: "oculos", background: "ameixa" }),
    ).toEqual({ style: "feminino", color: "lilas", accessory: "oculos", background: "ameixa" });
  });

  it("troca valor desconhecido pelo padrão do estilo", () => {
    expect(
      parseAvatar({ style: "feminino", color: "verde-neon", accessory: "chapeu", background: "x" }),
    ).toEqual(defaultAvatar("feminino"));
  });

  it("todas as opções têm rótulo em português", () => {
    for (const group of Object.values(AVATAR_OPTIONS)) {
      for (const opt of group) expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});
