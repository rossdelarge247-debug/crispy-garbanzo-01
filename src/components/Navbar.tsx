"use client";

import Link from "next/link";

interface NavbarProps {
  mode?: "demo" | "paper" | "live";
}

const modeLabels: Record<string, string> = {
  demo: "Demo",
  paper: "Paper",
  live: "Live",
};

export default function Navbar({ mode = "demo" }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-DEFAULT border-b border-surface-border shadow-soft">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-text-primary hover:text-accent transition-colors duration-200"
          >
            Trade Daddy
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Briefing
            </Link>
            <Link
              href="/preferences"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Preferences
            </Link>
            <Link
              href="/settings"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Settings
            </Link>
          </div>
        </div>
        <span className="inline-flex items-center rounded-lg bg-accent/10 text-accent px-3 py-0.5 text-xs font-medium">
          {modeLabels[mode]}
        </span>
      </div>
    </nav>
  );
}
