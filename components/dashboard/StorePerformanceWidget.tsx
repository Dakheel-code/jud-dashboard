'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  url: string;
  completion: number;
  tasks_done: number;
  tasks_total: number;
  trend: string;
  open_tasks?: number;
  active_campaigns?: number;
  spend_today?: number;
  roas?: number;
  status?: string;
}

interface StorePerformanceWidgetProps {
  stores: Store[];
}

type FilterType = 'all' | 'active' | 'needs_attention';
type SortType = 'roas' | 'spend' | 'open_tasks' | 'completion';

export default function StorePerformanceWidget({ stores }: StorePerformanceWidgetProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('roas');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // تصفية وترتيب المتاجر
  const filteredAndSortedStores = useMemo(() => {
    let result = [...stores];

    // تصفية
    if (filter === 'active') {
      result = result.filter(s => s.status === 'active');
    } else if (filter === 'needs_attention') {
      result = result.filter(s => s.status === 'needs_attention');
    }

    // ترتيب
    result.sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortBy) {
        case 'roas':
          aVal = a.roas || 0;
          bVal = b.roas || 0;
          break;
        case 'spend':
          aVal = a.spend_today || 0;
          bVal = b.spend_today || 0;
          break;
        case 'open_tasks':
          aVal = a.open_tasks || 0;
          bVal = b.open_tasks || 0;
          break;
        case 'completion':
          aVal = a.completion || 0;
          bVal = b.completion || 0;
          break;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [stores, filter, sortBy, sortOrder]);

  // تبديل اتجاه الترتيب
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // الحصول على لون الحالة
  const getStatusColor = (status?: string) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'needs_attention') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  // الحصول على لون ROAS
  const getRoasColor = (roas?: number) => {
    if (!roas || roas === 0) return 'text-gray-400';
    if (roas >= 3) return 'text-green-400';
    if (roas >= 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">أداء المتاجر</h3>
            <p className="text-xs text-purple-300/60">{filteredAndSortedStores.length} متجر</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-400"
          >
            <option value="all">كل المتاجر</option>
            <option value="active">نشط</option>
            <option value="needs_attention">يحتاج متابعة</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-400"
          >
            <option value="roas">ROAS</option>
            <option value="spend">الصرف</option>
            <option value="open_tasks">المهام المفتوحة</option>
            <option value="completion">نسبة الإنجاز</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={toggleSortOrder}
            className="p-1.5 bg-purple-900/50 border border-purple-500/30 rounded-lg hover:bg-purple-800/50 transition-colors"
            title={sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
          >
            {sortOrder === 'desc' ? (
              <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedStores.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-1">لا توجد متاجر</h4>
          <p className="text-purple-300/60 text-sm">لا توجد متاجر تطابق الفلتر المحدد</p>
        </div>
      ) : (
        // Stores Table/Cards
        <div className="space-y-2">
          {/* Table Header - Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs text-purple-300/70 border-b border-purple-500/20">
            <div className="col-span-3">المتجر</div>
            <div className="col-span-2 text-center">المهام</div>
            <div className="col-span-2 text-center">الحملات</div>
            <div className="col-span-2 text-center">الصرف</div>
            <div className="col-span-2 text-center">ROAS</div>
            <div className="col-span-1 text-center">الحالة</div>
          </div>

          {/* Stores List */}
          {filteredAndSortedStores.slice(0, 6).map((store) => (
            <Link
              key={store.id}
              href={`/admin/stores/${store.id}`}
              className="block"
            >
              {/* Desktop Row */}
              <div className="hidden md:grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                {/* Store Name */}
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-700/50 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {store.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{store.name}</div>
                    <div className="text-purple-300/50 text-xs truncate">{store.url}</div>
                  </div>
                </div>

                {/* Open Tasks */}
                <div className="col-span-2 text-center">
                  <span className={`text-sm font-medium ${(store.open_tasks || 0) > 8 ? 'text-red-400' : (store.open_tasks || 0) > 4 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {store.open_tasks || 0}
                  </span>
                  <span className="text-purple-300/50 text-xs mr-1">مفتوحة</span>
                </div>

                {/* Active Campaigns */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-medium text-blue-400">{store.active_campaigns || 0}</span>
                  <span className="text-purple-300/50 text-xs mr-1">حملة</span>
                </div>

                {/* Spend Today */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-medium text-emerald-400">
                    {store.spend_today ? `${(store.spend_today / 1000).toFixed(1)}K` : '0'}
                  </span>
                  <span className="text-purple-300/50 text-xs mr-1">ر.س</span>
                </div>

                {/* ROAS */}
                <div className="col-span-2 text-center">
                  <span className={`text-sm font-bold ${getRoasColor(store.roas)}`}>
                    {store.roas ? `${store.roas.toFixed(1)}x` : '-'}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(store.status)}`}></span>
                </div>
              </div>

              {/* Mobile Card */}
              <div className="md:hidden p-3 rounded-xl bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-700/50 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{store.name}</div>
                      <div className="text-purple-300/50 text-xs">{store.url}</div>
                    </div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(store.status)}`}></span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className={`text-sm font-medium ${(store.open_tasks || 0) > 8 ? 'text-red-400' : 'text-yellow-400'}`}>{store.open_tasks || 0}</div>
                    <div className="text-purple-300/50 text-xs">مهام</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-400">{store.active_campaigns || 0}</div>
                    <div className="text-purple-300/50 text-xs">حملات</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-emerald-400">{store.spend_today ? `${(store.spend_today / 1000).toFixed(1)}K` : '0'}</div>
                    <div className="text-purple-300/50 text-xs">صرف</div>
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${getRoasColor(store.roas)}`}>{store.roas ? `${store.roas.toFixed(1)}x` : '-'}</div>
                    <div className="text-purple-300/50 text-xs">ROAS</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* View All Link */}
      {stores.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href="/admin/stores"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>عرض كل المتاجر ({stores.length})</span>
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
