import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-black/20">
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-base font-black uppercase tracking-tight text-black mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-muted max-w-sm">
        {description}
      </p>
    </div>
  );
}
