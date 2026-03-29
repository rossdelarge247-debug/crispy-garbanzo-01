import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 pb-2 border-b-3 border-black">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight text-black">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs font-medium text-text-muted uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
