'use client';

import Link from 'next/link';

interface TeamMember {
  id: string;
  name: string;
  avatar: string | null;
  tasks_completed: number;
  completion_rate: number;
  overdue_tasks?: number;
  last_activity?: string;
}

interface TeamData {
  top_performers: TeamMember[];
  low_performers: TeamMember[];
}

interface TeamPerformanceWidgetProps {
  team: TeamData;
}

export default function TeamPerformanceWidget({ team }: TeamPerformanceWidgetProps) {
  const { top_performers, low_performers } = team;

  // الحصول على لون نسبة الإنجاز
  const getCompletionColor = (rate: number, isTop: boolean) => {
    if (isTop) {
      if (rate >= 90) return 'text-green-400';
      if (rate >= 80) return 'text-emerald-400';
      return 'text-teal-400';
    } else {
      if (rate < 40) return 'text-red-400';
      if (rate < 55) return 'text-orange-400';
      return 'text-yellow-400';
    }
  };

  // الحصول على لون شريط التقدم
  const getProgressBarColor = (rate: number, isTop: boolean) => {
    if (isTop) {
      return 'bg-gradient-to-r from-green-500 to-emerald-400';
    } else {
      if (rate < 40) return 'bg-gradient-to-r from-red-500 to-red-400';
      if (rate < 55) return 'bg-gradient-to-r from-orange-500 to-orange-400';
      return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
    }
  };

  // الحصول على الحرف الأول من الاسم
  const getInitials = (name: string) => {
    return name.charAt(0);
  };

  // Empty State Component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <p className="text-purple-300/60 text-sm">{message}</p>
    </div>
  );

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">أداء الفريق</h3>
            <p className="text-xs text-purple-300/60">هذا الأسبوع</p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          عرض الكل
        </Link>
      </div>

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers Section */}
        <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <h4 className="text-sm font-medium text-green-400">الأفضل أداءً</h4>
            <span className="text-xs text-green-400/60">({top_performers.length})</span>
          </div>

          {top_performers.length === 0 ? (
            <EmptyState message="لا توجد بيانات" />
          ) : (
            <div className="space-y-3">
              {top_performers.slice(0, 5).map((member, index) => (
                <Link
                  key={member.id}
                  href={`/admin/users/${member.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-500/10 transition-colors group"
                >
                  {/* Rank Badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-purple-700/50 text-purple-300'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getInitials(member.name)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate group-hover:text-green-400 transition-colors">
                      {member.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300/60 text-xs">{member.tasks_completed} مهمة</span>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="text-left flex-shrink-0">
                    <div className={`text-sm font-bold ${getCompletionColor(member.completion_rate, true)}`}>
                      {member.completion_rate}%
                    </div>
                    <div className="w-12 h-1.5 bg-purple-900/50 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${getProgressBarColor(member.completion_rate, true)}`}
                        style={{ width: `${member.completion_rate}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low Performers Section */}
        <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <h4 className="text-sm font-medium text-red-400">يحتاج متابعة</h4>
            <span className="text-xs text-red-400/60">({low_performers.length})</span>
          </div>

          {low_performers.length === 0 ? (
            <EmptyState message="لا يوجد موظفين متأخرين" />
          ) : (
            <div className="space-y-3">
              {low_performers.slice(0, 5).map((member) => (
                <Link
                  key={member.id}
                  href={`/admin/users/${member.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/10 transition-colors group"
                >
                  {/* Avatar */}
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getInitials(member.name)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate group-hover:text-red-400 transition-colors">
                      {member.name}
                    </div>
                    <div className="flex items-center gap-2">
                      {member.overdue_tasks && member.overdue_tasks > 0 && (
                        <span className="text-red-400 text-xs flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {member.overdue_tasks} متأخرة
                        </span>
                      )}
                      <span className="text-purple-300/60 text-xs">{member.tasks_completed} مهمة</span>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="text-left flex-shrink-0">
                    <div className={`text-sm font-bold ${getCompletionColor(member.completion_rate, false)}`}>
                      {member.completion_rate}%
                    </div>
                    <div className="w-12 h-1.5 bg-purple-900/50 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${getProgressBarColor(member.completion_rate, false)}`}
                        style={{ width: `${member.completion_rate}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
