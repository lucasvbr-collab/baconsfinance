import { AVATAR_OPTIONS, type AvatarConfig } from "@/lib/avatar";

const INK = "#2b1a4f";
const ACCENT = "#6c4cf1";
const GOLD = "#f2b544";
const PINK = "#e5486f";
const PEARL = "#fffaf2";
const PEARL_EDGE = "#d8cde8";

/** Espelha um desenho do lado esquerdo para o direito (eixo x = 50). */
const MIRROR = "translate(100 0) scale(-1 1)";

/** Pérolas do colar ao longo do queixo. */
const NECKLACE = Array.from({ length: 9 }, (_, i) => ({
  x: 31 + i * 4.75,
  y: 83 + 6 * Math.sin((Math.PI * i) / 8),
}));

/** Rosto de porquinho montado por partes (estilo, cor, itens por espaço, fundo). */
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
  const bow = config.background === "violeta" ? PINK : ACCENT;
  const fem = config.style === "feminino";
  const lashes = config.makeup === "cilios" || config.makeup === "completa";
  const blush = config.makeup === "blush" || config.makeup === "completa";
  const lipstick = config.makeup === "batom" || config.makeup === "completa";

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

      <HairBack id={config.hair} fill={color.shade} tie={bow} />

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

      <HairFront id={config.hair} fill={color.shade} tie={bow} />

      {/* bochechas */}
      <g fill="#ff6f9a" opacity={blush ? 0.62 : 0.32}>
        <ellipse cx="30.5" cy="63" rx={blush ? 6 : 5} ry={blush ? 4.2 : 3.6} />
        <ellipse cx="69.5" cy="63" rx={blush ? 6 : 5} ry={blush ? 4.2 : 3.6} />
      </g>
      {blush && (
        <g stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.7">
          <path d="M28 61.5 l1.6 -1.2 M31 61.5 l1.6 -1.2" />
          <path d="M67 61.5 l1.6 -1.2 M70 61.5 l1.6 -1.2" />
        </g>
      )}

      {/* olhos */}
      <circle cx="38.5" cy="51" r="3.6" fill={INK} />
      <circle cx="61.5" cy="51" r="3.6" fill={INK} />
      <circle cx="39.7" cy="49.8" r="1.1" fill="#fff" />
      <circle cx="62.7" cy="49.8" r="1.1" fill="#fff" />

      {lashes ? (
        <g stroke={INK} strokeWidth="1.7" strokeLinecap="round">
          <path d="M35.2 48.6 l-3.6 -1.9 M36.2 47.4 l-2.6 -3.3 M38.2 46.9 l-0.9 -4" />
          <path transform={MIRROR} d="M35.2 48.6 l-3.6 -1.9 M36.2 47.4 l-2.6 -3.3 M38.2 46.9 l-0.9 -4" />
        </g>
      ) : fem ? (
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
      {lipstick ? (
        <g>
          <path d="M43.6 75.6 Q46.8 73.4 50 75.2 Q53.2 73.4 56.4 75.6 Q50 82.6 43.6 75.6 Z" fill={PINK} />
          <path d="M44.4 76 q5.6 2.6 11.2 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        </g>
      ) : (
        <path d="M44.5 76 q5.5 4 11 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      )}

      <Face id={config.face} />
      <Ears id={config.ears} />
      <Neck id={config.neck} bow={bow} />
      <Head id={config.head} bow={bow} />
    </svg>
  );
}

/** Partes do cabelo que ficam atrás da cabeça. */
function HairBack({ id, fill, tie }: { id: AvatarConfig["hair"]; fill: string; tie: string }) {
  switch (id) {
    case "chiquinhas":
      return (
        <g>
          <g fill={fill}>
            <ellipse cx="15.5" cy="56" rx="6" ry="10" transform="rotate(18 15.5 56)" />
            <ellipse cx="84.5" cy="56" rx="6" ry="10" transform="rotate(-18 84.5 56)" />
          </g>
          <circle cx="20" cy="47.5" r="2.8" fill={tie} />
          <circle cx="80" cy="47.5" r="2.8" fill={tie} />
        </g>
      );
    case "rabo":
      return (
        <path d="M74 41 Q91 37 93 53 Q94 66 85 73 Q88 61 82 53 Q79 49 75 49 Z" fill={fill} />
      );
    default:
      return null;
  }
}

/** Partes do cabelo por cima da cabeça. */
function HairFront({ id, fill, tie }: { id: AvatarConfig["hair"]; fill: string; tie: string }) {
  switch (id) {
    case "franja":
      return (
        <path
          d="M29 42 Q31 28 50 27.5 Q69 28 71 42 Q66.5 36 62 43 Q58.5 35.5 53.5 43 Q50 35.5 46.5 43 Q41.5 35.5 38 43 Q33.5 36 29 42 Z"
          fill={fill}
          stroke={INK}
          strokeOpacity="0.15"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      );
    case "rabo":
      return (
        <g>
          <path d="M36 37 Q44 28 58 30 Q70 33 77 43 Q68 38 58 37 Q46 36 36 37 Z" fill={fill} />
          <circle cx="76.5" cy="44" r="3" fill={tie} />
        </g>
      );
    case "coque":
      return (
        <g>
          <circle cx="50" cy="22" r="8" fill={fill} />
          <path d="M44.5 21 Q50 17.5 55.5 21" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="44" y="28" width="12" height="3.6" rx="1.8" fill={tie} />
        </g>
      );
    case "chiquinhas":
      return (
        <path d="M38 33 Q50 27.5 62 33 Q56 31.5 50 32 Q44 31.5 38 33 Z" fill={fill} />
      );
    default:
      return null;
  }
}

function Head({ id, bow }: { id: AvatarConfig["head"]; bow: string }) {
  switch (id) {
    case "laco":
      return (
        <g transform="translate(70 24) rotate(18)">
          <path d="M0 0 L-11 -7 L-11 7 Z" fill={bow} stroke={bow} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M0 0 L11 -7 L11 7 Z" fill={bow} stroke={bow} strokeWidth="2.5" strokeLinejoin="round" />
          <circle r="3.6" fill={bow} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
        </g>
      );
    case "tiara":
      return (
        <g>
          <path d="M27 42 Q50 22 73 42" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
          <path d="M43 31.5 L46.5 24 L50 28.5 L53.5 24 L57 31.5 Z" fill={GOLD} stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="50" cy="29.5" r="2.3" fill={PINK} />
          <circle cx="36" cy="34.6" r="1.4" fill={PEARL} />
          <circle cx="64" cy="34.6" r="1.4" fill={PEARL} />
        </g>
      );
    case "flor":
      return (
        <g transform="translate(69 31)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="0" cy="-5" r="4" fill={PINK} transform={`rotate(${a})`} />
          ))}
          <circle r="3" fill={GOLD} />
        </g>
      );
    case "presilha":
      return (
        <g transform="translate(64 36) rotate(-28)">
          <rect x="-8" y="-2.8" width="16" height="5.6" rx="2.8" fill={bow} />
          <circle cx="-4" cy="0" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="0" cy="0" r="1.2" fill="#fff" opacity="0.8" />
          <circle cx="4" cy="0" r="1.2" fill="#fff" opacity="0.8" />
        </g>
      );
    case "bandana":
      return (
        <g>
          <path d="M21 46 Q50 27 79 46 L77.5 39.5 Q50 21 22.5 39.5 Z" fill={PINK} />
          <g fill="#fff" opacity="0.75">
            <circle cx="35" cy="35" r="1.2" />
            <circle cx="50" cy="30.5" r="1.2" />
            <circle cx="65" cy="35" r="1.2" />
            <circle cx="42.5" cy="34" r="0.9" />
            <circle cx="57.5" cy="34" r="0.9" />
          </g>
          <path d="M78 42 L87 36 L86 45 Z M78 43 L85 50 L80 51 Z" fill={PINK} />
        </g>
      );
    case "chapeu":
      return (
        <g>
          <ellipse cx="50" cy="35" rx="35" ry="7.5" fill="#f3d27a" />
          <path d="M33.5 35 Q34 15 50 15 Q66 15 66.5 35 Z" fill="#f3d27a" />
          <path d="M34 29 Q50 26 66 29 L66.3 33 Q50 30 33.7 33 Z" fill={bow} />
          <path d="M18 35.5 Q50 44 82 35.5" fill="none" stroke="#d9ae4f" strokeWidth="1.2" opacity="0.7" />
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

function Face({ id }: { id: AvatarConfig["face"] }) {
  switch (id) {
    case "oculos":
      return (
        <g fill="none" stroke={INK} strokeWidth="2.6">
          <circle cx="38.5" cy="51" r="8.2" />
          <circle cx="61.5" cy="51" r="8.2" />
          <path d="M46.7 50 Q50 47.5 53.3 50" />
          <path d="M30.3 49.5 L21.5 46.5 M69.7 49.5 L78.5 46.5" />
        </g>
      );
    case "gatinho": {
      const lens = "M30 47.5 L25.5 42 L34 44.2 Q44.5 43 46.6 49.5 Q46 57.5 38.5 58 Q30.5 57.5 30 51 Z";
      return (
        <g stroke={INK} strokeWidth="2.3" strokeLinejoin="round">
          <path d={lens} fill={PINK} fillOpacity="0.18" />
          <path d={lens} transform={MIRROR} fill={PINK} fillOpacity="0.18" />
          <path d="M46.6 49.5 Q50 47.5 53.4 49.5" fill="none" />
          <circle cx="26" cy="42.5" r="1.3" fill={GOLD} stroke="none" />
          <circle cx="74" cy="42.5" r="1.3" fill={GOLD} stroke="none" />
        </g>
      );
    }
    case "coracao": {
      const heart = "M0 6 C-12 -2 -8 -11 0 -5.5 C8 -11 12 -2 0 6 Z";
      return (
        <g>
          <path d="M46.5 49 Q50 46.5 53.5 49" fill="none" stroke={PINK} strokeWidth="2.2" />
          <path d="M29 49 L21.5 46.5 M71 49 L78.5 46.5" stroke={PINK} strokeWidth="2.2" />
          <g fill={PINK} stroke="#b8264f" strokeWidth="1.2">
            <path d={heart} transform="translate(38.5 51.5)" />
            <path d={heart} transform="translate(61.5 51.5)" />
          </g>
          <path d="M33 47.5 q2 -1.6 4 -0.8 M56 47.5 q2 -1.6 4 -0.8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      );
    }
    default:
      return null;
  }
}

function Ears({ id }: { id: AvatarConfig["ears"] }) {
  switch (id) {
    case "perola":
      return (
        <g fill={PEARL} stroke={PEARL_EDGE} strokeWidth="0.9">
          <circle cx="20.5" cy="52" r="2.9" />
          <circle cx="79.5" cy="52" r="2.9" />
        </g>
      );
    case "argola":
      return (
        <g fill="none" stroke={GOLD} strokeWidth="1.9">
          <circle cx="20" cy="54" r="5" />
          <circle cx="80" cy="54" r="5" />
        </g>
      );
    case "estrela": {
      const star = "M0 -4.6 L1.3 -1.4 L4.6 -1.4 L1.9 0.6 L2.9 3.9 L0 1.9 L-2.9 3.9 L-1.9 0.6 L-4.6 -1.4 L-1.3 -1.4 Z";
      return (
        <g fill={GOLD}>
          <path d="M20.5 48.5 V51 M79.5 48.5 V51" stroke={GOLD} strokeWidth="1.2" />
          <path d={star} transform="translate(20.5 55)" />
          <path d={star} transform="translate(79.5 55)" />
        </g>
      );
    }
    default:
      return null;
  }
}

function Neck({ id, bow }: { id: AvatarConfig["neck"]; bow: string }) {
  switch (id) {
    case "perolas":
      return (
        <g fill={PEARL} stroke={PEARL_EDGE} strokeWidth="0.8">
          {NECKLACE.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.3" />
          ))}
        </g>
      );
    case "gargantilha":
      return (
        <g>
          <path d="M29 82 Q50 93 71 82" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="50" cy="90.5" r="2.8" fill={GOLD} />
        </g>
      );
    case "lacinho":
      return (
        <g transform="translate(50 88)">
          <path d="M-2 2 L-7 11 L-3 10 Z M2 2 L7 11 L3 10 Z" fill={PINK} />
          <ellipse cx="-6.5" cy="-1" rx="6.5" ry="4.2" fill={PINK} transform="rotate(-14 -6.5 -1)" />
          <ellipse cx="6.5" cy="-1" rx="6.5" ry="4.2" fill={PINK} transform="rotate(14 6.5 -1)" />
          <circle r="3" fill={PINK} stroke="#fff" strokeOpacity="0.4" strokeWidth="1.1" />
        </g>
      );
    case "cachecol":
      return (
        <g>
          <path d="M23 78 Q50 95 77 78 L79 86 Q50 103 21 86 Z" fill={bow} />
          <path d="M22 82 Q50 99 78 82" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" />
          <path d="M60 88 L67 88 L69 100 L59 100 Z" fill={bow} />
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
    default:
      return null;
  }
}
