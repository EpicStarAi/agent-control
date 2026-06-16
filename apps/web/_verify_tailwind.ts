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
          bg: "#0a0b0f",
          rail: "#101218",
          panel: "#101218",
          chat: "#0a0b0f",
          header: "#12131a",
          line: "#2a161d",
          hover: "#1a1015",
          active: "#3d1320",
          text: "#f4eaed",
          muted: "#97868d",
          bubble: "#14151c",
          mine: "#3d1320",
          accent: "#ff3b5c",
          blue: "#e11d3f"
        },
        epic: {
          red: "#ff2d55",
          neon: "#ff3b5c",
          ember: "#e11d3f",
          deep: "#7a0f22",
          ink: "#0a0b0f"
        }
      },
      boxShadow: {
        telegram: "0 1px 0 rgba(255,255,255,.03), 0 18px 60px rgba(0,0,0,.45)",
        neon: "0 0 0 1px rgba(255,59,92,.18), 0 0 24px rgba(255,45,85,.22)",
        "neon-strong": "0 0 0 1px rgba(255,59,92,.35), 0 0 32px rgba(255,45,85,.4)"
      },
      keyframes: {
        "epic-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(255,45,85,.55)" },
          "50%": { opacity: ".55", boxShadow: "0 0 0 5px rgba(255,45,85,0)" }
        }
      },
      animation: {
        "epic-pulse": "epic-pulse 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
