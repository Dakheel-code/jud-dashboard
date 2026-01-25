'use client';

import { getAvatarInitial } from '@/lib/avatar';

interface Manager {
  id: string;
  name: string;
  avatar: string | null;
  stores_count: number;
  completion_rate?: number;
}

interface ManagersChartsData {
  overall_completion_rate: number;
  total_managers: number;
  total_stores_assigned: number;
  unassigned_stores: number;
  top_10: Manager[];
}

interface ManagersChartsWidgetProps {
  data: ManagersChartsData;
}

export default function ManagersChartsWidget({ data }: ManagersChartsWidgetProps) {
  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCompletionBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const excellentCount = data.top_10.filter(m => (m.completion_rate || 0) >= 80).length;
  const goodCount = data.top_10.filter(m => (m.completion_rate || 0) >= 60 && (m.completion_rate || 0) < 80).length;
  const needsImprovementCount = data.top_10.filter(m => (m.completion_rate || 0) < 60).length;

  const maxStores = Math.max(...data.top_10.map(m => m.stores_count));

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">تحليلات الأداء</h3>
            <p className="text-purple-300/60 text-sm">رسوم بيانية تفصيلية</p>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Donut Chart - توزيع نسب الإنجاز */}
        <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/20">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            توزيع مستوى الأداء
          </h4>
          <div className="flex flex-col items-center">
            {/* Donut Chart */}
            <div className="relative w-40 h-40 mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1b4b" strokeWidth="15" />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#22c55e" strokeWidth="15"
                  strokeDasharray={`${(excellentCount / data.top_10.length) * 251.2} 251.2`}
                  strokeDashoffset="0"
                />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#eab308" strokeWidth="15"
                  strokeDasharray={`${(goodCount / data.top_10.length) * 251.2} 251.2`}
                  strokeDashoffset={`${-(excellentCount / data.top_10.length) * 251.2}`}
                />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#ef4444" strokeWidth="15"
                  strokeDasharray={`${(needsImprovementCount / data.top_10.length) * 251.2} 251.2`}
                  strokeDashoffset={`${-((excellentCount + goodCount) / data.top_10.length) * 251.2}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{data.overall_completion_rate}%</p>
                  <p className="text-purple-300/60 text-xs">متوسط الإنجاز</p>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-purple-300 text-sm">ممتاز (&gt;80%)</span>
                </div>
                <span className="text-green-400 font-bold">{excellentCount}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-purple-300 text-sm">جيد (60-80%)</span>
                </div>
                <span className="text-yellow-400 font-bold">{goodCount}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-purple-300 text-sm">يحتاج تحسين (&lt;60%)</span>
                </div>
                <span className="text-red-400 font-bold">{needsImprovementCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart - توزيع المتاجر */}
        <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/20">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            توزيع المتاجر
          </h4>
          <div className="space-y-3">
            {data.top_10.slice(0, 8).map((manager) => {
              const percentage = (manager.stores_count / maxStores) * 100;
              return (
                <div key={manager.id} className="flex items-center gap-2">
                  <div className="w-16 text-purple-300 text-xs truncate text-right">{manager.name.split(' ')[0]}</div>
                  <div className="flex-1 h-5 bg-purple-900/50 rounded-lg overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-xs font-medium w-8 text-left">{manager.stores_count}</span>
                </div>
              );
            })}
          </div>
          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-purple-500/20 flex justify-between text-sm">
            <span className="text-purple-300">إجمالي المتاجر</span>
            <span className="text-white font-bold">{data.total_stores_assigned + data.unassigned_stores}</span>
          </div>
        </div>

        {/* Completion Rate Bars */}
        <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/20">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            نسب الإنجاز الفردية
          </h4>
          <div className="space-y-3">
            {data.top_10.slice(0, 8).map((manager) => (
              <div key={manager.id} className="flex items-center gap-2">
                <div className="w-16 text-purple-300 text-xs truncate text-right">{manager.name.split(' ')[0]}</div>
                <div className="flex-1 h-5 bg-purple-900/50 rounded-lg overflow-hidden relative">
                  <div 
                    className={`h-full rounded-lg transition-all duration-500 ${getCompletionBg(manager.completion_rate || 0)}`}
                    style={{ width: `${manager.completion_rate}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-medium w-10 text-left ${getCompletionColor(manager.completion_rate || 0)}`}>
                  {manager.completion_rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20 text-center">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">{data.total_managers}</p>
          <p className="text-cyan-400/70 text-xs">مدير علاقة</p>
        </div>

        {/* Stat 2 */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-green-400">{excellentCount}</p>
          <p className="text-green-400/70 text-xs">أداء ممتاز</p>
        </div>

        {/* Stat 3 */}
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-500/20 text-center">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">{data.total_stores_assigned}</p>
          <p className="text-blue-400/70 text-xs">متجر مسند</p>
        </div>

        {/* Stat 4 */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20 text-center">
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-orange-400">{data.unassigned_stores}</p>
          <p className="text-orange-400/70 text-xs">بدون مدير</p>
        </div>
      </div>
    </div>
  );
}
