import dynamic from 'next/dynamic'

const PermissionsClient = dynamic(() => import('./PermissionsClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0d0221] flex flex-col items-center justify-center gap-6" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center animate-pulse">
          <span className="text-3xl">🔐</span>
        </div>
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-1">إدارة الصلاحيات والأدوار</h2>
          <p className="text-purple-400/60 text-sm">جاري التحميل...</p>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-6xl px-4 flex gap-6 mt-4">
        <div className="w-64 flex-shrink-0 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-purple-900/20 border border-purple-500/10 animate-pulse" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-32 rounded-2xl bg-purple-900/20 border border-purple-500/10 animate-pulse" />
          <div className="h-12 rounded-xl bg-purple-900/20 border border-purple-500/10 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-purple-900/20 border border-purple-500/10 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  ),
})

export default function PermissionsPage() {
  return <PermissionsClient />
}
