"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ExecutionMode } from "@/types";

interface Props {
  currentMode: ExecutionMode;
}

const modes: { value: ExecutionMode; label: string; description: string }[] = [
  {
    value: "watch",
    label: "Watch Only",
    description: "Just keep an eye on it. No action.",
  },
  {
    value: "paper",
    label: "Paper Trade",
    description: "Practice trade — no real money. Perfect for getting comfortable.",
  },
  {
    value: "live",
    label: "Live Trade",
    description: "Real money. Make sure you're ready.",
  },
  {
    value: "autonomous",
    label: "Autonomous",
    description: "Let the wizard handle it within your risk limits.",
  },
];

export default function ExecutionModeSelector({ currentMode }: Props) {
  const [selected, setSelected] = useState<ExecutionMode>(currentMode);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {modes.map((mode) => {
        const isSelected = selected === mode.value;
        const isDisabled = mode.value === "live" || mode.value === "autonomous";

        return (
          <button
            key={mode.value}
            onClick={() => !isDisabled && setSelected(mode.value)}
            disabled={isDisabled}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-all duration-200",
              isSelected
                ? "border-accent/50 bg-accent/5"
                : "border-surface-border bg-surface-raised hover:bg-surface-overlay",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border transition-all duration-200",
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-surface-border bg-transparent"
                )}
              />
              <span className="text-sm font-medium text-text-primary">
                {mode.label}
              </span>
              {isDisabled && (
                <span className="text-xs text-text-muted">(coming soon)</span>
              )}
            </div>
            <p className="text-xs text-text-muted ml-5">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
