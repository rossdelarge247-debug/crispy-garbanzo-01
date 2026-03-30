"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("trade-wizard-theme") ?? "dark";
    setThemeState(stored as "light" | "dark");

    const handler = (e: StorageEvent) => {
      if (e.key === "trade-wizard-theme" && e.newValue) {
        setThemeState(e.newValue as "light" | "dark");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("trade-wizard-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    setThemeState(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className={`flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors ${className}`}
    >
      <span className="text-base leading-none">{theme === "light" ? "☾" : "○"}</span>
      <span className="hidden sm:inline">{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
