import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains)", "Consolas", "ui-monospace", "monospace"]
      },
      colors: {
        tg: {
          bg: "#0e1621",
          rail: "#17212b",
          panel: "#17212b",
          chat: "#0e1621",
          header: "#17212b",
          line: "#243444",
          hover: "#202f3d",
          active: "#2b5278",
          text: "#e5edf3",
          muted: "#7f91a4",
          bubble: "#182533",
          mine: "#2b5278",
          accent: "#64ff9a",
          blue: "#2ea6ff"
        }
      },
      boxShadow: {
        telegram: "0 1px 0 rgba(255,255,255,.03), 0 18px 60px rgba(0,0,0,.28)"
      }
    }
  },
  plugins: []
};

export default config;
