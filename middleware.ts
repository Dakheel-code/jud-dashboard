import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// خريطة الصفحات الحساسة والصلاحيات المطلوبة
const PROTECTED_ROUTES: { pattern: RegExp; permission: string }[] = [
  { pattern: /^\/admin\/permissions/, permission: 'users.permissions' },
  { pattern: /^\/admin\/users/,       permission: 'users.read' },
  { pattern: /^\/admin\/stores/,      permission: 'stores.view' },
  { pattern: /^\/admin\/settings/,    permission: 'settings.general' },
];

// الأدوار التي تملك صلاحيات كاملة بدون فحص
const SUPER_ROLES = ['owner', 'general_manager'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token || !token.uid) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا كان تسجيل الدخول عبر Google، تأكد من الدومين
  if (token.provider === 'google') {
    const email = token.email as string;
    if (!email || !email.endsWith('@jud.sa')) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('error', 'domain_restricted');
      return NextResponse.redirect(loginUrl);
    }
  }

  // فحص صلاحيات الصفحات الحساسة
  const tokenRoles: string[] = (token.roles as string[]) || (token.role ? [token.role as string] : []);
  const tokenPerms: string[] = (token.permissions as string[]) || [];

  // المالك والمدير العام يمرون مباشرة
  if (SUPER_ROLES.some(r => tokenRoles.includes(r))) {
    return NextResponse.next();
  }

  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      if (!tokenPerms.includes(route.permission)) {
        return NextResponse.redirect(new URL('/admin?error=forbidden', request.url));
      }
      break;
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
