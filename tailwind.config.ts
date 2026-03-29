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
          raised: "#f5f5f5",
          overlay: "#ebebeb",
          border: "#000000",
          hover: "#f0f0f0",
        },
        accent: {
          DEFAULT: "#000000",
          dim: "#222222",
          glow: "#ff3b00",
        },
        conviction: {
          high: "#00a63e",
          medium: "#ff8800",
          low: "#888888",
          caution: "#ff6600",
          danger: "#ff0033",
        },
        text: {
          primary: "#000000",
          secondary: "#444444",
          muted: "#999999",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderWidth: {
        "3": "3px",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
