import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Trade Daddy — A wizard is never late",
  description:
    "Your wise AI trading advisor. Trade Daddy watches the markets, reads the patterns, and speaks when the time is right.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script prevents theme flash before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-surface-DEFAULT font-sans antialiased">
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
