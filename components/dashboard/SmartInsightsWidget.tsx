'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  action: string | null;
  link: string | null;
}

interface SmartInsightsWidgetProps {
  insights: Insight[];
  onRefresh?: () => void;
}

export default function SmartInsightsWidget({ insights, onRefresh }: SmartInsightsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // الحصول على نمط النوع
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-400'
        };
      case 'success':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          iconBg: 'bg-green-500/20',
          iconColor: 'text-green-400',
          titleColor: 'text-green-400'
        };
      case 'error':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          titleColor: 'text-red-400'
        };
      case 'info':
      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-400'
        };
    }
  };

  // تحديث التوصيات
  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">توصيات ذكية</h3>
            <p className="text-xs text-purple-300/60">تحليل تلقائي للبيانات</p>
          </div>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-lg text-xs font-medium hover:bg-violet-500/30 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
        )}
      </div>

      {/* Content */}
      {insights.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-1">لا توجد توصيات حالياً</h4>
          <p className="text-purple-300/60 text-sm mb-4">سيتم تحليل البيانات وعرض التوصيات هنا</p>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>تحديث التوصيات</span>
            </button>
          )}
        </div>
      ) : (
        // Insights List
        <div className="space-y-3">
          {insights.map((insight) => {
            const style = getTypeStyle(insight.type);
            
            return (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border ${style.bg} ${style.border} transition-all`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 ${style.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ${style.iconColor}`}>
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm mb-1 ${style.titleColor}`}>
                      {insight.title}
                    </h4>
                    <p className="text-purple-300/70 text-xs leading-relaxed">
                      {insight.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  {insight.action && insight.link && (
                    <Link
                      href={insight.link}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${style.iconBg} ${style.iconColor} hover:opacity-80 transition-opacity`}
                    >
                      {insight.action}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-300/50">
        <span>التوصيات مبنية على تحليل البيانات الحالية</span>
        <span>v1.0</span>
      </div>
    </div>
  );
}
