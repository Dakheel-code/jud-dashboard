// Netlify Scheduled Function — حساب البونص الشهري بعد يومين من توليد الفواتير
// schedule: '0 6 3 * *'  (كل شهر في اليوم الثالث الساعة 6 صباحاً UTC)

export const config = {
  schedule: '0 6 3 * *',
};

export default async () => {
  const baseUrl = process.env.URL || 'https://jud-dashboard.netlify.app';

  try {
    const res = await fetch(`${baseUrl}/api/billing/generate-bonuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // period الافتراضي = الشهر الماضي
    });

    const data = await res.json();
    console.log('[billing-generate-bonuses]', JSON.stringify(data));
  } catch (err) {
    console.error('[billing-generate-bonuses] error:', err);
  }
};
