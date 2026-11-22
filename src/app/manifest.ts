import type { MetadataRoute } from "next";

/** Permite instalar o app na tela de início e abrir em tela cheia. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bacon's Finance",
    short_name: "Bacon's",
    description: "As finanças da casa: quanto entrou, quanto saiu e para onde foi.",
    lang: "pt-BR",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2b1a4f",
    theme_color: "#2b1a4f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
