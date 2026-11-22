/**
 * Marca do Bacon's Finance: cofrinho de traço lima sobre ameixa,
 * com o rabo terminando num coração (o dinheiro da casa).
 * As formas são preenchidas com a cor de fundo para esconder sobreposições,
 * por isso a marca é pensada para ficar sobre ameixa.
 */
export function BrandMark({
  className = "h-8 w-8",
  simple = false,
  title,
}: {
  className?: string;
  /** Versão para tamanhos pequenos: traço mais grosso, sem a fenda da moeda. */
  simple?: boolean;
  title?: string;
}) {
  const stroke = simple ? 4.2 : 3;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="8 12 56 44"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g
        fill="var(--plum)"
        stroke="var(--lime)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50 33.5 C54.5 33.5 53.5 27.5 57.2 27.2" fill="none" />
        <rect x="21.5" y="41" width="7.5" height="11.5" rx="2.2" />
        <rect x="38" y="41" width="7.5" height="11.5" rx="2.2" />
        <path d="M25.5 24.5 L27.8 18.6 L33.8 22.2 Z" />
        <ellipse cx="34" cy="35" rx="17" ry="12.8" />
        <rect x="11" y="30" width="8.5" height="10" rx="3.6" />
        {!simple && <line x1="29.5" y1="27.6" x2="37.5" y2="27.6" />}
      </g>
      <circle cx="23" cy="31.3" r={simple ? 2.4 : 2} fill="var(--lime)" />
      <path
        d="M58.6 27.6 l-3.6 -3.5 a2.15 2.15 0 1 1 3.6 -2.7 a2.15 2.15 0 1 1 3.6 2.7 z"
        fill="var(--lime)"
      />
    </svg>
  );
}

/** Assinatura: cofrinho + "Bacon's Finance" na Bricolage. */
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = {
    sm: { mark: "h-7 w-7", name: "text-lg", gap: "gap-2" },
    md: { mark: "h-9 w-9", name: "text-xl", gap: "gap-2.5" },
    lg: { mark: "h-14 w-14", name: "text-4xl sm:text-5xl", gap: "gap-4" },
  }[size];
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <BrandMark className={`${s.mark} shrink-0`} simple={size === "sm"} />
      <span
        className={`font-display ${s.name} leading-none tracking-tight text-white`}
      >
        <span className="font-bold">Bacon&apos;s</span>{" "}
        <span className="font-normal text-lime">Finance</span>
      </span>
    </span>
  );
}
