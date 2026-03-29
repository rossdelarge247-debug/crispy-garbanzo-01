"use client";

import ErrorState from "@/components/ErrorState";

export default function FlagDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="animate-fade-in max-w-4xl pt-8">
      <ErrorState
        title="This flag didn't load."
        description="The data for this market situation couldn't be fetched. Could be a provider hiccup or a timeout. The flag might still be valid — try reloading."
        onRetry={reset}
        retryLabel="Reload Flag"
      />
    </div>
  );
}
