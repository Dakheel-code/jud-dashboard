export default function TaskManagementLoading() {
  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden" dir="rtl">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-purple-900/40 animate-pulse" />
            <div className="h-12 sm:h-16 w-px bg-purple-500/20" />
            <div className="space-y-2">
              <div className="h-7 w-36 rounded-lg bg-purple-900/40 animate-pulse" />
              <div className="h-4 w-48 rounded-lg bg-purple-900/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-xl bg-purple-900/30 animate-pulse" />
          ))}
          <div className="flex-1 h-9 rounded-xl bg-purple-900/30 animate-pulse min-w-[160px]" />
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/20 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded bg-purple-800/40 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-purple-800/50 rounded" />
                  <div className="flex gap-3">
                    <div className="h-3 w-24 bg-purple-800/30 rounded" />
                    <div className="h-3 w-20 bg-purple-800/20 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 rounded-full bg-purple-800/30" />
                  <div className="w-7 h-7 rounded-lg bg-purple-800/30" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
