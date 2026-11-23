import { categoryIconKey, type CategoryIconKey } from "@/lib/category-icon";

/** Desenhos no mesmo traço dos ícones do app (24×24, 1.75px, pontas redondas). */
const paths: Record<CategoryIconKey, React.ReactNode> = {
  bag: (
    <>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5V9Z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3.5v2.5M12 3.5v2.5" />
    </>
  ),
  dining: (
    <>
      <path d="M5 3v5a2.5 2.5 0 0 0 5 0V3M7.5 3v18" />
      <path d="M19 21V3c-2.2 1.4-3.5 4.2-3.5 7.6 0 1.6.9 2.6 3.5 2.6" />
    </>
  ),
  house: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 9.5V20h14V9.5" />
      <circle cx="12" cy="13.5" r="1.8" />
      <path d="M12 15.3V18" />
    </>
  ),
  fuel: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12" />
      <rect x="7" y="6" width="4" height="4" rx="1" />
      <path d="M14 9h1.5a2 2 0 0 1 2 2v5.5a1.5 1.5 0 0 0 3 0V8.5L18 6" />
    </>
  ),
  car: (
    <>
      <path d="M5 12.5 6.8 7.6A2.5 2.5 0 0 1 9.1 6h5.8a2.5 2.5 0 0 1 2.3 1.6l1.8 4.9" />
      <rect x="3" y="12.5" width="18" height="5.5" rx="2" />
      <path d="M6 18v2M18 18v2M7 15.2h.01M17 15.2h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  paw: (
    <>
      <circle cx="6.5" cy="10.5" r="1.7" />
      <circle cx="10" cy="6.5" r="1.7" />
      <circle cx="14" cy="6.5" r="1.7" />
      <circle cx="17.5" cy="10.5" r="1.7" />
      <path d="M12 12.5c-2.6 0-5 3-5 5.2 0 1.6 1.4 2.2 2.8 1.9 1-.2 1.5-.5 2.2-.5s1.2.3 2.2.5c1.4.3 2.8-.3 2.8-1.9 0-2.2-2.4-5.2-5-5.2Z" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20m-3-3 3 3-3 3" />
      <path d="M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4m3 3-3-3 3-3" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7v10.5A2.5 2.5 0 0 0 6.5 20H19a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6a2 2 0 0 1 0-4h11v4" />
      <path d="M16 14.5h.01" />
    </>
  ),
  arrowIn: (
    <>
      <path d="M12 3v11m-4-4 4 4 4-4" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 17.5h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0" />
      <path d="M12 19.5h.01" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  pill: (
    <>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-8-4.6-8-10.3A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.7C20 15.4 12 20 12 20Z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </>
  ),
  bottle: (
    <>
      <path d="M11 4.5a1 1 0 0 1 2 0" />
      <path d="M9.5 6.5h5L15.5 9h-7l1-2.5Z" />
      <rect x="7.5" y="9" width="9" height="12" rx="2.5" />
      <path d="M7.5 13h3M7.5 16.5h3" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9.5 12 5l10 4.5L12 14 2 9.5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M22 9.5V14" />
    </>
  ),
  pig: (
    <>
      <path d="M6.2 8.3 5 4.5l3.8 1.8M17.8 8.3 19 4.5l-3.8 1.8" />
      <ellipse cx="12" cy="13" rx="8" ry="7" />
      <ellipse cx="12" cy="15" rx="3.2" ry="2.3" />
      <path d="M11 15h.01M13 15h.01M8.8 11h.01M15.2 11h.01" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
};

/** Ícone da categoria pelo nome; nomes desconhecidos recebem uma etiqueta neutra. */
export function CategoryIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[categoryIconKey(name)]}
    </svg>
  );
}
