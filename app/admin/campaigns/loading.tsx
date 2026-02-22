export default function CampaignsLoading() {
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
          <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
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

        {/* Campaigns Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-purple-800/50 rounded" />
                <div className="h-6 w-16 rounded-full bg-purple-800/30" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-3 w-20 bg-purple-800/30 rounded" />
                    <div className="h-3 w-16 bg-purple-800/40 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-2 rounded-full bg-purple-900/40 mt-4">
                <div className="h-2 rounded-full bg-purple-700/40" style={{ width: `${40 + i * 10}%` }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
