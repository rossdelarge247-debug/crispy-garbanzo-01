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
          DEFAULT: "var(--bg)",
          raised:  "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          border:  "var(--border)",
          hover:   "var(--surface-hover)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim:     "var(--accent-dim)",
          light:   "var(--accent-light)",
          glow:    "#9b7fff",
          purple:  "#7c5bf0",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
        },
        conviction: {
          high:    "var(--green)",
          medium:  "var(--amber)",
          low:     "var(--text-muted)",
          caution: "var(--orange)",
          danger:  "var(--red)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        card: "0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)",
        lift: "0 12px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.05)",
        glow: "0 0 0 1px rgba(124,91,240,0.25), 0 0 16px rgba(124,91,240,0.12)",
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease-out",
        "slide-up":  "slideUp 0.3s ease-out",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.85)" },
          "50%":      { opacity: "1",   transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
