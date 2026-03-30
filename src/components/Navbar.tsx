"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-2xl px-5 flex items-center justify-between" style={{ height: 72 }}>
        {/* Logo + brand */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Trade Wizard"
            width={43}
            height={67}
            style={{ objectFit: "contain", height: 54, width: "auto" }}
            priority
          />
          <span className="text-base font-semibold" style={{ color: "var(--text)" }}>Trade Wizard</span>
        </Link>

        {/* Always-visible nav: Dashboard + About */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" style={{ fontSize: 12, fontWeight: pathname === "/dashboard" ? 600 : 400, color: pathname === "/dashboard" ? "var(--text)" : "var(--text-muted)" }}>
            Dashboard
          </Link>
          <Link href="/about" style={{ fontSize: 12, fontWeight: pathname === "/about" ? 600 : 400, color: pathname === "/about" ? "var(--text)" : "var(--text-muted)" }}>
            About
          </Link>

          <ThemeToggle />

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-1 p-1.5"
            style={{ width: 28 }}
            aria-label="Menu"
          >
            <span className="block h-0.5 w-full rounded-full transition-all" style={{
              background: "var(--text-muted)",
              transform: menuOpen ? "rotate(45deg) translateY(6px)" : "none",
            }} />
            <span className="block h-0.5 w-full rounded-full transition-all" style={{
              background: "var(--text-muted)",
              opacity: menuOpen ? 0 : 1,
            }} />
            <span className="block h-0.5 w-full rounded-full transition-all" style={{
              background: "var(--text-muted)",
              transform: menuOpen ? "rotate(-45deg) translateY(-6px)" : "none",
            }} />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="mx-auto max-w-2xl px-5 pb-4 animate-fade-in" style={{ background: "var(--bg)" }}>
          <div className="rounded-lg p-2" style={{ background: "var(--surface)" }}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg transition-colors"
                style={{
                  background: pathname === item.href ? "var(--surface-hover)" : "transparent",
                  color: pathname === item.href ? "var(--text)" : "var(--text-muted)",
                  fontSize: 14,
                  fontWeight: pathname === item.href ? 600 : 400,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
