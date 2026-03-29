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
          DEFAULT: "#fafbfc",
          raised: "#ffffff",
          overlay: "#f3f4f6",
          border: "#e5e7eb",
          hover: "#f9fafb",
        },
        accent: {
          DEFAULT: "#6366f1",
          dim: "#4f46e5",
          glow: "#818cf8",
          light: "#eef2ff",
          dark: "#111827",
        },
        conviction: {
          high: "#10b981",
          medium: "#f59e0b",
          low: "#9ca3af",
          caution: "#f59e0b",
          danger: "#ef4444",
        },
        text: {
          primary: "#111827",
          secondary: "#6b7280",
          muted: "#d1d5db",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "0.875rem",
        "3xl": "1rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        lift: "0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.04)",
        glow: "0 0 0 1px rgba(99,102,241,0.15), 0 4px 12px rgba(99,102,241,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
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
      },
    },
  },
  plugins: [],
};

export default config;
