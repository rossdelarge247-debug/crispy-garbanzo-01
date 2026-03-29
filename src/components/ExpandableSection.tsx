"use client";

import { useState, type ReactNode } from "react";

interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-black transition-colors duration-100 w-full text-left py-1"
      >
        <span className="text-sm">{isOpen ? "−" : "+"}</span>
        {title}
      </button>
      {isOpen && (
        <div className="mt-3 pl-5 border-l-3 border-black/10">
          {children}
        </div>
      )}
    </div>
  );
}
