import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // المسارات المحمية
  const protectedPaths = ['/admin', '/announcements'];
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path) && !pathname.startsWith('/admin/login')
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // التحقق من NextAuth session
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // التحقق من الـ token القديم (للتوافق مع النظام الحالي)
  const legacyToken = request.cookies.get('admin_token')?.value;

  // إذا لا يوجد أي نوع من التوثيق
  if (!token && !legacyToken) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا كان تسجيل الدخول عبر Google، تأكد من الدومين
  if (token?.provider === 'google') {
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
    '/admin/:path*',
    '/announcements/:path*',
  ],
};
