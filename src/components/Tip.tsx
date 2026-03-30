"use client";

/**
 * Tip — inline tooltip that explains trading terms for novices.
 * Renders the term as dotted-underlined text. Hover/click shows explanation.
 */

import { useState } from "react";
import { explain } from "@/lib/glossary";

interface TipProps {
  term: string;          // the glossary key
  label?: string;        // display text (defaults to term)
  className?: string;
}

export default function Tip({ term, label, className = "" }: TipProps) {
  const [show, setShow] = useState(false);
  const explanation = explain(term);

  if (!explanation) return <span className={className}>{label ?? term}</span>;

  return (
    <span className="relative inline-block">
      <button
        className={`border-b border-dotted border-[--text-muted] cursor-help ${className}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        {label ?? term}
      </button>
      {show && (
        <span className="absolute left-0 bottom-full mb-1 z-50 w-56 rounded-lg bg-[--bg] shadow-lg p-2.5 text-2xs text-[--text-secondary] leading-relaxed"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {explanation}
        </span>
      )}
    </span>
  );
}
