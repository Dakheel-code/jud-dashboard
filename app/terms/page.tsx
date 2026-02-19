export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0118] text-white" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-purple-300 mb-2">شروط الخدمة</h1>
        <p className="text-purple-400/60 text-sm mb-10">آخر تحديث: فبراير 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. قبول الشروط</h2>
          <p className="text-purple-200/80 leading-relaxed">
            باستخدامك لنظام جود داشبورد، فإنك توافق على الالتزام بهذه الشروط.
            إذا كنت لا توافق على أي من هذه الشروط، يرجى التوقف عن استخدام النظام.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. وصف الخدمة</h2>
          <p className="text-purple-200/80 leading-relaxed">
            جود داشبورد هو نظام داخلي لإدارة المتاجر الإلكترونية وتتبع المهام وعرض
            إحصائيات الإعلانات الرقمية. الخدمة مخصصة للموظفين والفرق المخوّلة فقط.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. ربط حسابات Meta الإعلانية</h2>
          <p className="text-purple-200/80 leading-relaxed">
            عند ربط حساب Meta الإعلاني بالنظام، أنت تفوّض النظام بقراءة بيانات إعلاناتك
            عبر Meta Marketing API. يقتصر هذا التفويض على الصلاحيات التي وافقت عليها
            صراحةً أثناء عملية الربط. يمكنك إلغاء هذا التفويض في أي وقت.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. المسؤوليات</h2>
          <p className="text-purple-200/80 leading-relaxed">
            أنت مسؤول عن الحفاظ على سرية بيانات دخولك. لا يتحمل النظام مسؤولية أي
            استخدام غير مصرح به ناتج عن إهمال المستخدم في حماية بيانات حسابه.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. الاستخدام المقبول</h2>
          <p className="text-purple-200/80 leading-relaxed">
            يُحظر استخدام النظام لأي غرض غير مشروع، أو محاولة الوصول لبيانات مستخدمين
            آخرين، أو التلاعب في البيانات أو الإحصائيات.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. الملكية الفكرية</h2>
          <p className="text-purple-200/80 leading-relaxed">
            جميع حقوق النظام وتصميمه وكوده المصدري محفوظة لشركة جود. لا يجوز نسخ
            أو توزيع أي جزء من النظام دون إذن كتابي مسبق.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">7. التعديلات</h2>
          <p className="text-purple-200/80 leading-relaxed">
            نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بأي تغييرات
            جوهرية عبر البريد الإلكتروني أو عبر إشعار داخل النظام.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">8. التواصل</h2>
          <p className="text-purple-200/80 leading-relaxed">
            لأي استفسار متعلق بشروط الخدمة، تواصل معنا عبر:{' '}
            <a href="mailto:legal@jud.sa" className="text-purple-400 underline">legal@jud.sa</a>
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-purple-500/20 text-center text-purple-400/40 text-sm">
          © 2026 جود داشبورد — جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}
