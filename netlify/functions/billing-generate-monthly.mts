// Netlify Scheduled Function — تشغيل تلقائي أول كل شهر الساعة 6:00 صباحاً UTC
// schedule: '0 6 1 * *'

export const config = {
  schedule: '0 6 1 * *',
};

export default async () => {
  const baseUrl = process.env.URL || 'https://jud-dashboard.netlify.app';

  try {
    const res = await fetch(`${baseUrl}/api/billing/generate-monthly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    console.log('[billing-generate-monthly]', JSON.stringify(data));
  } catch (err) {
    console.error('[billing-generate-monthly] error:', err);
  }
};
