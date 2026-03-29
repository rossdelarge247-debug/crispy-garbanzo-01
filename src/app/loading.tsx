import LoadingState from "@/components/LoadingState";

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in pt-4">
      {/* Skeleton header */}
      <div className="mb-8 pb-4 border-b border-surface-border">
        <div className="h-12 w-80 bg-surface-overlay rounded-xl mb-2" />
        <div className="h-5 w-64 bg-surface-overlay rounded-xl" />
      </div>

      {/* Skeleton stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-4 text-center rounded-xl bg-surface-raised border border-surface-border shadow-soft">
            <div className="h-10 w-12 bg-surface-overlay rounded-xl mx-auto mb-1" />
            <div className="h-3 w-20 bg-surface-overlay rounded-lg mx-auto" />
          </div>
        ))}
      </div>

      <LoadingState subtitle="Fetching live market data, news, and social sentiment" />

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-surface-raised border border-surface-border shadow-soft p-5 h-64">
            <div className="h-10 w-full bg-surface-overlay rounded-xl mb-3" />
            <div className="h-4 w-3/4 bg-surface-overlay rounded-lg mb-2" />
            <div className="h-4 w-1/2 bg-surface-overlay rounded-lg mb-4" />
            <div className="h-3 w-full bg-surface-overlay rounded-lg mb-1" />
            <div className="h-3 w-5/6 bg-surface-overlay rounded-lg mb-4" />
            <div className="h-6 w-20 bg-surface-overlay rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
