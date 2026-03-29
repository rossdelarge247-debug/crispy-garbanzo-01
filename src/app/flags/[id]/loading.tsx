import LoadingState from "@/components/LoadingState";

export default function FlagDetailLoading() {
  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back link skeleton */}
      <div className="h-4 w-24 bg-surface-raised rounded-lg mb-6" />

      {/* Hero skeleton */}
      <div className="mb-8 pb-4 border-b border-surface-border">
        <div className="flex gap-2 mb-3">
          <div className="h-5 w-24 bg-surface-raised rounded-full" />
          <div className="h-5 w-16 bg-surface-raised rounded-full" />
          <div className="h-5 w-14 bg-surface-raised rounded-full" />
        </div>
        <div className="h-8 w-full bg-surface-raised rounded-xl mb-1" />
        <div className="h-8 w-3/4 bg-surface-raised rounded-xl" />
      </div>

      <LoadingState subtitle="Analyzing market situation, sentiment, and social signals" />

      {/* Content skeletons */}
      <div className="space-y-6 mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-5 w-40 bg-surface-raised rounded-lg mb-3 border-b border-surface-border pb-2" />
            <div className="h-4 w-full bg-surface-raised rounded-lg mb-1" />
            <div className="h-4 w-5/6 bg-surface-raised rounded-lg mb-1" />
            <div className="h-4 w-2/3 bg-surface-raised rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
