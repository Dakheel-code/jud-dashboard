'use client';

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl text-white mb-2 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
              دليل إعداد المشروع
            </h1>
            <p className="text-gray-600">
              اتبع الخطوات التالية لإعداد قاعدة البيانات وتشغيل المشروع
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    إنشاء مشروع Supabase
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                    <li>اذهب إلى <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">supabase.com</a></li>
                    <li>أنشئ حساب جديد أو سجل دخول</li>
                    <li>اضغط على &quot;New Project&quot;</li>
                    <li>اختر اسم للمشروع وكلمة مرور قوية</li>
                    <li>انتظر حتى يتم تجهيز قاعدة البيانات (2-3 دقائق)</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    تنفيذ SQL Schema
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                    <li>في لوحة تحكم Supabase، اذهب إلى <strong>SQL Editor</strong></li>
                    <li>افتح ملف <code className="bg-gray-200 px-2 py-1 rounded">supabase/schema.sql</code> من المشروع</li>
                    <li>انسخ محتوى الملف بالكامل</li>
                    <li>الصقه في SQL Editor واضغط <strong>Run</strong></li>
                    <li>تأكد من ظهور رسالة نجاح</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-6 border-2 border-pink-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    الحصول على بيانات الاتصال
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                    <li>اذهب إلى <strong>Settings</strong> → <strong>API</strong></li>
                    <li>انسخ <strong>Project URL</strong></li>
                    <li>انسخ <strong>anon public key</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    إنشاء ملف البيئة
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm mb-3">
                    <li>في مجلد المشروع، أنشئ ملف جديد باسم <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code></li>
                    <li>أضف المحتوى التالي:</li>
                  </ol>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    <div>NEXT_PUBLIC_SUPABASE_URL=your_project_url_here</div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here</div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    استبدل القيم بالبيانات التي حصلت عليها من الخطوة السابقة
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    تشغيل Seeder
                  </h3>
                  <p className="text-gray-700 text-sm mb-3">
                    قم بتشغيل الأمر التالي لملء قاعدة البيانات بالمهام الافتراضية:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    npm run seed
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                  6
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    إعادة تشغيل السيرفر
                  </h3>
                  <p className="text-gray-700 text-sm mb-3">
                    أوقف السيرفر (Ctrl+C) ثم شغّله من جديد:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    npm run dev
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
            <a
              href="/"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all text-center"
            >
              العودة للصفحة الرئيسية
            </a>
            <a
              href="https://supabase.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-all text-center"
            >
              وثائق Supabase
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
