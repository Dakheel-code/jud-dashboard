'use client';

import Link from 'next/link';

// تكوين أنواع التنبيهات
const ACTION_TYPE_CONFIG: Record<string, {
  label: string;
  icon: JSX.Element;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  overdue_task: {
    label: 'مهمة متأخرة',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30'
  },
  low_roas: {
    label: 'أداء منخفض',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30'
  },
  no_conversion: {
    label: 'بدون تحويلات',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30'
  },
  pending_approval: {
    label: 'بانتظار الموافقة',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30'
  },
  urgent_announcement: {
    label: 'تعميم عاجل',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30'
  },
  budget_low: {
    label: 'ميزانية منخفضة',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30'
  },
  low_performance: {
    label: 'أداء منخفض',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30'
  },
  unassigned_stores: {
    label: 'متاجر غير مسندة',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </svg>
    ),
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30'
  },
  overload: {
    label: 'حمل زائد',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30'
  },
  overdue_tasks: {
    label: 'مهام متأخرة',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30'
  },
  inactive_manager: {
    label: 'مدير غير نشط',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30'
  }
};

// Default config للأنواع غير المعرفة
const DEFAULT_CONFIG = {
  label: 'تنبيه',
  icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  bgClass: 'bg-gray-500/20',
  textClass: 'text-gray-400',
  borderClass: 'border-gray-500/30'
};

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  link: string;
}

interface DashboardActionCenterProps {
  items: ActionItem[];
}

export default function DashboardActionCenter({ items }: DashboardActionCenterProps) {
  // عرض أول 6 عناصر فقط
  const displayItems = items.slice(0, 6);

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-red-500/30 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">يحتاج تدخل الآن</h3>
            <p className="text-xs text-purple-300/60">عناصر تتطلب اهتمامك الفوري</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-full">
            {items.length} عنصر
          </span>
        )}
      </div>

      {/* Content */}
      {displayItems.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-1">كل شيء تحت السيطرة!</h4>
          <p className="text-purple-300/60 text-sm">لا توجد عناصر تحتاج تدخل فوري</p>
        </div>
      ) : (
        // Action Items Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayItems.map((item) => {
            const config = ACTION_TYPE_CONFIG[item.type] || DEFAULT_CONFIG;
            
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border ${config.borderClass} bg-purple-900/20 hover:bg-purple-900/30 transition-all group`}
              >
                {/* Badge + Priority */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${config.bgClass} ${config.textClass}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  {item.priority === 'high' && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-white font-medium text-sm mb-1 line-clamp-1">
                  {item.title}
                </h4>

                {/* Description */}
                <p className="text-purple-300/70 text-xs mb-3 line-clamp-2">
                  {item.description}
                </p>

                {/* CTA Button */}
                <Link
                  href={item.link}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium ${config.bgClass} ${config.textClass} hover:opacity-80 transition-opacity`}
                >
                  <span>معالجة</span>
                  <svg className="w-3 h-3 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more link if there are more items */}
      {items.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href="/admin/store-tasks"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            عرض {items.length - 6} عنصر إضافي ←
          </Link>
        </div>
      )}
    </div>
  );
}
