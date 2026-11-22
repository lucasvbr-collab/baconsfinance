import { AVATAR_OPTIONS, type AvatarConfig } from "@/lib/avatar";

const INK = "#2b1a4f";
const ACCENT = "#6c4cf1";
const GOLD = "#f2b544";

/** Rosto de porquinho montado por partes (estilo, cor, acessório, fundo). */
export function PigAvatar({
  config,
  className = "h-9 w-9",
  title,
}: {
  config: AvatarConfig;
  className?: string;
  title?: string;
}) {
  const color = AVATAR_OPTIONS.color.find((c) => c.id === config.color) ?? AVATAR_OPTIONS.color[0];
  const bg =
    AVATAR_OPTIONS.background.find((b) => b.id === config.background)?.fill ??
    AVATAR_OPTIONS.background[0].fill;
  const bow = config.background === "violeta" ? "#e5486f" : ACCENT;
  const fem = config.style === "feminino";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${className} shrink-0 rounded-full`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="50" cy="50" r="50" fill={bg} />

      {/* orelhas */}
      <g fill={color.shade}>
        <path d="M24 44 C18 32 18 21 25 17 C29 15 33 17 36 20 C40 24 44 29 46 33 Z" />
        <path d="M76 44 C82 32 82 21 75 17 C71 15 67 17 64 20 C60 24 56 29 54 33 Z" />
      </g>
      <g fill={color.fill} opacity="0.55">
        <path d="M27 38 C24 30 24 24 28 21.5 C31 21 34 24 37 28 Z" />
        <path d="M73 38 C76 30 76 24 72 21.5 C69 21 66 24 63 28 Z" />
      </g>

      {/* cabeça */}
      <ellipse cx="50" cy="57" rx="30" ry="27" fill={color.fill} />

      {/* bochechas */}
      <ellipse cx="30.5" cy="63" rx="5" ry="3.6" fill="#ff6f9a" opacity="0.32" />
      <ellipse cx="69.5" cy="63" rx="5" ry="3.6" fill="#ff6f9a" opacity="0.32" />

      {/* olhos */}
      <circle cx="38.5" cy="51" r="3.6" fill={INK} />
      <circle cx="61.5" cy="51" r="3.6" fill={INK} />
      <circle cx="39.7" cy="49.8" r="1.1" fill="#fff" />
      <circle cx="62.7" cy="49.8" r="1.1" fill="#fff" />

      {fem ? (
        <g stroke={INK} strokeWidth="1.8" strokeLinecap="round">
          <path d="M34.8 47.6 l-2.6 -2.2 M36.8 46.2 l-1.4 -2.9" />
          <path d="M65.2 47.6 l2.6 -2.2 M63.2 46.2 l1.4 -2.9" />
        </g>
      ) : (
        <g stroke={INK} strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
          <path d="M34 44.2 q4.5 -2.4 9 0" fill="none" />
          <path d="M57 44.2 q4.5 -2.4 9 0" fill="none" />
        </g>
      )}

      {/* focinho */}
      <ellipse cx="50" cy="64.5" rx="12.5" ry="8.8" fill={color.shade} />
      <ellipse cx="45.4" cy="64.5" rx="2.1" ry="3.2" fill={INK} opacity="0.6" />
      <ellipse cx="54.6" cy="64.5" rx="2.1" ry="3.2" fill={INK} opacity="0.6" />

      {/* sorriso */}
      <path d="M44.5 76 q5.5 4 11 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />

      <Accessory id={config.accessory} bow={bow} />
    </svg>
  );
}

function Accessory({ id, bow }: { id: AvatarConfig["accessory"]; bow: string }) {
  switch (id) {
    case "laco":
      return (
        <g transform="translate(70 24) rotate(18)">
          <path d="M0 0 L-11 -7 L-11 7 Z" fill={bow} stroke={bow} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M0 0 L11 -7 L11 7 Z" fill={bow} stroke={bow} strokeWidth="2.5" strokeLinejoin="round" />
          <circle r="3.6" fill={bow} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
        </g>
      );
    case "bone":
      return (
        <g>
          <path d="M27 41 Q30 19 50 18.5 Q70 19 73 41 Z" fill={ACCENT} />
          <path d="M52 38 H84 Q88 38 86 42 H52 Z" fill={ACCENT} />
          <path d="M27 41 H73" stroke={INK} strokeOpacity="0.25" strokeWidth="2" />
          <circle cx="50" cy="19.5" r="2.4" fill={INK} opacity="0.35" />
        </g>
      );
    case "gravata":
      return (
        <g transform="translate(50 88)">
          <path d="M0 0 L-12 -6.5 L-12 6.5 Z" fill={ACCENT} stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M0 0 L12 -6.5 L12 6.5 Z" fill={ACCENT} stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="-3.4" y="-3.6" width="6.8" height="7.2" rx="2" fill={INK} />
        </g>
      );
    case "oculos":
      return (
        <g fill="none" stroke={INK} strokeWidth="2.6">
          <circle cx="38.5" cy="51" r="8.2" />
          <circle cx="61.5" cy="51" r="8.2" />
          <path d="M46.7 50 Q50 47.5 53.3 50" />
          <path d="M30.3 49.5 L21.5 46.5 M69.7 49.5 L78.5 46.5" />
        </g>
      );
    case "coroa":
      return (
        <path
          d="M33 33 L35 15 L43 25 L50 12 L57 25 L65 15 L67 33 Z"
          fill={GOLD}
          stroke={GOLD}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}
