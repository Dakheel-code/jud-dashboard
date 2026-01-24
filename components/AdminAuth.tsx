'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ActivityTracker from './ActivityTracker';

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    checkAuth();
  }, [session, status]);

  // Heartbeat: تحديث last_login كل 30 ثانية لعرض حالة الاتصال بشكل لحظي
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        // تجاهل الأخطاء
      }
    };
    
    // إرسال heartbeat فوراً
    sendHeartbeat();
    
    // إرسال heartbeat كل 30 ثانية
    const interval = setInterval(sendHeartbeat, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, userId]);

  const checkAuth = async () => {
    // انتظر حتى يتم تحميل حالة الجلسة
    if (status === 'loading') {
      return;
    }

    // التحقق من NextAuth session أولاً (تسجيل الدخول عبر Google)
    if (session?.user) {
      setIsAuthenticated(true);
      setUserId((session.user as any).id || null);
      return;
    }

    // التحقق من legacy token (تسجيل الدخول بالبريد)
    const token = localStorage.getItem('admin_token');
    
    // إذا لم يوجد أي نوع من التوثيق، توجه لصفحة تسجيل الدخول
    if (!token) {
      setIsAuthenticated(false);
      router.push('/admin/login');
      return;
    }

    // إذا وجد token، اعتبره مسجل دخول مباشرة
    // التحقق من الـ API يتم في الخلفية
    setIsAuthenticated(true);
    
    // جلب userId من localStorage
    try {
      const adminUserStr = localStorage.getItem('admin_user');
      if (adminUserStr) {
        const adminUser = JSON.parse(adminUserStr);
        setUserId(adminUser.id);
      }
    } catch (e) {
      console.error('Error parsing admin user:', e);
    }

    // تحقق في الخلفية (اختياري)
    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setIsAuthenticated(false);
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // نبقي المستخدم مسجل دخول حتى لو فشل التحقق
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-purple-300">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ActivityTracker userId={userId || undefined} />
      {children}
    </>
  );
}
