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
          DEFAULT: "#faf9f7",
          raised: "#ffffff",
          overlay: "#f2f0ed",
          border: "#e8e6e1",
          hover: "#f5f3f0",
        },
        accent: {
          DEFAULT: "#ffc629",
          dim: "#f5b800",
          glow: "#ffe082",
          dark: "#1b1b1b",
        },
        conviction: {
          high: "#34c759",
          medium: "#ff9f0a",
          low: "#8e8e93",
          caution: "#ff9500",
          danger: "#ff3b30",
        },
        text: {
          primary: "#1b1b1b",
          secondary: "#636366",
          muted: "#aeaeb2",
        },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        card: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
        lift: "0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
