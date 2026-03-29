import type { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

const emptyQuips = [
  { title: "Nothing here yet.", description: "When something shows up, you'll be the first to know." },
  { title: "Crickets.", description: "No data to show right now. Check back soon." },
  { title: "The board is clear.", description: "Either the markets are boring or we're still looking. Probably the latter." },
  { title: "Zero. Zilch. Nada.", description: "No results in this category yet. That's not always a bad thing." },
];

function getQuip() {
  return emptyQuips[Math.floor(Math.random() * emptyQuips.length)];
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  const quip = getQuip();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed border-black/15">
      {icon ? (
        <div className="mb-4 text-text-muted">{icon}</div>
      ) : (
        <div className="text-3xl mb-4">○</div>
      )}
      <h3 className="text-base font-black uppercase tracking-tight text-black mb-2">
        {title || quip.title}
      </h3>
      <p className="text-sm text-text-muted max-w-sm">
        {description || quip.description}
      </p>
    </div>
  );
}
