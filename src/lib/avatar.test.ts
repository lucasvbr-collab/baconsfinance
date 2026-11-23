import { describe, expect, it } from "vitest";
import { AVATAR_OPTIONS, AVATAR_SLOTS, defaultAvatar, parseAvatar, switchStyle } from "./avatar";

describe("defaultAvatar", () => {
  it("masculino começa de boné, feminino de laço, resto vazio", () => {
    expect(defaultAvatar("masculino")).toEqual({
      style: "masculino",
      color: "rosa",
      head: "bone",
      hair: "nenhum",
      face: "nenhum",
      makeup: "nenhum",
      ears: "nenhum",
      neck: "nenhum",
      background: "lima",
    });
    expect(defaultAvatar("feminino").head).toBe("laco");
  });
});

describe("parseAvatar", () => {
  it("sem avatar salvo usa o padrão masculino", () => {
    expect(parseAvatar(null)).toEqual(defaultAvatar("masculino"));
  });

  it("aceita uma combinação de vários espaços", () => {
    expect(
      parseAvatar({
        style: "feminino",
        color: "lilas",
        head: "tiara",
        hair: "franja",
        face: "gatinho",
        makeup: "batom",
        ears: "perola",
        neck: "perolas",
        background: "ameixa",
      }),
    ).toEqual({
      style: "feminino",
      color: "lilas",
      head: "tiara",
      hair: "franja",
      face: "gatinho",
      makeup: "batom",
      ears: "perola",
      neck: "perolas",
      background: "ameixa",
    });
  });

  it("troca valor desconhecido pelo padrão do estilo", () => {
    expect(
      parseAvatar({ style: "feminino", color: "verde-neon", head: "chapeu-x", ears: "laco", background: "x" }),
    ).toEqual(defaultAvatar("feminino"));
  });

  it("item de um espaço não vale em outro", () => {
    expect(parseAvatar({ style: "masculino", neck: "oculos" }).neck).toBe("nenhum");
  });

  it("todas as opções têm rótulo em português e todo espaço tem 'Nenhum'", () => {
    for (const group of Object.values(AVATAR_OPTIONS)) {
      for (const opt of group) expect(opt.label.length).toBeGreaterThan(0);
    }
    for (const slot of AVATAR_SLOTS) {
      expect(AVATAR_OPTIONS[slot][0].id).toBe("nenhum");
    }
  });
});

describe("switchStyle", () => {
  it("troca o item típico de cabeça e mantém o resto", () => {
    const fem = { ...defaultAvatar("feminino"), ears: "argola" as const };
    expect(switchStyle(fem, "masculino")).toEqual({ ...fem, style: "masculino", head: "bone" });
  });

  it("mantém um item de cabeça escolhido", () => {
    const fem = { ...defaultAvatar("feminino"), head: "tiara" as const };
    expect(switchStyle(fem, "masculino").head).toBe("tiara");
  });
});
