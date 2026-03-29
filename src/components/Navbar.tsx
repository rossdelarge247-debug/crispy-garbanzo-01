"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import WizardLogo from "./WizardLogo";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[--bg] border-b border-[--border]">
      <div className="mx-auto max-w-2xl px-6 h-12 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <WizardLogo size={24} />
          <span className="text-sm font-bold text-[--text-primary]">Trade Daddy</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors">
            Dashboard
          </Link>
          <Link href="/settings" className="text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors">
            Settings
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
