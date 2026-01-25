'use client';

import Link from 'next/link';

// KPI Configuration - تعريف كل KPI مع الأيقونة والرابط واللون
const KPI_CONFIG: Record<string, {
  label: string;
  icon: JSX.Element;
  link: string;
  colorClass: string;
  bgClass: string;
  format?: (value: number) => string;
  statusThresholds?: { warning: number; danger: number; reverse?: boolean };
}> = {
  total_managers: {
    label: 'مدراء العلاقات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    link: '/admin/team',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/20'
  },
  avg_completion_rate: {
    label: 'متوسط الإنجاز',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    link: '/admin/team',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/20',
    format: (v) => `${v}%`,
    statusThresholds: { warning: 60, danger: 40, reverse: true }
  },
  top_performers: {
    label: 'أداء ممتاز',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    link: '/admin/team?filter=top',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/20'
  },
  needs_attention: {
    label: 'يحتاج متابعة',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    link: '/admin/team?filter=low',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/20',
    statusThresholds: { warning: 2, danger: 5 }
  },
  active_stores: {
    label: 'متاجر مسندة',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    link: '/admin/stores',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/20'
  },
  unassigned_stores: {
    label: 'بدون مدير',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    link: '/admin/stores?filter=unassigned',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/20',
    statusThresholds: { warning: 3, danger: 8 }
  },
  tasks_completed_week: {
    label: 'مهام منجزة (أسبوع)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    link: '/admin/tasks?filter=completed',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/20'
  },
  overdue_tasks: {
    label: 'مهام متأخرة',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    link: '/admin/tasks?filter=overdue',
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/20',
    statusThresholds: { warning: 5, danger: 15 }
  },
  unread_announcements: {
    label: 'تعاميم غير مقروءة',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    link: '/admin/announcements',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/20',
    statusThresholds: { warning: 3, danger: 5 }
  }
};

// دالة لتحديد لون الحالة بناءً على القيمة
function getStatusColor(value: number, thresholds?: { warning: number; danger: number; reverse?: boolean }): string {
  if (!thresholds) return 'bg-purple-500';
  
  const { warning, danger, reverse } = thresholds;
  
  if (reverse) {
    // للقيم التي كلما زادت كان أفضل (مثل المهام المكتملة، ROAS)
    if (value >= warning) return 'bg-green-500';
    if (value >= danger) return 'bg-yellow-500';
    return 'bg-red-500';
  } else {
    // للقيم التي كلما قلت كان أفضل (مثل المهام المتأخرة)
    if (value >= danger) return 'bg-red-500';
    if (value >= warning) return 'bg-yellow-500';
    return 'bg-green-500';
  }
}

interface KPIData {
  value: number;
  trend: string;
  change: number;
}

interface DashboardKPIBarProps {
  kpis: Record<string, KPIData>;
}

export default function DashboardKPIBar({ kpis }: DashboardKPIBarProps) {
  const kpiEntries = Object.entries(kpis);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {kpiEntries.map(([key, kpi]) => {
        const config = KPI_CONFIG[key];
        if (!config) return null;

        const formattedValue = config.format ? config.format(kpi.value) : kpi.value;
        const statusColor = getStatusColor(kpi.value, config.statusThresholds);

        return (
          <div
            key={key}
            className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all group relative overflow-hidden"
          >
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`}></div>
            
            {/* Header: Icon + Trend */}
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${config.bgClass} rounded-xl flex items-center justify-center ${config.colorClass}`}>
                {config.icon}
              </div>
              {/* Trend indicator */}
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                kpi.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                kpi.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {kpi.trend === 'up' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : kpi.trend === 'down' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                )}
                <span>{Math.abs(kpi.change)}</span>
              </div>
            </div>

            {/* Value */}
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {formattedValue}
            </div>

            {/* Label */}
            <div className="text-xs text-purple-300/70 mb-3">
              {config.label}
            </div>

            {/* CTA Button */}
            <Link
              href={config.link}
              className={`w-full flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium ${config.bgClass} ${config.colorClass} hover:opacity-80 transition-opacity`}
            >
              <span>عرض</span>
              <svg className="w-3 h-3 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
