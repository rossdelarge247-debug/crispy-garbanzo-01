import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Trade Daddy — Market Intelligence for Everyone",
  description:
    "Trade Daddy surfaces high-conviction market situations and guides you from understanding to action. Built for non-traders first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
