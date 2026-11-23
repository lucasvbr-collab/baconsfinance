import { describe, expect, it } from "vitest";
import { cleanVapidKey, vapidPublicKeyBytes } from "./vapid";

// Chave pública P-256 de exemplo (65 bytes, começa com 0x04), só para teste.
const KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

describe("cleanVapidKey", () => {
  it("tira aspas, espaços, quebras de linha e o 'NOME=' colado junto", () => {
    expect(cleanVapidKey(`"${KEY}"`)).toBe(KEY);
    expect(cleanVapidKey(` ${KEY}\n`)).toBe(KEY);
    expect(cleanVapidKey(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${KEY}`)).toBe(KEY);
    expect(cleanVapidKey(`'${KEY}'`)).toBe(KEY);
    expect(cleanVapidKey(undefined)).toBe("");
  });
});

describe("vapidPublicKeyBytes", () => {
  it("decodifica a chave válida em 65 bytes", () => {
    const bytes = vapidPublicKeyBytes(`"${KEY}"`);
    expect(bytes?.length).toBe(65);
    expect(bytes?.[0]).toBe(4);
  });

  it("chave inválida → null (em vez de quebrar)", () => {
    expect(vapidPublicKeyBytes("isso não é uma chave")).toBeNull();
    expect(vapidPublicKeyBytes(KEY.slice(0, 40))).toBeNull();
    expect(vapidPublicKeyBytes("")).toBeNull();
  });
});
