/** Configuração do avatar de porquinho de cada membro do lar. */

export type AvatarStyle = "masculino" | "feminino";

export const AVATAR_OPTIONS = {
  style: [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
  ],
  color: [
    { id: "rosa", label: "Rosa", fill: "#f6a8c0", shade: "#e27d9f" },
    { id: "pessego", label: "Pêssego", fill: "#ffc39a", shade: "#ee9d6a" },
    { id: "lilas", label: "Lilás", fill: "#c9b6ff", shade: "#9f86ef" },
    { id: "menta", label: "Menta", fill: "#a6e8c8", shade: "#6cc9a0" },
    { id: "caramelo", label: "Caramelo", fill: "#d9a77a", shade: "#b07b4f" },
  ],
  accessory: [
    { id: "nenhum", label: "Nenhum" },
    { id: "laco", label: "Laço" },
    { id: "bone", label: "Boné" },
    { id: "gravata", label: "Gravata" },
    { id: "oculos", label: "Óculos" },
    { id: "coroa", label: "Coroa" },
  ],
  background: [
    { id: "lima", label: "Lima", fill: "#c8f169" },
    { id: "ameixa", label: "Ameixa", fill: "#2b1a4f" },
    { id: "violeta", label: "Violeta", fill: "#6c4cf1" },
    { id: "nevoa", label: "Névoa", fill: "#ede8fe" },
  ],
} as const;

export type AvatarColor = (typeof AVATAR_OPTIONS.color)[number]["id"];
export type AvatarAccessory = (typeof AVATAR_OPTIONS.accessory)[number]["id"];
export type AvatarBackground = (typeof AVATAR_OPTIONS.background)[number]["id"];

export type AvatarConfig = {
  style: AvatarStyle;
  color: AvatarColor;
  accessory: AvatarAccessory;
  background: AvatarBackground;
};

export function defaultAvatar(style: AvatarStyle): AvatarConfig {
  return {
    style,
    color: "rosa",
    accessory: style === "feminino" ? "laco" : "bone",
    background: "lima",
  };
}

function pick<T extends string>(
  value: unknown,
  options: readonly { id: T }[],
  fallback: T,
): T {
  return options.some((o) => o.id === value) ? (value as T) : fallback;
}

/** Linha do banco (ou nada) → configuração válida, com padrões do estilo. */
export function parseAvatar(row: Record<string, unknown> | null | undefined): AvatarConfig {
  const style = pick(row?.style, AVATAR_OPTIONS.style, "masculino");
  const base = defaultAvatar(style);
  return {
    style,
    color: pick(row?.color, AVATAR_OPTIONS.color, base.color),
    accessory: pick(row?.accessory, AVATAR_OPTIONS.accessory, base.accessory),
    background: pick(row?.background, AVATAR_OPTIONS.background, base.background),
  };
}
