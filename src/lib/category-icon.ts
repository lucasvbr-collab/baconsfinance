/** Ícone de cada categoria, escolhido pelo nome (sem guardar nada no banco). */
export type CategoryIconKey =
  | "bag"
  | "coffee"
  | "dining"
  | "house"
  | "fuel"
  | "car"
  | "shield"
  | "paw"
  | "repeat"
  | "wallet"
  | "arrowIn"
  | "bulb"
  | "wifi"
  | "phone"
  | "pill"
  | "heart"
  | "bottle"
  | "cap"
  | "pig"
  | "tag";

/** Ordem importa: o primeiro que casar vence ("seguro carro" → escudo, não carro). */
const RULES: [RegExp, CategoryIconKey][] = [
  [/seguro/, "shield"],
  [/celular|telefone/, "phone"],
  [/mercado|supermercado|compras/, "bag"],
  [/aliment|lanche|cafe/, "coffee"],
  [/lazer|restaurante|delivery|comer fora/, "dining"],
  [/aluguel|moradia|casa|condominio/, "house"],
  [/gasolina|combustivel|posto/, "fuel"],
  [/transporte|carro|uber|estacionamento|onibus/, "car"],
  [/\bpet\b|animal|cachorro|gato/, "paw"],
  [/assinatura|streaming/, "repeat"],
  [/salario|bonus|renda|pagamento/, "wallet"],
  [/entrada|reembolso|devolu/, "arrowIn"],
  [/\bluz\b|energia|eletric/, "bulb"],
  [/internet|wi-?fi/, "wifi"],
  [/remedio|farmacia|medicamento/, "pill"],
  [/saude|medic|dentista|consulta/, "heart"],
  [/bebe|baby|crianca|filh/, "bottle"],
  [/faculdade|escola|curso|educa|estudo/, "cap"],
  [/extra|outros|diversos/, "pig"],
];

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function categoryIconKey(name: string | null | undefined): CategoryIconKey {
  const n = normalize(name ?? "");
  if (!n) return "tag";
  return RULES.find(([re]) => re.test(n))?.[1] ?? "tag";
}
