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

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } },
    }),

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

        // بيانات افتراضية للمسؤول (مرحلة انتقالية)
        if ((identifier === 'admin' || identifier === 'admin@jud.sa') && password === 'admin123') {
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

        // تحقق من كلمة المرور (تجاهل إذا كان password_hash فارغ - مستخدم Google)
        if (user.password_hash && user.password_hash !== '' && user.password_hash !== passwordHash) {
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
    }),
  ],

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
          // تحديث آخر تسجيل دخول والبيانات
          const userAvatar = (profile as any)?.picture || user?.image;
          const userName = (profile as any)?.name || user?.name;
          
          console.log('Updating existing Google user:', { email, userName, userAvatar });
          
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({ 
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar: userAvatar,
              name: userName || undefined,
              is_active: true,
            })
            .ilike('email', emailLower);
            
          if (updateError) {
            console.error('Error updating Google user:', updateError);
          }
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.permissions = (user as any).permissions;
        token.avatar = (user as any).avatar;
      }

      // خزّن مزود الدخول
      if (account?.provider) token.provider = account.provider;

      // لو Google: خزّن البريد/الاسم وجلب بيانات المستخدم من قاعدة البيانات
      if (account?.provider === "google") {
        token.email = (profile as any)?.email || token.email;
        token.name = (profile as any)?.name || token.name;
        token.picture = (profile as any)?.picture;

        // جلب بيانات المستخدم من قاعدة البيانات
        const supabase = getSupabaseClient();
        const { data: dbUser } = await supabase
          .from('admin_users')
          .select('id, role, permissions, username, avatar')
          .ilike('email', (token.email as string)?.toLowerCase() || '')
          .single();

        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.permissions = dbUser.permissions;
          token.username = dbUser.username;
          token.avatar = dbUser.avatar;
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
        (session.user as any).permissions = token.permissions;
        (session.user as any).avatar = token.avatar || token.picture;
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
};
