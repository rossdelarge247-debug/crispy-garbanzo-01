import type { ConvictionLevel, FlagStatus, Direction } from "@/types";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getConvictionColor(score: number): string {
  if (score >= 70) return "text-conviction-high";
  if (score >= 50) return "text-conviction-medium";
  return "text-conviction-low";
}

export function getConvictionBgColor(score: number): string {
  if (score >= 70) return "bg-conviction-high";
  if (score >= 50) return "bg-conviction-medium";
  return "bg-conviction-low";
}

export function getStatusColor(status: FlagStatus): string {
  switch (status) {
    case "emerging":
      return "text-accent-glow bg-accent-glow/10 border-accent-glow/20";
    case "active":
      return "text-conviction-high bg-conviction-high/10 border-conviction-high/20";
    case "maturing":
      return "text-conviction-medium bg-conviction-medium/10 border-conviction-medium/20";
    case "volatile":
      return "text-conviction-caution bg-conviction-caution/10 border-conviction-caution/20";
    case "invalidated":
      return "text-conviction-low bg-conviction-low/10 border-conviction-low/20";
    default:
      return "text-text-secondary bg-text-secondary/10 border-text-secondary/20";
  }
}

export function formatConviction(score: number): string {
  return `${score}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getDirectionLabel(direction: Direction): string {
  switch (direction) {
    case "long":
      return "Long";
    case "short":
      return "Short";
    case "neutral":
      return "Neutral";
  }
}
