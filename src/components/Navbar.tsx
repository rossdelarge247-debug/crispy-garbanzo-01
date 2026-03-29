"use client";

import Link from "next/link";

interface NavbarProps {
  mode?: "demo" | "paper" | "live";
}

const modeLabels: Record<string, string> = {
  demo: "DEMO",
  paper: "PAPER",
  live: "LIVE",
};

export default function Navbar({ mode = "demo" }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-3 border-black">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight uppercase hover:text-accent-glow transition-colors duration-100"
          >
            Trade Daddy
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-black transition-colors duration-100"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-black transition-colors duration-100"
            >
              Settings
            </Link>
          </div>
        </div>
        <span className="inline-flex items-center border-2 border-black px-2.5 py-0.5 text-xs font-black uppercase tracking-widest">
          {modeLabels[mode]}
        </span>
      </div>
    </nav>
  );
}
