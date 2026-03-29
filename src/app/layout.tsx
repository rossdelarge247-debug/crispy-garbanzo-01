import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Trade Daddy 2.0 — Do what Daddy tells you",
  description:
    "Your personalized AI day-trading assistant. Trade Daddy watches the markets so you don't have to.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-DEFAULT font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
