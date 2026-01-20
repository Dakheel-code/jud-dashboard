# دليل ربط المنصات الإعلانية

## نظرة عامة

هذا النظام يسمح بربط حسابات المنصات الإعلانية مباشرة مع كل متجر عبر OAuth، بدون الحاجة لـ Windsor.ai.

## المنصات المدعومة

- ✅ **Snapchat Ads** - جاهز
- 🔜 **TikTok for Business** - قريباً
- 🔜 **Meta (Facebook/Instagram)** - قريباً
- 🔜 **Google Ads** - قريباً

---

## إعداد Snapchat Ads

### 1. إنشاء تطبيق على Snapchat

1. اذهب إلى [Snapchat Business Manager](https://business.snapchat.com/)
2. انتقل إلى **Business Settings** → **Business Details** → **OAuth Apps**
3. اضغط **Create OAuth App**
4. املأ البيانات:
   - **App Name**: اسم تطبيقك
   - **Description**: وصف قصير
   - **Redirect URI**: `https://yourdomain.com/api/integrations/snapchat/callback`
5. بعد الإنشاء، ستحصل على:
   - **Client ID**
   - **Client Secret**

### 2. متغيرات البيئة

أضف هذه المتغيرات في Netlify (أو `.env.local` للتطوير المحلي):

```env
# Snapchat OAuth
SNAPCHAT_CLIENT_ID=your_client_id_here
SNAPCHAT_CLIENT_SECRET=your_client_secret_here

# App URL
APP_BASE_URL=https://yourdomain.com

# Token Encryption (مهم جداً!)
TOKEN_ENCRYPTION_KEY=your_32_bytes_base64_key_here
```

### 3. توليد مفتاح التشفير

لتوليد مفتاح تشفير آمن، نفذ هذا الأمر في Node.js:

```javascript
require('crypto').randomBytes(32).toString('base64')
```

أو استخدم هذا الأمر في Terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. إعداد قاعدة البيانات

نفذ ملف الـ Migration في Supabase:

```sql
-- انسخ محتوى الملف:
-- supabase/migrations/001_ad_platform_accounts.sql
```

---

## كيفية الاستخدام

### للمستخدم النهائي:

1. اذهب إلى صفحة المتجر
2. اضغط على **ربط المنصات الإعلانية** أو اذهب إلى `/admin/store/[id]/integrations`
3. اضغط **ربط** بجانب Snapchat
4. سيتم توجيهك لصفحة Snapchat لتسجيل الدخول والموافقة
5. بعد الموافقة، اختر الحساب الإعلاني المراد ربطه
6. اضغط **حفظ**

### لفصل الربط:

1. اذهب إلى صفحة الربط
2. اضغط **فصل** بجانب المنصة المربوطة

---

## API Endpoints

### Snapchat

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/integrations/snapchat/start?storeId=...` | GET | بدء OAuth |
| `/api/integrations/snapchat/callback` | GET | استقبال الكود |
| `/api/integrations/snapchat/ad-accounts?storeId=...` | GET | جلب الحسابات الإعلانية |
| `/api/integrations/snapchat/select-account` | POST | حفظ الحساب المختار |
| `/api/integrations/snapchat/disconnect` | POST | فصل الربط |

### عام

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/integrations/status?storeId=...` | GET | حالة جميع المنصات |

---

## هيكل الملفات

```
lib/
├── encryption.ts              # تشفير/فك تشفير التوكنات
└── integrations/
    ├── snapchat.ts            # Snapchat adapter
    ├── token-manager.ts       # إدارة التوكنات
    ├── tiktok.ts              # (قريباً)
    ├── meta.ts                # (قريباً)
    └── google.ts              # (قريباً)

app/api/integrations/
├── status/route.ts            # حالة جميع المنصات
└── snapchat/
    ├── start/route.ts         # بدء OAuth
    ├── callback/route.ts      # استقبال الكود
    ├── ad-accounts/route.ts   # جلب الحسابات
    ├── select-account/route.ts # حفظ الحساب
    └── disconnect/route.ts    # فصل الربط

app/admin/store/[id]/integrations/
└── page.tsx                   # صفحة الربط
```

---

## الأمان

- ✅ التوكنات مشفرة بـ AES-256-GCM قبل التخزين
- ✅ OAuth state للحماية من CSRF
- ✅ التوكنات لا تُرسل للواجهة أبداً
- ✅ تجديد التوكن تلقائياً عند الانتهاء
- ✅ RLS policies على Supabase

---

## استكشاف الأخطاء

### "Token expired and no refresh token available"
- أعد الربط من صفحة الإعدادات

### "Invalid or expired state"
- حاول مرة أخرى - الـ state صالح لـ 10 دقائق فقط

### "Failed to exchange code for token"
- تأكد من صحة Client ID و Client Secret
- تأكد من أن Redirect URI مطابق تماماً

---

## التطوير المحلي

1. انسخ `.env.example` إلى `.env.local`
2. املأ المتغيرات
3. شغل `npm run dev`
4. استخدم ngrok للحصول على HTTPS URL للـ callback:
   ```bash
   ngrok http 3000
   ```
5. حدث Redirect URI في Snapchat Business Manager
