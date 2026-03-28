"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavbarProps {
  mode?: "demo" | "paper" | "live";
}

const modeStyles: Record<string, string> = {
  demo: "text-text-secondary bg-text-secondary/10 border-text-secondary/20",
  paper: "text-conviction-medium bg-conviction-medium/10 border-conviction-medium/20",
  live: "text-conviction-high bg-conviction-high/10 border-conviction-high/20",
};

export default function Navbar({ mode = "demo" }: NavbarProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 font-sans",
        "border-b border-surface-border",
        "bg-surface-DEFAULT/80 backdrop-blur-xl"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        {/* Left: logo + links */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-lg font-bold text-accent tracking-tight transition-colors duration-200 hover:text-accent-glow"
          >
            Conviction
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Right: mode indicator */}
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            modeStyles[mode]
          )}
        >
          {mode}
        </span>
      </div>
    </nav>
  );
}
