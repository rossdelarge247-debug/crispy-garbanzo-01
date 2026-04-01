"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

function FeedIndicator() {
  const [status, setStatus] = useState<{ live: number; total: number; loading: boolean }>({ live: 0, total: 0, loading: true });
  useEffect(() => {
    fetch("/api/feeds").then(r => r.json()).then(data => {
      setStatus({ live: data.summary?.live ?? 0, total: data.summary?.total ?? 0, loading: false });
    }).catch(() => setStatus(prev => ({ ...prev, loading: false })));
  }, []);

  if (status.loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "var(--amber-soft)" }}>
        <div className="w-2.5 h-2.5 rounded-full animate-spin" style={{ border: "1.5px solid var(--amber)", borderTopColor: "transparent" }} />
        <span className="micro" style={{ color: "var(--amber)" }}>...</span>
      </div>
    );
  }

  if (status.total === 0) return null;

  const allLive = status.live === status.total;
  const color = allLive ? "var(--green)" : status.live > 0 ? "var(--amber)" : "var(--red)";
  const bg = allLive ? "var(--green-soft)" : status.live > 0 ? "var(--amber-soft)" : "var(--red-soft)";

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="micro font-semibold" style={{ color }}>{status.live}/{status.total}</span>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-2xl px-5 flex items-center justify-between" style={{ height: 64 }}>
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}>T</span>
            <span className="text-xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>.</span>
            <span className="text-xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}>T</span>
            <span className="text-xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>.</span>
            <span className="text-xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}>T</span>
            <span className="text-xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>.</span>
            <span className="text-xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.02em" }}>T</span>
          </div>
          <span className="text-xs font-medium hidden sm:inline" style={{ color: "var(--text-muted)" }}>The Trump Trade Tracker</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <FeedIndicator />

          <Link href="/dashboard" style={{ fontSize: 12, fontWeight: pathname === "/dashboard" ? 600 : 400, color: pathname === "/dashboard" ? "var(--text)" : "var(--text-muted)" }}>
            Dashboard
          </Link>
          <Link href="/about" style={{ fontSize: 12, fontWeight: pathname === "/about" ? 600 : 400, color: pathname === "/about" ? "var(--text)" : "var(--text-muted)" }}>
            About
          </Link>

          <ThemeToggle />

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex flex-col gap-1.5 p-1.5" style={{ width: 28 }} aria-label="Menu">
            <span className="block h-0.5 w-full rounded-full transition-all" style={{ background: "var(--text-muted)", transform: menuOpen ? "rotate(45deg) translateY(8px)" : "none" }} />
            <span className="block h-0.5 w-full rounded-full transition-all" style={{ background: "var(--text-muted)", opacity: menuOpen ? 0 : 1 }} />
            <span className="block h-0.5 w-full rounded-full transition-all" style={{ background: "var(--text-muted)", transform: menuOpen ? "rotate(-45deg) translateY(-8px)" : "none" }} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-auto max-w-2xl px-5 pb-4 animate-fade-in" style={{ background: "var(--bg)" }}>
          <div className="rounded-lg p-2" style={{ background: "var(--surface)" }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className="block py-2.5 px-3 rounded-lg transition-colors" style={{
                  background: pathname === item.href ? "var(--surface-hover)" : "transparent",
                  color: pathname === item.href ? "var(--text)" : "var(--text-muted)",
                  fontSize: 14, fontWeight: pathname === item.href ? 600 : 400,
                }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
