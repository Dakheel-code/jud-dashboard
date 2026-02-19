import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { NextAuthOptions } from "next-auth";
import { getUserPermissions } from './rbac';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceKey);
}

// Build providers array conditionally
const providers: any[] = [];

// Only add Google provider if credentials are available
// ملاحظة: Scopes مقفلة على الهوية فقط (openid, email, profile)
// التقويم يتم ربطه عبر /api/google/connect منفصلاً
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          scope: "openid email profile", // هوية فقط - ممنوع calendar scopes هنا
        },
      },
    })
  );
}

// Always add Credentials provider
providers.push(
  CredentialsProvider({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const identifier = credentials?.email?.trim()?.toLowerCase();
      const password = credentials?.password;

      if (!identifier || !password) return null;

      // البحث في قاعدة البيانات أولاً دائماً
      const supabase = getSupabaseClient();
      const passwordHash = hashPassword(password);

      // مرحلة انتقالية: إذا فيه @ ابحث بالـ email، وإلا ابحث بالـ username
      const isEmail = identifier.includes('@');
      
      let query = supabase
        .from('admin_users')
        .select('*')
        .eq('is_active', true);
      
      if (isEmail) {
        query = query.ilike('email', identifier);
      } else {
        query = query.ilike('username', identifier);
      }
      
      const { data: user, error } = await query.single();

      if (error || !user) return null;

      // تحقق من كلمة المرور - مستخدمي Google يجب عليهم تسجيل الدخول عبر Google
      if (!user.password_hash || user.password_hash === '') {
        // مستخدم Google - لا يمكنه تسجيل الدخول بكلمة مرور
        return null;
      }
      
      if (user.password_hash !== passwordHash) {
        return null;
      }

      // تحديث آخر تسجيل دخول
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', user.id);

      // RBAC: تأكد أن المستخدم عنده دور — إذا لا، أعطه employee
      const { data: existingRoles } = await supabase
        .from('admin_user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (!existingRoles || existingRoles.length === 0) {
        const { data: employeeRole } = await supabase
          .from('admin_roles')
          .select('id')
          .eq('key', 'employee')
          .single();

        if (employeeRole) {
          await supabase.from('admin_user_roles').insert({
            user_id: user.id,
            role_id: employeeRole.id,
          });
        }
      }

      // جلب صلاحيات RBAC الحقيقية
      let rbacRoles: string[] = [];
      let rbacPermissions: string[] = [];
      try {
        const rbac = await getUserPermissions(user.id);
        rbacRoles = rbac.roles;
        rbacPermissions = rbac.permissions;
      } catch {
        // fallback
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email || `${user.username}@jud.sa`,
        role: rbacRoles[0] || user.role,
        username: user.username,
        avatar: user.avatar,
        permissions: rbacPermissions,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  // استخدام الإعدادات الافتراضية للـ cookies
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    async signIn({ user, account, profile }) {
      // تقييد Google على دومين jud.sa فقط
      if (account?.provider === "google") {
        const email = (profile as any)?.email?.toLowerCase() || user?.email?.toLowerCase();
        if (!email || !email.endsWith("@jud.sa")) {
          return false;
        }

        // إنشاء/تحديث المستخدم في قاعدة البيانات عند أول تسجيل دخول Google
        const supabase = getSupabaseClient();
        const emailLower = email.toLowerCase();
        
        const { data: existingUser } = await supabase
          .from('admin_users')
          .select('id')
          .ilike('email', emailLower)
          .single();

        if (!existingUser) {
          // إنشاء مستخدم جديد
          const userName = (profile as any)?.name || user?.name || email.split('@')[0];
          const userAvatar = (profile as any)?.picture || user?.image;
          const username = email.split('@')[0];
          
          const { data: newUser, error: insertError } = await supabase.from('admin_users').insert({
            email: emailLower,
            name: userName,
            username: username,
            password_hash: '', // Google users don't have password
            is_active: true,
            avatar: userAvatar,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          }).select('id').single();
          
          // 🚨 امنع الدخول إذا ما انحفظ المستخدم
          if (insertError) {
            console.error('FAILED TO CREATE GOOGLE USER:', insertError);
            return false;
          }

          // RBAC: ربط المستخدم الجديد بدور موظف
          const { data: employeeRole } = await supabase
            .from('admin_roles')
            .select('id')
            .eq('key', 'employee')
            .single();

          if (!employeeRole) {
            console.error('Employee role not found');
            return false;
          }

          await supabase.from('admin_user_roles').insert({
            user_id: newUser!.id,
            role_id: employeeRole.id,
          });
        } else {
          // تحديث آخر تسجيل دخول فقط
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({ 
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .ilike('email', emailLower);

          if (updateError) {
            console.error('FAILED TO UPDATE LAST LOGIN:', updateError);
            return false;
          }

          // RBAC: أضف employee فقط إذا ما عنده أي roles
          const { data: anyRoles } = await supabase
            .from('admin_user_roles')
            .select('role_id')
            .eq('user_id', existingUser.id);

          if (!anyRoles || anyRoles.length === 0) {
            const { data: employeeRole } = await supabase
              .from('admin_roles')
              .select('id')
              .eq('key', 'employee')
              .single();

            if (employeeRole) {
              await supabase.from('admin_user_roles').insert({
                user_id: existingUser.id,
                role_id: employeeRole.id,
              });
            }
          }
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      // تخزين الحد الأدنى فقط لتجنب HTTP 400 (حجم JWT كبير)
      if (user) {
        token.uid      = user.id;
        token.role     = (user as any).role;
        token.username = (user as any).username;
      }
      if (account?.provider) token.provider = account.provider;

      // Google: جلب uid من DB عند تسجيل الدخول فقط
      if (account?.provider === "google") {
        token.email = (profile as any)?.email || token.email;
        const supabase = getSupabaseClient();
        const emailToSearch = (token.email as string)?.trim() || '';
        const { data: dbUser } = await supabase
          .from('admin_users')
          .select('id, username')
          .ilike('email', emailToSearch)
          .single();
        if (dbUser) {
          token.uid      = dbUser.id;
          token.username = dbUser.username;
          try {
            const rbac = await getUserPermissions(dbUser.id);
            token.role = rbac.roles[0] || 'viewer';
          } catch { token.role = 'viewer'; }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id       = token.uid;
        (session.user as any).role     = token.role;
        (session.user as any).provider = token.provider;
        (session.user as any).username = token.username;
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
};
