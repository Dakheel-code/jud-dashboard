export default function UsersLoading() {
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
            <div className="h-9 w-32 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 h-10 rounded-xl bg-purple-900/30 animate-pulse" />
          <div className="h-10 w-28 rounded-xl bg-purple-900/30 animate-pulse" />
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-800/50 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-purple-800/50 rounded" />
                  <div className="h-3 w-20 bg-purple-800/30 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-purple-800/30 rounded" />
                <div className="h-3 w-3/4 bg-purple-800/20 rounded" />
              </div>
              <div className="flex gap-2 mt-4">
                <div className="h-7 flex-1 rounded-lg bg-purple-800/30" />
                <div className="h-7 w-7 rounded-lg bg-purple-800/30" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
