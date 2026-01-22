'use client';

import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  spend: number;
  roas: number;
  conversions: number;
}

interface CampaignsPulse {
  total_spend_today: number;
  total_spend_week: number;
  average_roas: number;
  best_campaign: Campaign | null;
  worst_campaign: Campaign | null;
  campaigns_without_conversions: number;
}

interface MarketingPulseWidgetProps {
  data: CampaignsPulse;
}

export default function MarketingPulseWidget({ data }: MarketingPulseWidgetProps) {
  const {
    total_spend_today,
    total_spend_week,
    average_roas,
    best_campaign,
    worst_campaign,
    campaigns_without_conversions
  } = data;

  // تنسيق الأرقام
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  // الحصول على لون ROAS
  const getRoasColor = (roas: number) => {
    if (roas >= 3) return 'text-green-400';
    if (roas >= 1.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">نبض الحملات</h3>
            <p className="text-xs text-purple-300/60">أداء الإعلانات اليوم</p>
          </div>
        </div>
        <Link
          href="/admin/campaigns"
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
        >
          <span>إدارة الحملات</span>
          <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Spend Today */}
        <div className="bg-purple-900/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(total_spend_today)}
          </div>
          <div className="text-xs text-purple-300/60 mt-1">صرف اليوم (ر.س)</div>
        </div>

        {/* Spend Week */}
        <div className="bg-purple-900/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {formatCurrency(total_spend_week)}
          </div>
          <div className="text-xs text-purple-300/60 mt-1">صرف الأسبوع (ر.س)</div>
        </div>

        {/* Average ROAS */}
        <div className="bg-purple-900/30 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${getRoasColor(average_roas)}`}>
            {average_roas.toFixed(1)}x
          </div>
          <div className="text-xs text-purple-300/60 mt-1">متوسط ROAS</div>
        </div>

        {/* Campaigns without conversions */}
        <div className="bg-purple-900/30 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${campaigns_without_conversions > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {campaigns_without_conversions}
          </div>
          <div className="text-xs text-purple-300/60 mt-1">بدون تحويلات</div>
        </div>
      </div>

      {/* Best & Worst Campaigns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Best Campaign */}
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-sm font-medium text-green-400">أفضل حملة</span>
          </div>
          
          {best_campaign ? (
            <div>
              <div className="text-white font-medium mb-2 truncate">{best_campaign.name}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-emerald-400">{formatCurrency(best_campaign.spend)}</div>
                  <div className="text-xs text-purple-300/50">صرف</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-green-400">{best_campaign.roas.toFixed(1)}x</div>
                  <div className="text-xs text-purple-300/50">ROAS</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-400">{best_campaign.conversions}</div>
                  <div className="text-xs text-purple-300/50">تحويل</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-purple-300/50 text-sm text-center py-2">لا توجد بيانات</div>
          )}
        </div>

        {/* Worst Campaign */}
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-sm font-medium text-red-400">أسوأ حملة</span>
          </div>
          
          {worst_campaign ? (
            <div>
              <div className="text-white font-medium mb-2 truncate">{worst_campaign.name}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-orange-400">{formatCurrency(worst_campaign.spend)}</div>
                  <div className="text-xs text-purple-300/50">صرف</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-red-400">{worst_campaign.roas.toFixed(1)}x</div>
                  <div className="text-xs text-purple-300/50">ROAS</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-400">{worst_campaign.conversions}</div>
                  <div className="text-xs text-purple-300/50">تحويل</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-purple-300/50 text-sm text-center py-2">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Warning for campaigns without conversions */}
      {campaigns_without_conversions > 0 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-yellow-400 text-sm font-medium">تنبيه: حملات بدون تحويلات</div>
            <div className="text-purple-300/60 text-xs">{campaigns_without_conversions} حملات لم تحقق أي تحويلات اليوم</div>
          </div>
          <Link
            href="/admin/campaigns?filter=no_conversions"
            className="text-yellow-400 text-xs hover:text-yellow-300 transition-colors"
          >
            مراجعة ←
          </Link>
        </div>
      )}
    </div>
  );
}
