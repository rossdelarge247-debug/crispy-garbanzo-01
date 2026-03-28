import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-text-primary tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-muted leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
