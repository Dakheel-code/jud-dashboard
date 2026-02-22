export default function SettingsLoading() {
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
              <div className="h-4 w-48 rounded-lg bg-purple-900/30 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden animate-pulse">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-500/10">
                <div className="w-8 h-8 rounded-lg bg-purple-800/50" />
                <div className="h-5 w-36 bg-purple-800/50 rounded" />
              </div>
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-purple-800/40 rounded" />
                      <div className="h-3 w-48 bg-purple-800/20 rounded" />
                    </div>
                    <div className="h-9 w-36 rounded-xl bg-purple-800/30" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
