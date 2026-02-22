export default function PermissionsLoading() {
  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden" dir="rtl">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-purple-900/40 animate-pulse" />
            <div className="h-12 sm:h-16 w-px bg-purple-500/20" />
            <div className="space-y-2">
              <div className="h-7 w-44 rounded-lg bg-purple-900/40 animate-pulse" />
              <div className="h-4 w-56 rounded-lg bg-purple-900/30 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-xl bg-purple-900/30 animate-pulse" />
            <div className="h-9 w-9 rounded-xl bg-purple-900/30 animate-pulse" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-32 rounded-xl bg-purple-500/20 animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-purple-900/30 animate-pulse" />
        </div>

        {/* Main Layout: Roles List + Permissions Panel */}
        <div className="flex gap-6">

          {/* Roles List */}
          <div className="w-64 flex-shrink-0 space-y-2">
            <div className="h-10 rounded-xl bg-purple-900/30 animate-pulse mb-4" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-purple-800/50 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-20 bg-purple-800/50 rounded" />
                  <div className="h-3 w-28 bg-purple-800/30 rounded" />
                </div>
              </div>
            ))}
            <div className="h-10 rounded-xl bg-purple-900/20 border border-dashed border-purple-500/20 animate-pulse mt-4" />
          </div>

          {/* Permissions Panel */}
          <div className="flex-1 space-y-3">
            {/* Role Info Header */}
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-800/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-purple-800/50 rounded" />
                  <div className="h-3 w-48 bg-purple-800/30 rounded" />
                </div>
                <div className="h-9 w-24 rounded-xl bg-purple-800/30" />
              </div>
            </div>

            {/* Search */}
            <div className="h-10 rounded-xl bg-purple-900/30 animate-pulse" />

            {/* Permission Categories */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden animate-pulse">
                <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-purple-800/50" />
                    <div className="h-4 w-28 bg-purple-800/50 rounded" />
                    <div className="h-5 w-12 rounded-full bg-purple-800/30" />
                  </div>
                  <div className="w-5 h-5 rounded bg-purple-800/30" />
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 p-3 rounded-xl bg-purple-900/20">
                      <div className="w-5 h-5 rounded bg-purple-800/40" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 bg-purple-800/40 rounded" />
                        <div className="h-2.5 w-36 bg-purple-800/20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Save Button */}
            <div className="h-11 w-32 rounded-xl bg-purple-800/30 animate-pulse" />
          </div>
        </div>

      </div>
    </div>
  );
}
