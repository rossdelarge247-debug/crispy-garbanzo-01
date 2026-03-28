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
    <div className="columns-2 sm:columns-3 gap-4">
      {tiles.map((tile) => (
        <a
          key={tile.article.id}
          href={tile.article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-inside-avoid rounded-xl border border-surface-border bg-surface-raised overflow-hidden mb-4 hover:shadow-md transition-all duration-200"
        >
          <img
            src={tile.imageUrl}
            alt={tile.article.title}
            loading="lazy"
            className={`object-cover w-full rounded-t-lg ${heightClasses[tile.imageHeight]}`}
          />
          <div className="p-3 space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">
              {tile.article.title}
            </h3>
            <p className="text-xs text-text-muted">
              {tile.article.source} &middot;{" "}
              {new Date(tile.article.publishedAt).toLocaleDateString()}
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
