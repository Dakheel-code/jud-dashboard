'use client';

import { useState, useMemo } from 'react';
import { getAvatarUrl, getAvatarInitial } from '@/lib/avatar';

interface Manager {
  id: string;
  name: string;
  avatar: string | null;
  stores_count: number;
  completion_rate?: number;
  tasks_completed?: number;
  total_tasks?: number;
}

interface AccountManagersData {
  best_manager: Manager;
  worst_manager: Manager;
  overall_completion_rate: number;
  total_managers: number;
  total_stores_assigned: number;
  unassigned_stores: number;
  top_10: Manager[];
  most_assigned: Manager;
  least_assigned: Manager;
}

interface AccountManagersWidgetProps {
  data: AccountManagersData;
}

type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function AccountManagersWidget({ data }: AccountManagersWidgetProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const periods = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
    { key: 'year', label: 'السنة' },
    { key: 'custom', label: 'مخصص' },
  ];

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
    }
  };

  // بيانات مختلفة حسب الفترة الزمنية - ثابتة لكل فترة
  const periodData = useMemo(() => {
    const baseData = {
      overall_completion_rate: data.overall_completion_rate,
      total_stores_assigned: data.total_stores_assigned,
      unassigned_stores: data.unassigned_stores,
      best_manager: data.best_manager,
      worst_manager: data.worst_manager,
      top_10: data.top_10,
      most_assigned: data.most_assigned,
      least_assigned: data.least_assigned,
    };

    switch (selectedPeriod) {
      case 'today':
        return {
          ...baseData,
          overall_completion_rate: 65,
          best_manager: { ...data.best_manager, tasks_completed: 8, completion_rate: 88 },
          worst_manager: { ...data.worst_manager, tasks_completed: 2, completion_rate: 25 },
          top_10: [
            { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8, completion_rate: 82 },
            { id: '2', name: 'سارة علي', avatar: null, stores_count: 7, completion_rate: 78 },
            { id: '3', name: 'محمد خالد', avatar: null, stores_count: 6, completion_rate: 72 },
            { id: '4', name: 'فاطمة أحمد', avatar: null, stores_count: 5, completion_rate: 68 },
            { id: '5', name: 'عمر حسن', avatar: null, stores_count: 5, completion_rate: 65 },
            { id: '6', name: 'نورة سعد', avatar: null, stores_count: 4, completion_rate: 58 },
            { id: '7', name: 'يوسف محمد', avatar: null, stores_count: 3, completion_rate: 52 },
            { id: '8', name: 'ريم عبدالرحمن', avatar: null, stores_count: 2, completion_rate: 45 },
            { id: '9', name: 'سلطان فهد', avatar: null, stores_count: 1, completion_rate: 38 },
            { id: '10', name: 'خالد عبدالله', avatar: null, stores_count: 1, completion_rate: 25 }
          ],
        };
      case 'week':
        return {
          ...baseData,
          overall_completion_rate: 72,
          best_manager: { ...data.best_manager, tasks_completed: 28, completion_rate: 92 },
          worst_manager: { ...data.worst_manager, tasks_completed: 8, completion_rate: 32 },
          top_10: [
            { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8, completion_rate: 90 },
            { id: '2', name: 'سارة علي', avatar: null, stores_count: 7, completion_rate: 85 },
            { id: '3', name: 'محمد خالد', avatar: null, stores_count: 6, completion_rate: 80 },
            { id: '4', name: 'فاطمة أحمد', avatar: null, stores_count: 5, completion_rate: 76 },
            { id: '5', name: 'عمر حسن', avatar: null, stores_count: 5, completion_rate: 72 },
            { id: '6', name: 'نورة سعد', avatar: null, stores_count: 4, completion_rate: 65 },
            { id: '7', name: 'يوسف محمد', avatar: null, stores_count: 3, completion_rate: 58 },
            { id: '8', name: 'ريم عبدالرحمن', avatar: null, stores_count: 2, completion_rate: 50 },
            { id: '9', name: 'سلطان فهد', avatar: null, stores_count: 1, completion_rate: 42 },
            { id: '10', name: 'خالد عبدالله', avatar: null, stores_count: 1, completion_rate: 32 }
          ],
        };
      case 'year':
        return {
          ...baseData,
          overall_completion_rate: 82,
          best_manager: { ...data.best_manager, tasks_completed: 520, completion_rate: 97 },
          worst_manager: { ...data.worst_manager, tasks_completed: 145, completion_rate: 42 },
          top_10: [
            { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8, completion_rate: 97 },
            { id: '2', name: 'سارة علي', avatar: null, stores_count: 7, completion_rate: 94 },
            { id: '3', name: 'محمد خالد', avatar: null, stores_count: 6, completion_rate: 90 },
            { id: '4', name: 'فاطمة أحمد', avatar: null, stores_count: 5, completion_rate: 87 },
            { id: '5', name: 'عمر حسن', avatar: null, stores_count: 5, completion_rate: 84 },
            { id: '6', name: 'نورة سعد', avatar: null, stores_count: 4, completion_rate: 78 },
            { id: '7', name: 'يوسف محمد', avatar: null, stores_count: 3, completion_rate: 72 },
            { id: '8', name: 'ريم عبدالرحمن', avatar: null, stores_count: 2, completion_rate: 65 },
            { id: '9', name: 'سلطان فهد', avatar: null, stores_count: 1, completion_rate: 58 },
            { id: '10', name: 'خالد عبدالله', avatar: null, stores_count: 1, completion_rate: 42 }
          ],
        };
      default: // month
        return baseData;
    }
  }, [selectedPeriod, data]);

  const displayedManagers = showAll ? periodData.top_10 : periodData.top_10.slice(0, 5);

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

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">إحصائيات مدراء العلاقات</h3>
            <p className="text-purple-300/60 text-sm">{data.total_managers} مدير علاقة</p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => handlePeriodChange(period.key as PeriodType)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period.key
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustomDate && (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2">
            <label className="text-purple-300 text-sm">من:</label>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-purple-300 text-sm">إلى:</label>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <button className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors">
            تطبيق
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* نسبة الإنجاز الكلية */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300/70 text-sm">نسبة الإنجاز</span>
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl font-bold ${getCompletionColor(periodData.overall_completion_rate)}`}>
            {periodData.overall_completion_rate}%
          </div>
          <div className="w-full h-1.5 bg-purple-900/50 rounded-full mt-2">
            <div 
              className={`h-full rounded-full ${getCompletionBg(periodData.overall_completion_rate)}`}
              style={{ width: `${periodData.overall_completion_rate}%` }}
            ></div>
          </div>
        </div>

        {/* المتاجر المسندة وغير المسندة */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-purple-300/70 text-sm">المتاجر</span>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{data.total_stores_assigned}</div>
              <p className="text-purple-300/50 text-xs">مسندة</p>
            </div>
            <div className="h-8 w-px bg-purple-500/30"></div>
            <div className="text-center">
              <div className={`text-xl font-bold ${data.unassigned_stores > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {data.unassigned_stores}
              </div>
              <p className="text-purple-300/50 text-xs">بدون مدير</p>
            </div>
          </div>
        </div>

        {/* أكثر مدير مسند له */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300/70 text-sm">الأكثر إسناداً</span>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
              {getAvatarInitial(data.most_assigned.name)}
            </div>
            <div>
              <p className="text-white text-sm font-medium truncate">{data.most_assigned.name}</p>
              <p className="text-green-400 text-xs">{data.most_assigned.stores_count} متجر</p>
            </div>
          </div>
        </div>

        {/* أقل مدير مسند له */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300/70 text-sm">الأقل إسناداً</span>
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {getAvatarInitial(data.least_assigned.name)}
            </div>
            <div>
              <p className="text-white text-sm font-medium truncate">{data.least_assigned.name}</p>
              <p className="text-red-400 text-xs">{data.least_assigned.stores_count} متجر</p>
            </div>
          </div>
        </div>
      </div>

      {/* Best & Worst Managers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* أفضل مدير */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-green-400 font-semibold">أفضل مدير علاقة</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
              {getAvatarInitial(periodData.best_manager.name)}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{periodData.best_manager.name}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">{periodData.best_manager.completion_rate}% إنجاز</span>
                <span className="text-purple-300/60">{periodData.best_manager.stores_count} متجر</span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-green-400">{periodData.best_manager.tasks_completed}</p>
              <p className="text-purple-300/50 text-xs">مهمة منجزة</p>
            </div>
          </div>
        </div>

        {/* أقل مدير */}
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-400 font-semibold">يحتاج متابعة</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
              {getAvatarInitial(periodData.worst_manager.name)}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{periodData.worst_manager.name}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-red-400">{periodData.worst_manager.completion_rate}% إنجاز</span>
                <span className="text-purple-300/60">{periodData.worst_manager.stores_count} متجر</span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-red-400">{periodData.worst_manager.tasks_completed}</p>
              <p className="text-purple-300/50 text-xs">مهمة منجزة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Managers */}
      <div>
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          توب 10 مدراء حسب عدد المتاجر
        </h4>
        <div className="space-y-2">
          {displayedManagers.map((manager, index) => (
            <div 
              key={manager.id}
              className="flex items-center gap-3 bg-purple-900/20 rounded-xl p-3 border border-purple-500/10 hover:border-purple-500/30 transition-all"
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-purple-500/20 text-purple-300'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                {getAvatarInitial(manager.name)}
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-white font-medium">{manager.name}</p>
                <p className="text-purple-300/60 text-xs">{manager.stores_count} متجر</p>
              </div>

              {/* Completion Rate */}
              <div className="text-left">
                <p className={`font-bold ${getCompletionColor(manager.completion_rate || 0)}`}>
                  {manager.completion_rate}%
                </p>
                <p className="text-purple-300/50 text-xs">إنجاز</p>
              </div>

              {/* Progress Bar */}
              <div className="w-20 hidden sm:block">
                <div className="w-full h-2 bg-purple-900/50 rounded-full">
                  <div 
                    className={`h-full rounded-full ${getCompletionBg(manager.completion_rate || 0)}`}
                    style={{ width: `${manager.completion_rate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More / Show Less Button */}
        {data.top_10.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-4 py-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-purple-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            {showAll ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                إظهار أقل
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                إظهار المزيد ({data.top_10.length - 5} آخرين)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
