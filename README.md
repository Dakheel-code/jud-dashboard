# 🛍️ Store Tasks Dashboard

نظام MVP بسيط لإدارة مهام المتاجر الإلكترونية مع لوحة تحكم إدارية قابلة للتوسعة.

## 📋 المحتويات

- [المميزات](#-المميزات)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [البنية المعمارية](#-البنية-المعمارية)
- [التثبيت والتشغيل](#-التثبيت-والتشغيل)
- [إعداد Supabase](#-إعداد-supabase)
- [تشغيل Seeder](#-تشغيل-seeder)
- [النشر على Netlify](#-النشر-على-netlify)
- [الصفحات والمسارات](#-الصفحات-والمسارات)
- [API Endpoints](#-api-endpoints)

## ✨ المميزات

- ✅ نظام دخول بسيط باستخدام رابط المتجر (بدون Auth تقليدي)
- ✅ إدارة مهام المتجر مع تتبع الإنجاز
- ✅ تقسيم المهام حسب الفئات
- ✅ Progress Bar لعرض نسبة الإنجاز
- ✅ لوحة تحكم إدارية شاملة
- ✅ إحصائيات متقدمة (متوسط الإنجاز، أكثر/أقل قسم منجز)
- ✅ Lazy Loading لبيانات التقدم (تُنشأ عند الحاجة فقط)
- ✅ واجهة مستخدم عربية نظيفة وحديثة

## 🛠️ التقنيات المستخدمة

- **Frontend & Backend**: Next.js 14 (App Router)
- **Styling**: TailwindCSS 4
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify
- **Language**: TypeScript
- **Package Manager**: pnpm

## 🏗️ البنية المعمارية

```
store-tasks-dashboard/
├── app/
│   ├── page.tsx                    # صفحة تسجيل الدخول (/)
│   ├── tasks/
│   │   └── page.tsx                # صفحة المهام (/tasks)
│   ├── admin/
│   │   ├── page.tsx                # لوحة الإدارة (/admin)
│   │   └── store/[id]/
│   │       └── page.tsx            # تفاصيل متجر معين
│   ├── api/
│   │   ├── store/
│   │   │   └── login/route.ts      # POST /api/store/login
│   │   ├── tasks/
│   │   │   ├── route.ts            # GET /api/tasks
│   │   │   └── toggle/route.ts     # POST /api/tasks/toggle
│   │   └── admin/
│   │       ├── stats/route.ts      # GET /api/admin/stats
│   │       └── stores/route.ts     # GET /api/admin/stores
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── supabase.ts                 # Supabase client
├── types/
│   └── index.ts                    # TypeScript types
├── scripts/
│   └── seed.ts                     # Seeder للمهام الافتراضية
├── supabase/
│   └── schema.sql                  # SQL schema
├── netlify.toml                    # Netlify config
├── env.example                     # مثال لملف البيئة
└── package.json
```

## 🚀 التثبيت والتشغيل

### 1. استنساخ المشروع

```bash
git clone <repository-url>
cd store-tasks-dashboard
```

### 2. تثبيت الاعتمادات

```bash
pnpm install
```

أو إذا كنت تستخدم npm:

```bash
npm install
```

### 3. إعداد ملف البيئة

انسخ ملف `env.example` إلى `.env.local`:

```bash
cp env.example .env.local
```

ثم أضف بيانات Supabase الخاصة بك:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. تشغيل المشروع محليًا

```bash
pnpm dev
```

افتح المتصفح على [http://localhost:3000](http://localhost:3000)

## 🗄️ إعداد Supabase

### 1. إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ حساب جديد أو سجل دخول
3. أنشئ مشروع جديد
4. انتظر حتى يتم تجهيز قاعدة البيانات

### 2. تنفيذ SQL Schema

1. في لوحة تحكم Supabase، اذهب إلى **SQL Editor**
2. انسخ محتوى ملف `supabase/schema.sql`
3. الصقه في المحرر ونفذه (Run)

هذا سينشئ الجداول التالية:
- `stores` - معلومات المتاجر
- `tasks` - المهام الافتراضية
- `tasks_progress` - تتبع إنجاز المهام لكل متجر

### 3. الحصول على بيانات الاتصال

1. اذهب إلى **Settings** > **API**
2. انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ضعها في ملف `.env.local`

## 🌱 تشغيل Seeder

بعد إعداد Supabase وملف `.env.local`، قم بتشغيل Seeder لملء جدول المهام:

```bash
pnpm seed
```

هذا سيضيف 20 مهمة افتراضية مقسمة على 4 فئات:
- **الإعدادات الأساسية** (5 مهام)
- **الإطلاق** (5 مهام)
- **التسويق** (5 مهام)
- **التحسينات** (5 مهام)

## 🌐 النشر على Netlify

### الطريقة 1: عبر واجهة Netlify (موصى بها)

1. ادفع الكود إلى GitHub/GitLab/Bitbucket
2. اذهب إلى [netlify.com](https://netlify.com)
3. اضغط **Add new site** > **Import an existing project**
4. اختر repository الخاص بك
5. في **Build settings**:
   - Build command: `pnpm build`
   - Publish directory: `.next`
6. في **Environment variables**، أضف:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. اضغط **Deploy site**

### الطريقة 2: عبر Netlify CLI

```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login

# النشر
netlify deploy --prod
```

### ملاحظات مهمة للنشر

- ملف `netlify.toml` موجود ومُعد مسبقًا
- تأكد من إضافة Environment Variables في Netlify Dashboard
- Plugin `@netlify/plugin-nextjs` سيتم تثبيته تلقائيًا

## 📄 الصفحات والمسارات

### صفحات المستخدم

| المسار | الوصف |
|--------|-------|
| `/` | صفحة تسجيل الدخول - إدخال رابط المتجر |
| `/tasks` | صفحة المهام - عرض وإدارة مهام المتجر |

### صفحات الإدارة

| المسار | الوصف |
|--------|-------|
| `/admin` | لوحة الإدارة - عرض جميع المتاجر والإحصائيات |
| `/admin/store/[id]` | تفاصيل متجر معين - عرض جميع المهام وحالتها |

## 🔌 API Endpoints

### Store Login

```http
POST /api/store/login
Content-Type: application/json

{
  "store_url": "https://mystore.com"
}

Response:
{
  "store_id": "uuid"
}
```

### Get Tasks

```http
GET /api/tasks?store_id=<uuid>

Response:
{
  "tasks": {
    "الإعدادات الأساسية": [
      {
        "id": "uuid",
        "title": "ربط بوابة الدفع",
        "category": "الإعدادات الأساسية",
        "order_index": 1,
        "is_done": false
      }
    ]
  },
  "stats": {
    "total": 20,
    "completed": 5,
    "percentage": 25
  }
}
```

### Toggle Task

```http
POST /api/tasks/toggle
Content-Type: application/json

{
  "store_id": "uuid",
  "task_id": "uuid"
}

Response:
{
  "success": true,
  "is_done": true
}
```

### Admin Stats

```http
GET /api/admin/stats

Response:
{
  "total_stores": 10,
  "average_completion": 45,
  "most_completed_category": "الإعدادات الأساسية",
  "least_completed_category": "التحسينات"
}
```

### Admin Stores

```http
GET /api/admin/stores

Response:
{
  "stores": [
    {
      "id": "uuid",
      "store_url": "https://store1.com",
      "created_at": "2024-01-01T00:00:00Z",
      "total_tasks": 20,
      "completed_tasks": 10,
      "completion_percentage": 50
    }
  ]
}
```

## 🗃️ قاعدة البيانات

### Stores Table

```sql
id              UUID PRIMARY KEY
store_url       TEXT UNIQUE NOT NULL
created_at      TIMESTAMP
```

### Tasks Table

```sql
id              UUID PRIMARY KEY
title           TEXT NOT NULL
category        TEXT NOT NULL
order_index     INTEGER NOT NULL
```

### Tasks Progress Table

```sql
id              UUID PRIMARY KEY
store_id        UUID REFERENCES stores(id)
task_id         UUID REFERENCES tasks(id)
is_done         BOOLEAN DEFAULT FALSE
updated_at      TIMESTAMP
```

## 🎯 المميزات الرئيسية

### Lazy Progress Creation

- عند إنشاء متجر جديد، لا يتم إنشاء records في `tasks_progress`
- يتم إنشاؤها فقط عند:
  - أول toggle لمهمة معينة
  - أول fetch للمهام (يتم عرض `is_done: false` افتراضيًا)

### Store Authentication

- نظام Auth غير تقليدي يعتمد على `store_url` كهوية
- يتم حفظ `store_id` في LocalStorage
- إذا كان المتجر موجود، يتم تسجيل الدخول
- إذا لم يكن موجود، يتم إنشاؤه تلقائيًا

## 📝 ملاحظات تطويرية

- الكود نظيف ومنظم
- فصل واضح بين UI و API
- TypeScript types لكل entities
- Error handling أساسي
- لا توجد حلول Hacky

## 🔮 التوسعات المستقبلية

- إضافة نظام Auth حقيقي
- إمكانية تخصيص المهام لكل متجر
- إضافة notifications
- تقارير متقدمة
- تصدير البيانات

## 📄 الترخيص

MIT License

## 🤝 المساهمة

المساهمات مرحب بها! افتح Issue أو Pull Request.

---

تم البناء بـ ❤️ باستخدام Next.js و Supabase
