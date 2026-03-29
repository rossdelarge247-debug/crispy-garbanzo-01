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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-soft">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-accent-dark hover:text-accent transition-colors duration-300"
          >
            Trade Daddy
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors duration-300"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors duration-300"
            >
              Settings
            </Link>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-accent/15 text-accent-dark px-3 py-0.5 text-xs font-bold">
          {modeLabels[mode]}
        </span>
      </div>
    </nav>
  );
}
