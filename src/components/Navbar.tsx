"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/signals", label: "Signals" },
  { href: "/macro", label: "Macro" },
  { href: "/alerts", label: "Alerts" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-2xl px-5 flex items-center justify-between" style={{ height: 80 }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Trade Wizard"
            width={120}
            height={65}
            style={{ objectFit: "contain", height: 65, width: "auto" }}
            priority
          />
          <span className="text-base font-semibold" style={{ color: "var(--text)" }}>Trade Wizard</span>
        </Link>
        <div className="flex items-center gap-5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="transition-colors" style={{
                fontSize: 12, fontWeight: pathname === item.href ? 600 : 400,
                color: pathname === item.href ? "var(--text)" : "var(--text-muted)",
              }}>
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
