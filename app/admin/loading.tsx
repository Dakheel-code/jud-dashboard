export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden" dir="rtl">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-purple-900/40 animate-pulse" />
            <div className="h-12 sm:h-16 w-px bg-purple-500/20" />
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-lg bg-purple-900/40 animate-pulse" />
              <div className="h-4 w-56 rounded-lg bg-purple-900/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-32 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-4 border border-purple-500/20 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-800/50 rounded-xl" />
                <div className="w-16 h-4 bg-purple-800/30 rounded" />
              </div>
              <div className="w-20 h-7 bg-purple-800/50 rounded mb-2" />
              <div className="w-24 h-3 bg-purple-800/30 rounded" />
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-xl bg-purple-900/30 animate-pulse" />
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden animate-pulse">
          {/* Table Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-purple-500/20">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-4 bg-purple-800/40 rounded" />
            ))}
          </div>
          {/* Table Rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-purple-500/10">
              <div className="w-8 h-8 rounded-full bg-purple-800/40 flex-shrink-0" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex-1 h-4 bg-purple-800/30 rounded" style={{ opacity: 1 - j * 0.15 }} />
              ))}
              <div className="w-20 h-6 rounded-lg bg-purple-800/30" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
