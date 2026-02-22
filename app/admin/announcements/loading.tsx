export default function AnnouncementsLoading() {
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

        {/* Announcements List */}
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 animate-pulse">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-800/50 flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-5 w-48 bg-purple-800/50 rounded" />
                    <div className="h-3 w-32 bg-purple-800/30 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-purple-800/30" />
              </div>
              <div className="space-y-2 pr-13">
                <div className="h-3 w-full bg-purple-800/20 rounded" />
                <div className="h-3 w-4/5 bg-purple-800/20 rounded" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
