'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';
import AdminSidebar from '@/components/AdminSidebar';
import AdminBottomNav from '@/components/AdminBottomNav';
import { useBranding } from '@/contexts/BrandingContext';

interface KPIs {
  total_meetings: number;
  by_status: {
    confirmed?: number;
    completed?: number;
    cancelled?: number;
    no_show?: number;
  };
  no_show_rate: number;
  cancellation_rate: number;
  avg_lead_time_hours: number;
  repeat_clients: number;
  unique_clients: number;
  today_meetings: number;
  this_week_meetings?: number;
  upcoming_meetings: number;
  avg_duration_minutes: number;
}

interface HeatmapData {
  by_day: Array<{ day: number; day_name: string; count: number }>;
  by_hour: Array<{ hour: number; count: number }>;
  heatmap?: Array<{ day: number; hour: number; count: number }>;
}

interface EmployeeStats {
  employee_id: string;
  employee_name: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  completion_rate: number;
  no_show_rate: number;
}

interface TopClient {
  client_email: string;
  client_name: string;
  total_meetings: number;
  completed: number;
  cancelled: number;
}

interface Analytics {
  kpis: KPIs;
  heatmap: HeatmapData;
  by_employee?: EmployeeStats[];
  top_clients?: TopClient[];
}

function MeetingStatsContent() {
  const { branding } = useBranding();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
      
      const response = await fetch(`/api/admin/meetings/analytics?start_date=${startDate}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const getMaxCount = (data: Array<{ count: number }>) => {
    return Math.max(...data.map(d => d.count), 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <img src={branding.logo || '/logo.png'} alt="Loading" className="w-full h-full object-contain animate-pulse" />
            </div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] flex">
      {/* Sidebar */}
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content */}
      <div className="flex-1 lg:mr-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#0a0118]/95 backdrop-blur-xl border-b border-purple-500/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-8 h-8 object-contain" />
              <span className="text-white font-bold">{branding.companyName || 'جود'}</span>
            </div>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain hidden lg:block" />
              <div className="hidden lg:block h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
              <div>
                <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>إحصائيات الاجتماعات</h1>
                <p className="text-purple-300/80 text-xs sm:text-sm">تحليل أداء الاجتماعات</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Link
                href="/dashboard/admin/meetings"
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                إدارة الاجتماعات
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                لوحة التحكم
              </Link>
              {[
                { value: 'week', label: 'أسبوع' },
                { value: 'month', label: 'شهر' },
                { value: 'year', label: 'سنة' },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value as any)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                    period === p.value
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent'
                      : 'bg-purple-900/30 text-purple-300 border-purple-500/30 hover:bg-purple-800/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{analytics?.kpis?.total_meetings || 0}</div>
              <div className="text-purple-400/60 text-sm">إجمالي الاجتماعات</div>
            </div>
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">{analytics?.kpis?.by_status?.completed || 0}</div>
              <div className="text-purple-400/60 text-sm">مكتملة</div>
              <div className="text-green-400/60 text-xs mt-1">
                {analytics?.kpis?.total_meetings ? Math.round(((analytics.kpis.by_status?.completed || 0) / analytics.kpis.total_meetings) * 100) : 0}%
              </div>
            </div>
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-400">{analytics?.kpis?.by_status?.cancelled || 0}</div>
              <div className="text-purple-400/60 text-sm">ملغاة</div>
              <div className="text-red-400/60 text-xs mt-1">
                {analytics?.kpis?.cancellation_rate || 0}%
              </div>
            </div>
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-orange-400">{analytics?.kpis?.by_status?.no_show || 0}</div>
              <div className="text-purple-400/60 text-sm">لم يحضر</div>
              <div className="text-orange-400/60 text-xs mt-1">
                {analytics?.kpis?.no_show_rate || 0}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Day Chart */}
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">الاجتماعات حسب اليوم</h2>
              {analytics?.heatmap?.by_day && analytics.heatmap.by_day.length > 0 ? (
                <div className="space-y-3">
                  {analytics.heatmap.by_day.map((day: { day: number; day_name: string; count: number }) => (
                    <div key={day.day} className="flex items-center gap-3">
                      <div className="w-16 text-purple-300 text-sm">{day.day_name}</div>
                      <div className="flex-1 h-8 bg-purple-900/30 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-lg transition-all duration-500"
                          style={{ width: `${(day.count / getMaxCount(analytics.heatmap.by_day)) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-white text-sm text-left">{day.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-purple-400/60">لا توجد بيانات</div>
              )}
            </div>

            {/* By Hour Heatmap */}
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">الاجتماعات حسب الساعة</h2>
              {analytics?.heatmap?.by_hour && analytics.heatmap.by_hour.length > 0 ? (
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => {
                    const hourData = analytics.heatmap.by_hour.find((h: { hour: number; count: number }) => h.hour === hour);
                    const count = hourData?.count || 0;
                    const maxCount = getMaxCount(analytics.heatmap.by_hour);
                    const intensity = count / maxCount;
                    
                    return (
                      <div
                        key={hour}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all"
                        style={{
                          backgroundColor: `rgba(139, 92, 246, ${0.1 + intensity * 0.6})`,
                          border: `1px solid rgba(139, 92, 246, ${0.2 + intensity * 0.3})`,
                        }}
                        title={`${hour}:00 - ${count} اجتماعات`}
                      >
                        <div className="text-purple-300">{hour}:00</div>
                        <div className="text-white font-bold">{count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-purple-400/60">لا توجد بيانات</div>
              )}
            </div>

            {/* By Employee */}
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4">الاجتماعات حسب الموظف</h2>
              {analytics?.by_employee && analytics.by_employee.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-purple-500/20">
                        <th className="px-4 py-2 text-right text-purple-300 text-sm">الموظف</th>
                        <th className="px-4 py-2 text-right text-purple-300 text-sm">الإجمالي</th>
                        <th className="px-4 py-2 text-right text-purple-300 text-sm">مكتملة</th>
                        <th className="px-4 py-2 text-right text-purple-300 text-sm">ملغاة</th>
                        <th className="px-4 py-2 text-right text-purple-300 text-sm">نسبة الإكمال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.by_employee.map((emp: EmployeeStats) => (
                        <tr key={emp.employee_id} className="border-b border-purple-500/10">
                          <td className="px-4 py-3 text-white">{emp.employee_name}</td>
                          <td className="px-4 py-3 text-purple-300">{emp.total}</td>
                          <td className="px-4 py-3 text-green-400">{emp.completed}</td>
                          <td className="px-4 py-3 text-red-400">{emp.cancelled}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-purple-900/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${emp.completion_rate || 0}%` }}
                                />
                              </div>
                              <span className="text-purple-300 text-sm">
                                {emp.completion_rate || 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-purple-400/60">لا توجد بيانات</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation for Mobile */}
        <AdminBottomNav />
      </div>
    </div>
  );
}

export default function MeetingStatsPage() {
  return (
    <AdminAuth>
      <MeetingStatsContent />
    </AdminAuth>
  );
}
