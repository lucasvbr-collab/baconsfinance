import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-sans-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bacon's Finance",
  description: "As finanças da casa: quanto entrou, quanto saiu e para onde foi.",
  applicationName: "Bacon's Finance",
  appleWebApp: {
    capable: true,
    title: "Bacon's",
    // Conteúdo passa por baixo da barra de status; os cabeçalhos ameixa
    // compensam com env(safe-area-inset-top).
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2b1a4f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${body.variable} ${display.variable} ${body.className} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
