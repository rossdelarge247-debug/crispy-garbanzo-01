"use client";

/**
 * ThemeProvider — sets data-theme on <html> from localStorage.
 * Default: light. Toggle available in Settings.
 * Runs before first paint to avoid flash.
 */

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("trade-wizard-theme") ?? "light";
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  return <>{children}</>;
}

/** Inline script to prevent flash — paste into <head> as dangerouslySetInnerHTML */
export const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('trade-wizard-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e){}
})();
`;

export function useTheme() {
  function getTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("trade-wizard-theme") ?? "light") as "light" | "dark";
  }

  function setTheme(theme: "light" | "dark") {
    localStorage.setItem("trade-wizard-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    // Force re-render by dispatching storage event
    window.dispatchEvent(new StorageEvent("storage", { key: "trade-wizard-theme", newValue: theme }));
  }

  function toggle() {
    setTheme(getTheme() === "light" ? "dark" : "light");
  }

  return { getTheme, setTheme, toggle };
}
