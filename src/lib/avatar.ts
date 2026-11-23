/** Configuração do avatar de porquinho de cada membro do lar. */

export type AvatarStyle = "masculino" | "feminino";

const NONE = { id: "nenhum", label: "Nenhum" } as const;

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
  head: [
    NONE,
    { id: "laco", label: "Laço" },
    { id: "tiara", label: "Tiara" },
    { id: "flor", label: "Flor" },
    { id: "presilha", label: "Presilha" },
    { id: "bandana", label: "Bandana" },
    { id: "chapeu", label: "Chapéu de sol" },
    { id: "bone", label: "Boné" },
    { id: "coroa", label: "Coroa" },
  ],
  hair: [
    NONE,
    { id: "franja", label: "Franjinha" },
    { id: "rabo", label: "Rabo de cavalo" },
    { id: "coque", label: "Coque" },
    { id: "chiquinhas", label: "Maria-chiquinha" },
  ],
  face: [
    NONE,
    { id: "oculos", label: "Óculos" },
    { id: "gatinho", label: "Gatinho" },
    { id: "coracao", label: "Coração" },
  ],
  makeup: [
    NONE,
    { id: "cilios", label: "Cílios" },
    { id: "blush", label: "Blush" },
    { id: "batom", label: "Batom" },
    { id: "completa", label: "Completa" },
  ],
  ears: [
    NONE,
    { id: "perola", label: "Pérola" },
    { id: "argola", label: "Argola" },
    { id: "estrela", label: "Estrela" },
  ],
  neck: [
    NONE,
    { id: "perolas", label: "Pérolas" },
    { id: "gargantilha", label: "Gargantilha" },
    { id: "lacinho", label: "Lacinho" },
    { id: "cachecol", label: "Cachecol" },
    { id: "gravata", label: "Gravata" },
  ],
  background: [
    { id: "lima", label: "Lima", fill: "#c8f169" },
    { id: "ameixa", label: "Ameixa", fill: "#2b1a4f" },
    { id: "violeta", label: "Violeta", fill: "#6c4cf1" },
    { id: "nevoa", label: "Névoa", fill: "#ede8fe" },
  ],
} as const;

type Ids<K extends keyof typeof AVATAR_OPTIONS> = (typeof AVATAR_OPTIONS)[K][number]["id"];

export type AvatarColor = Ids<"color">;
export type AvatarHead = Ids<"head">;
export type AvatarHair = Ids<"hair">;
export type AvatarFace = Ids<"face">;
export type AvatarMakeup = Ids<"makeup">;
export type AvatarEars = Ids<"ears">;
export type AvatarNeck = Ids<"neck">;
export type AvatarBackground = Ids<"background">;

export type AvatarConfig = {
  style: AvatarStyle;
  color: AvatarColor;
  head: AvatarHead;
  hair: AvatarHair;
  face: AvatarFace;
  makeup: AvatarMakeup;
  ears: AvatarEars;
  neck: AvatarNeck;
  background: AvatarBackground;
};

/** Espaços de item, na ordem em que aparecem no editor. */
export const AVATAR_SLOTS = ["head", "hair", "face", "makeup", "ears", "neck"] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

/** Colunas da tabela de avatares que viram AvatarConfig. */
export const AVATAR_COLUMNS = "style, color, background, head, hair, face, makeup, ears, neck";

export function defaultAvatar(style: AvatarStyle): AvatarConfig {
  return {
    style,
    color: "rosa",
    head: style === "feminino" ? "laco" : "bone",
    hair: "nenhum",
    face: "nenhum",
    makeup: "nenhum",
    ears: "nenhum",
    neck: "nenhum",
    background: "lima",
  };
}

/** Trocar o estilo traz o item de cabeça típico dele só se o atual era o típico do outro. */
export function switchStyle(config: AvatarConfig, style: AvatarStyle): AvatarConfig {
  const typicalOld = defaultAvatar(config.style).head;
  const head = config.head === typicalOld ? defaultAvatar(style).head : config.head;
  return { ...config, style, head };
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
    head: pick(row?.head, AVATAR_OPTIONS.head, base.head),
    hair: pick(row?.hair, AVATAR_OPTIONS.hair, base.hair),
    face: pick(row?.face, AVATAR_OPTIONS.face, base.face),
    makeup: pick(row?.makeup, AVATAR_OPTIONS.makeup, base.makeup),
    ears: pick(row?.ears, AVATAR_OPTIONS.ears, base.ears),
    neck: pick(row?.neck, AVATAR_OPTIONS.neck, base.neck),
    background: pick(row?.background, AVATAR_OPTIONS.background, base.background),
  };
}
