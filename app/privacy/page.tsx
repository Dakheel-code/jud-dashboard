export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0118] text-white" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-purple-300 mb-2">سياسة الخصوصية</h1>
        <p className="text-purple-400/60 text-sm mb-10">آخر تحديث: فبراير 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. المعلومات التي نجمعها</h2>
          <p className="text-purple-200/80 leading-relaxed">
            يجمع نظام جود داشبورد المعلومات الضرورية لتشغيل الخدمة فقط، وتشمل:
            بيانات تسجيل الدخول (البريد الإلكتروني)، ومعلومات الحسابات الإعلانية المرتبطة
            (عبر Meta Marketing API)، وبيانات أداء الإعلانات والإحصائيات.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. كيف نستخدم المعلومات</h2>
          <p className="text-purple-200/80 leading-relaxed">
            تُستخدم البيانات حصرياً لعرض إحصائيات الإعلانات وإدارة المتاجر داخل لوحة التحكم.
            لا نبيع أي بيانات لأطراف ثالثة ولا نستخدمها لأغراض تسويقية.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. بيانات Meta / Facebook</h2>
          <p className="text-purple-200/80 leading-relaxed">
            عند ربط حساب Meta الإعلاني، نحصل على صلاحيات قراءة بيانات الإعلانات فقط
            (<code className="text-purple-300 bg-purple-900/40 px-1 rounded">ads_read</code>).
            يتم تخزين رمز الوصول (Access Token) بشكل مشفّر ولا يُشارَك مع أي طرف ثالث.
            يمكنك إلغاء الربط في أي وقت من إعدادات Facebook.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. أمان البيانات</h2>
          <p className="text-purple-200/80 leading-relaxed">
            نستخدم تشفير AES-256 لحماية رموز الوصول، واتصالات HTTPS لجميع البيانات المنقولة.
            يقتصر الوصول على الموظفين المخوّلين داخل المنظومة.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. الاحتفاظ بالبيانات</h2>
          <p className="text-purple-200/80 leading-relaxed">
            يتم الاحتفاظ ببيانات الإعلانات المخزّنة مؤقتاً (Cache) لمدة لا تتجاوز 30 يوماً.
            يمكن حذف جميع بياناتك بطلب مكتوب عبر البريد الإلكتروني أدناه.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. التواصل</h2>
          <p className="text-purple-200/80 leading-relaxed">
            لأي استفسار متعلق بالخصوصية، تواصل معنا عبر:{' '}
            <a href="mailto:privacy@jud.sa" className="text-purple-400 underline">privacy@jud.sa</a>
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-purple-500/20 text-center text-purple-400/40 text-sm">
          © 2026 جود داشبورد — جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}
