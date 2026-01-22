import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}

const handler = NextAuth({
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
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim()?.toLowerCase();
        const password = credentials?.password;

        if (!username || !password) return null;

        // بيانات افتراضية للمسؤول
        if (username === 'admin' && password === 'admin123') {
          return {
            id: 'default-admin',
            name: 'المسؤول الرئيسي',
            email: 'admin@jud.sa',
            role: 'super_admin',
          };
        }

        // البحث في قاعدة البيانات
        const supabase = getSupabaseClient();
        const passwordHash = hashPassword(password);

        const { data: user, error } = await supabase
          .from('admin_users')
          .select('*')
          .ilike('username', username)
          .eq('is_active', true)
          .single();

        if (error || !user) return null;

        if (user.password_hash !== passwordHash) return null;

        // تحديث آخر تسجيل دخول
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email || `${user.username}@jud.sa`,
          role: user.role,
          username: user.username,
          avatar: user.avatar,
          permissions: user.permissions,
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
        
        const { data: existingUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', email)
          .single();

        if (!existingUser) {
          // إنشاء مستخدم جديد
          const userName = (profile as any)?.name || user?.name || email.split('@')[0];
          const userAvatar = (profile as any)?.picture || user?.image;
          const username = email.split('@')[0];
          
          console.log('Creating new Google user:', { email, userName, username, userAvatar });
          
          const { data: newUser, error: insertError } = await supabase.from('admin_users').insert({
            email: email,
            name: userName,
            username: username,
            role: 'user',
            roles: ['user'],
            is_active: true,
            provider: 'google',
            avatar: userAvatar,
            permissions: ['view_tasks'],
            created_at: new Date().toISOString(),
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
              avatar: userAvatar,
              name: userName || undefined,
            })
            .eq('email', email);
            
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
          .select('id, role, permissions, username')
          .eq('email', token.email)
          .single();

        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.permissions = dbUser.permissions;
          token.username = dbUser.username;
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
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});

export { handler as GET, handler as POST };
