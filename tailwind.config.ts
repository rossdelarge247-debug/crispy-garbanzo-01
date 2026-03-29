import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0b0e14",
          raised: "#131720",
          overlay: "#1a1f2b",
          border: "#252b38",
          hover: "#1e2433",
        },
        accent: {
          DEFAULT: "#7c5bf0",
          dim: "#6949d6",
          glow: "#9b7fff",
          light: "rgba(124, 91, 240, 0.12)",
        },
        conviction: {
          high: "#34d399",
          medium: "#fbbf24",
          low: "#6b7280",
          caution: "#fb923c",
          danger: "#f87171",
        },
        text: {
          primary: "#f1f3f8",
          secondary: "#8b95a8",
          muted: "#4b5468",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.2)",
        card: "0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        lift: "0 8px 24px rgba(0,0,0,0.4)",
        glow: "0 0 0 1px rgba(124,91,240,0.3), 0 0 20px rgba(124,91,240,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
