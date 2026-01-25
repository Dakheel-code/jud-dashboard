import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { NextAuthOptions } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
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

      // بيانات افتراضية للمسؤول (يُنصح بإزالتها في الإنتاج وإنشاء مستخدم في قاعدة البيانات)
      if ((identifier === 'admin' || identifier === 'admin@jud.sa') && password === 'admin123') {
        console.warn('⚠️ تحذير: تم استخدام بيانات الدخول الافتراضية. يُنصح بإنشاء مستخدم في قاعدة البيانات.');
        return {
          id: 'default-admin',
          name: 'المسؤول الرئيسي',
          email: 'admin@jud.sa',
          role: 'super_admin',
          username: 'admin',
          avatar: null,
          permissions: ['manage_tasks', 'manage_stores', 'manage_users', 'manage_help', 'view_stats', 'manage_team'],
        };
      }

      // البحث في قاعدة البيانات
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

      return {
        id: user.id,
        name: user.name,
        email: user.email || `${user.username}@jud.sa`,
        role: user.role,
        username: user.username,
        avatar: user.avatar,
        permissions: user.permissions || [],
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
          
          console.log('Creating new Google user:', { email, userName, username, userAvatar });
          
          const { data: newUser, error: insertError } = await supabase.from('admin_users').insert({
            email: emailLower,
            name: userName,
            username: username,
            password_hash: '', // Google users don't have password
            role: 'employee',
            is_active: true,
            avatar: userAvatar,
            permissions: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          }).select().single();
          
          if (insertError) {
            console.error('Error creating Google user:', insertError);
          } else {
            console.log('Google user created successfully:', newUser);
          }
        } else {
          // تحديث آخر تسجيل دخول فقط - لا نغير الاسم أو الصورة إذا كان المستخدم موجود
          console.log('Updating last_login for existing Google user:', { email });
          
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({ 
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .ilike('email', emailLower);
            
          if (updateError) {
            console.error('Error updating Google user last_login:', updateError);
          }
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      // تخزين الحد الأدنى من البيانات في JWT لتجنب خطأ 400 (حجم cookies كبير)
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }

      if (account?.provider) token.provider = account.provider;

      // لو Google: جلب بيانات المستخدم من DB
      if (account?.provider === "google") {
        token.email = (profile as any)?.email || token.email;
        token.name = (profile as any)?.name || token.name;

        const supabase = getSupabaseClient();
        const emailToSearch = (token.email as string)?.trim() || '';
        
        console.log('JWT callback - Google login, searching for email:', emailToSearch);
        
        // البحث بدون تحويل لـ lowercase لأن ilike يتجاهل حالة الأحرف
        const { data: dbUser, error: dbError } = await supabase
          .from('admin_users')
          .select('id, role, username, email')
          .ilike('email', emailToSearch)
          .single();

        console.log('JWT callback - DB search result:', JSON.stringify({ dbUser, dbError }));

        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.username = dbUser.username;
          console.log('JWT callback - User found:', dbUser.id);
        } else {
          // محاولة ثانية: البحث بـ eq مع lowercase
          const { data: dbUser2 } = await supabase
            .from('admin_users')
            .select('id, role, username, email')
            .eq('email', emailToSearch)
            .single();
          
          if (dbUser2) {
            token.uid = dbUser2.id;
            token.role = dbUser2.role;
            token.username = dbUser2.username;
            console.log('JWT callback - User found with eq:', dbUser2.id);
          } else {
            console.log('JWT callback - User NOT found for email:', emailToSearch);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
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
