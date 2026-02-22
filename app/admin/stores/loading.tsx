export default function StoresLoading() {
  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden" dir="rtl">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-purple-900/40 animate-pulse" />
            <div className="h-12 sm:h-16 w-px bg-purple-500/20" />
            <div className="space-y-2">
              <div className="h-7 w-32 rounded-lg bg-purple-900/40 animate-pulse" />
              <div className="h-4 w-44 rounded-lg bg-purple-900/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-28 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/20 animate-pulse">
              <div className="w-10 h-10 bg-purple-800/50 rounded-xl mb-3" />
              <div className="w-20 h-7 bg-purple-800/50 rounded mb-2" />
              <div className="w-24 h-3 bg-purple-800/30 rounded" />
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 h-10 rounded-xl bg-purple-900/30 animate-pulse" />
          <div className="h-10 w-24 rounded-xl bg-purple-900/30 animate-pulse" />
        </div>

        {/* Stores Table */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-4 border-b border-purple-500/20 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-1 h-4 bg-purple-800/40 rounded" />
            ))}
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-purple-500/10 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-purple-800/40 flex-shrink-0" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex-1 h-4 bg-purple-800/30 rounded" style={{ opacity: 1 - j * 0.12 }} />
              ))}
              <div className="w-16 h-6 rounded-lg bg-purple-800/30" />
              <div className="flex gap-1">
                <div className="w-7 h-7 rounded-lg bg-purple-800/30" />
                <div className="w-7 h-7 rounded-lg bg-purple-800/30" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
