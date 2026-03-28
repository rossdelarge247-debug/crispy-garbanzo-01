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
          DEFAULT: "#ffffff",
          raised: "#f7f8fa",
          overlay: "#eef0f3",
          border: "#dfe1e6",
          hover: "#f0f1f4",
        },
        accent: {
          DEFAULT: "#1a1a2e",
          dim: "#2d2d44",
          glow: "#4a4a6a",
        },
        conviction: {
          high: "#0d7c3f",
          medium: "#b8860b",
          low: "#6b7280",
          caution: "#d97706",
          danger: "#dc2626",
        },
        text: {
          primary: "#1a1a2e",
          secondary: "#4a5568",
          muted: "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
