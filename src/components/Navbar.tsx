"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import WizardLogo from "./WizardLogo";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-DEFAULT/95 backdrop-blur-sm border-b border-surface-border">
      <div className="mx-auto max-w-4xl px-6 h-13 flex items-center justify-between" style={{ height: "52px" }}>
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <WizardLogo size={28} />
          <span className="text-base font-bold tracking-tight text-text-primary" style={{ letterSpacing: "-0.02em" }}>
            Trade Daddy
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Settings
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
