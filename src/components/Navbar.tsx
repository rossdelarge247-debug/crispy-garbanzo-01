"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import WizardLogo from "./WizardLogo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/signals", label: "Signals" },
  { href: "/macro", label: "Macro" },
  { href: "/alerts", label: "Alerts" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[--bg]">
      <div className="mx-auto max-w-2xl px-5 h-11 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <WizardLogo size={20} />
          <span className="text-xs font-bold text-[--text-primary]">Trade Wizard</span>
        </Link>
        <div className="flex items-center gap-3">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-2xs transition-colors ${
                pathname === item.href ? "text-[--text-primary] font-medium" : "text-[--text-muted] hover:text-[--text-primary]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
