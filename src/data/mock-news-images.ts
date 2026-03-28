import type { NewsArticle } from "@/types";

export interface NewsImageTile {
  article: NewsArticle;
  imageUrl: string;
  imageHeight: "tall" | "medium" | "short";
}

const heights: NewsImageTile["imageHeight"][] = ["tall", "medium", "short"];

export function getNewsImageTiles(articles: NewsArticle[]): NewsImageTile[] {
  return articles.map((article, index) => ({
    article,
    imageUrl: `https://picsum.photos/seed/${article.id}/600/400`,
    imageHeight: heights[index % heights.length],
  }));
}
