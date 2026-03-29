"use client";

import { useState, useEffect, type ReactNode } from "react";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";

interface DataPanelProps<T> {
  fetcher: () => Promise<T>;
  isEmpty?: (data: T) => boolean;
  loadingTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  children: (data: T) => ReactNode;
}

/**
 * Client-side data panel with loading, error, and empty states.
 * Use for sections that fetch data on the client (e.g., settings page,
 * interactive panels). Server components should use Suspense instead.
 */
export default function DataPanel<T>({
  fetcher,
  isEmpty,
  loadingTitle,
  emptyTitle,
  emptyDescription,
  children,
}: DataPanelProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingState title={loadingTitle} />;
  }

  if (error) {
    return <ErrorState onRetry={load} />;
  }

  if (data === null || (isEmpty && isEmpty(data))) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children(data)}</>;
}
