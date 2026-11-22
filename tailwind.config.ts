import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "var(--accent)",
        "accent-muted": "var(--accent-muted)",
        "on-accent": "var(--on-accent)",
        card: "var(--card)",
        "card-elevated": "var(--card-elevated)",
        border: "var(--border)",
        plum: "var(--plum)",
        "plum-soft": "var(--plum-soft)",
        lime: "var(--lime)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans-body)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(43, 26, 79, 0.05), 0 10px 28px -16px rgba(43, 26, 79, 0.22)",
        plum: "0 24px 48px -24px rgba(43, 26, 79, 0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
