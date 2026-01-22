'use client';

// Skeleton Components للـ Dashboard Widgets

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-purple-800/50 rounded-xl"></div>
        <div className="w-16 h-4 bg-purple-800/50 rounded"></div>
      </div>
      <div className="w-20 h-8 bg-purple-800/50 rounded mb-2"></div>
      <div className="w-24 h-3 bg-purple-800/30 rounded"></div>
    </div>
  );
}

// KPI Bar Skeleton (8 cards)
export function KPIBarSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {[...Array(8)].map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// Widget Card Skeleton (Generic)
export function WidgetCardSkeleton({ rows = 4, showHeader = true }: { rows?: number; showHeader?: boolean }) {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20 animate-pulse">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-800/50 rounded-lg"></div>
            <div className="w-32 h-5 bg-purple-800/50 rounded"></div>
          </div>
          <div className="w-20 h-8 bg-purple-800/30 rounded-lg"></div>
        </div>
      )}
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-purple-900/20">
            <div className="w-8 h-8 bg-purple-800/50 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-purple-800/50 rounded"></div>
              <div className="w-1/2 h-3 bg-purple-800/30 rounded"></div>
            </div>
            <div className="w-12 h-6 bg-purple-800/30 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Action Center Skeleton
export function ActionCenterSkeleton() {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-red-800/50 rounded-lg"></div>
        <div className="w-40 h-5 bg-purple-800/50 rounded"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-purple-900/20">
            <div className="w-6 h-6 bg-red-800/50 rounded flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-purple-800/50 rounded"></div>
              <div className="w-full h-3 bg-purple-800/30 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Store Performance Skeleton
export function StorePerformanceSkeleton() {
  return (
    <WidgetCardSkeleton rows={5} />
  );
}

// Team Performance Skeleton
export function TeamPerformanceSkeleton() {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-purple-800/50 rounded-lg"></div>
        <div className="w-32 h-5 bg-purple-800/50 rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="space-y-2">
          <div className="w-24 h-4 bg-green-800/30 rounded mb-3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-purple-900/20">
              <div className="w-8 h-8 bg-purple-800/50 rounded-full"></div>
              <div className="flex-1">
                <div className="w-20 h-3 bg-purple-800/50 rounded"></div>
              </div>
              <div className="w-10 h-4 bg-green-800/30 rounded"></div>
            </div>
          ))}
        </div>
        {/* Low Performers */}
        <div className="space-y-2">
          <div className="w-24 h-4 bg-red-800/30 rounded mb-3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-purple-900/20">
              <div className="w-8 h-8 bg-purple-800/50 rounded-full"></div>
              <div className="flex-1">
                <div className="w-20 h-3 bg-purple-800/50 rounded"></div>
              </div>
              <div className="w-10 h-4 bg-red-800/30 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Campaigns Pulse Skeleton
export function CampaignsPulseSkeleton() {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-purple-800/50 rounded-lg"></div>
        <div className="w-32 h-5 bg-purple-800/50 rounded"></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 rounded-xl bg-purple-900/20 text-center">
            <div className="w-16 h-6 bg-purple-800/50 rounded mx-auto mb-2"></div>
            <div className="w-12 h-3 bg-purple-800/30 rounded mx-auto"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-green-900/20 space-y-2">
          <div className="w-20 h-3 bg-green-800/30 rounded"></div>
          <div className="w-32 h-4 bg-purple-800/50 rounded"></div>
        </div>
        <div className="p-3 rounded-xl bg-red-900/20 space-y-2">
          <div className="w-20 h-3 bg-red-800/30 rounded"></div>
          <div className="w-32 h-4 bg-purple-800/50 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Today Tasks Skeleton
export function TodayTasksSkeleton() {
  return (
    <WidgetCardSkeleton rows={6} />
  );
}

// Announcements Skeleton
export function AnnouncementsSkeleton() {
  return (
    <WidgetCardSkeleton rows={5} />
  );
}

// Insights Skeleton
export function InsightsSkeleton() {
  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-purple-800/50 rounded-lg"></div>
        <div className="w-36 h-5 bg-purple-800/50 rounded"></div>
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-purple-900/20">
            <div className="w-6 h-6 bg-yellow-800/50 rounded flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-purple-800/50 rounded"></div>
              <div className="w-full h-3 bg-purple-800/30 rounded"></div>
            </div>
            <div className="w-16 h-6 bg-purple-800/30 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <KPIBarSkeleton />
      
      {/* Action Center */}
      <ActionCenterSkeleton />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorePerformanceSkeleton />
        <TeamPerformanceSkeleton />
        <CampaignsPulseSkeleton />
        <TodayTasksSkeleton />
        <AnnouncementsSkeleton />
        <InsightsSkeleton />
      </div>
    </div>
  );
}
