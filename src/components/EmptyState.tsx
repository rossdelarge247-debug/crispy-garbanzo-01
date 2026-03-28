import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 font-sans text-center">
      {icon && (
        <div className="mb-4 text-text-muted">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-muted max-w-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
