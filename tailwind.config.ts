import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./apps/web/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./packages/ui/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-jetbrains)", "Consolas", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"]
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
        },
        matrix: {
          black: "#020403",
          panel: "#07110c",
          rail: "#030806",
          line: "#103d25",
          neon: "#39ff88",
          dim: "#6ae99a",
          text: "#d9ffe7",
          muted: "#77a985",
          danger: "#ff4f6d",
          amber: "#ffd166",
          cyan: "#45f3ff"
        }
      },
      boxShadow: {
        terminal: "0 0 0 1px rgba(57,255,136,.16), 0 18px 70px rgba(0,0,0,.48), inset 0 0 40px rgba(57,255,136,.025)",
        glow: "0 0 24px rgba(57,255,136,.25)"
      },
      animation: {
        rain: "rain 18s linear infinite",
        blink: "blink 1.2s steps(2, start) infinite",
        scan: "scan 7s linear infinite"
      },
      keyframes: {
        rain: {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0%)" }
        },
        blink: {
          "0%, 45%": { opacity: "1" },
          "46%, 100%": { opacity: ".25" }
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
