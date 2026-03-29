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
        className="flex items-center gap-2 text-sm font-medium text-text-secondary rounded-md px-3 py-1.5 -ml-3 hover:bg-surface-overlay hover:text-text-primary transition-all duration-200 w-full text-left"
      >
        <span
          className="text-xs transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ›
        </span>
        {title}
      </button>
      {isOpen && (
        <div className="mt-3 pl-5 border-l border-surface-border">
          {children}
        </div>
      )}
    </div>
  );
}
