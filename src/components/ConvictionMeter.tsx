"use client";

/**
 * ConvictionMeter — animated confidence gauge for Trade Daddy
 *
 * Shows a 0-100 conviction score as a segmented arc with a grade badge.
 * Deliberately minimal — the number and grade do the heavy lifting.
 *
 * Props:
 *   score      — 0-100
 *   grade      — A/B/C/D/F
 *   label      — plain English label e.g. "Strong conviction"
 *   subtext    — one-line explanation
 *   dimensions — optional array of ConfidenceDimension for "Why this score?"
 *   showBreakdown — whether to render the expandable breakdown
 */

import { useState } from "react";
import { gradeColor, simplifyDimensionName, scoreToBarWidth } from "@/lib/intelligence-copy";

interface Dimension {
  name: string;
  score: number;
  label: string;
  positive: boolean;
}

interface ConvictionMeterProps {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  subtext?: string;
  dimensions?: Dimension[];
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
}

function arcPath(score: number): string {
  // SVG arc from 210° to 330° (240° sweep representing 0–100)
  const START_ANGLE = 210;
  const TOTAL_SWEEP = 240;
  const angle = START_ANGLE + (score / 100) * TOTAL_SWEEP;
  const r = 40;
  const cx = 50;
  const cy = 50;
  const startRad = (START_ANGLE * Math.PI) / 180;
  const endRad = (angle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = (score / 100) * TOTAL_SWEEP > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function trackPath(): string {
  const r = 40;
  const cx = 50;
  const cy = 50;
  const startRad = (210 * Math.PI) / 180;
  const endRad = (450 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
}

function arcColor(grade: string): string {
  const map: Record<string, string> = {
    A: "#34d399",  // emerald-400
    B: "#6ee7b7",  // emerald-300
    C: "#fbbf24",  // amber-400
    D: "#fb923c",  // orange-400
    F: "#f87171",  // red-400
  };
  return map[grade] ?? "#6b7280";
}

export default function ConvictionMeter({
  score,
  grade,
  label,
  subtext,
  dimensions,
  showBreakdown = false,
  size = "md",
}: ConvictionMeterProps) {
  const [expanded, setExpanded] = useState(false);

  const svgSize = size === "sm" ? 80 : size === "lg" ? 140 : 110;
  const strokeWidth = size === "sm" ? 6 : size === "lg" ? 8 : 7;
  const scoreFontSize = size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-3xl";
  const gradeFontSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Arc gauge */}
      <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
        <svg viewBox="0 0 100 100" width={svgSize} height={svgSize}>
          {/* Track */}
          <path
            d={trackPath()}
            fill="none"
            stroke="#1e2433"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Fill arc */}
          <path
            d={arcPath(score)}
            fill="none"
            stroke={arcColor(grade)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Score number in centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-text-primary leading-none ${scoreFontSize}`}>
            {score}
          </span>
          <span className={`font-semibold ${gradeColor(grade)} ${gradeFontSize} mt-0.5`}>
            {grade}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={`font-semibold text-text-primary ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {label}
        </p>
        {subtext && (
          <p className="text-xs text-text-secondary mt-0.5 max-w-[200px] leading-relaxed">
            {subtext}
          </p>
        )}
      </div>

      {/* Expandable breakdown */}
      {showBreakdown && dimensions && dimensions.length > 0 && (
        <div className="w-full">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? "Hide breakdown ↑" : "Why this score? ↓"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {dimensions.map((dim, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{simplifyDimensionName(dim.name)}</span>
                    <span className={`font-medium ${dim.positive ? "text-emerald-400" : "text-text-muted"}`}>
                      {dim.score}/10
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="w-full h-1 bg-surface-overlay rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${dim.positive ? "bg-accent" : "bg-surface-border"}`}
                      style={{ width: scoreToBarWidth(dim.score) }}
                    />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{dim.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
