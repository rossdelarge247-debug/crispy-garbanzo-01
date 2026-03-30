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
            ? "mx-auto max-w-2xl px-5 pt-24 pb-16"
            : ""
        }
      >
        {children}
      </main>
    </>
  );
}
