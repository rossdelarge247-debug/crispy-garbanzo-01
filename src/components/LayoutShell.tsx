"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isLanding = pathname === "/";
  const showNavbar = !isOnboarding && !isLanding;
  const useContainer = !isOnboarding && !isLanding;

  return (
    <>
      {showNavbar && <Navbar />}
      <main
        className={
          useContainer
            ? "mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16"
            : ""
        }
      >
        {children}
      </main>
    </>
  );
}
