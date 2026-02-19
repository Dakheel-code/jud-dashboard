export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse' }} />
        </div>
        <p className="text-white text-lg">جاري التحميل...</p>
      </div>
    </div>
  );
}
