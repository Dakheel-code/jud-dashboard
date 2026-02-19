import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // التحقق من NextAuth session — مصدر الحقيقة الوحيد
  // ملاحظة: token.provider يُخزَّن صراحةً في jwt callback داخل lib/auth.ts
  // عبر: if (account?.provider) token.provider = account.provider;
  // لذا هذا الفحص آمن حتى بعد انتهاء الجلسة وتجديدها
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token || !token.uid) {
    // token فارغ أو بدون uid = جلسة غير صالحة
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا كان تسجيل الدخول عبر Google، تأكد من الدومين
  // هذا فحص دفاعي إضافي — signIn callback في auth.ts يمنع الدخول أصلاً
  if (token.provider === 'google') {
    const email = token.email as string;
    if (!email || !email.endsWith('@jud.sa')) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('error', 'domain_restricted');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // استثناء /admin/login و /api/auth من الـ matcher مباشرة
    '/admin/((?!login$|login/).*)',
    '/announcements/:path*',
  ],
};
