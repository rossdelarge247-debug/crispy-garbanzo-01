"use client";

import type { NewsArticle } from "@/types";

export interface NewsImageTile {
  article: NewsArticle;
  imageUrl: string;
  imageHeight: "tall" | "medium" | "short";
}

interface NewsImageGridProps {
  tiles: NewsImageTile[];
}

const heightClasses: Record<NewsImageTile["imageHeight"], string> = {
  tall: "h-64",
  medium: "h-48",
  short: "h-36",
};

export default function NewsImageGrid({ tiles }: NewsImageGridProps) {
  return (
    <div className="columns-2 sm:columns-3 gap-3">
      {tiles.map((tile) => (
        <a
          key={tile.article.id}
          href={tile.article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-inside-avoid rounded-xl overflow-hidden mb-3 bg-white border border-surface-border hover:shadow-soft hover:border-accent/20 transition-all duration-200"
        >
          <img
            src={tile.imageUrl}
            alt={tile.article.title}
            loading="lazy"
            className={`object-cover w-full ${heightClasses[tile.imageHeight]}`}
          />
          <div className="p-3 space-y-1">
            <h3 className="text-sm font-semibold text-text-primary leading-tight">
              {tile.article.title}
            </h3>
            <p className="text-xs font-medium text-text-muted">
              {tile.article.source} · {new Date(tile.article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <p className="text-xs text-text-secondary line-clamp-2">
              {tile.article.summary}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
