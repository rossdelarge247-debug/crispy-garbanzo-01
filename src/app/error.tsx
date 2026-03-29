"use client";

import ErrorState from "@/components/ErrorState";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="animate-fade-in pt-8">
      <ErrorState
        title="The dashboard hit a wall."
        description="We tried to scan the markets and something went wrong. This usually means a data provider is down or responding slowly. Your positions are unaffected."
        onRetry={reset}
        retryLabel="Reload Dashboard"
      />
    </div>
  );
}
