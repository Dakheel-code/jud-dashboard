'use client';

import { useEffect, useRef } from 'react';

interface ActivityTrackerProps {
  userId?: string;
}

export default function ActivityTracker({ userId }: ActivityTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId) return;

    // تسجيل بداية الجلسة
    startTimeRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();

    // إرسال heartbeat كل 60 ثانية
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const sessionDuration = Math.floor((now - lastHeartbeatRef.current) / 1000);
      
      if (sessionDuration >= 30) { // فقط إذا مر 30 ثانية على الأقل
        sendHeartbeat(sessionDuration);
        lastHeartbeatRef.current = now;
      }
    }, 60000); // كل دقيقة

    // إرسال heartbeat عند مغادرة الصفحة
    const handleBeforeUnload = () => {
      const sessionDuration = Math.floor((Date.now() - lastHeartbeatRef.current) / 1000);
      if (sessionDuration >= 10) {
        // استخدام sendBeacon للإرسال قبل إغلاق الصفحة
        navigator.sendBeacon('/api/admin/activity', JSON.stringify({
          session_duration_seconds: sessionDuration,
          type: 'heartbeat'
        }));
      }
    };

    // تتبع النشاط (عند التفاعل مع الصفحة)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // المستخدم غادر الصفحة
        const sessionDuration = Math.floor((Date.now() - lastHeartbeatRef.current) / 1000);
        if (sessionDuration >= 10) {
          sendHeartbeat(sessionDuration);
          lastHeartbeatRef.current = Date.now();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // إرسال heartbeat نهائي عند unmount
      const sessionDuration = Math.floor((Date.now() - lastHeartbeatRef.current) / 1000);
      if (sessionDuration >= 10) {
        sendHeartbeat(sessionDuration);
      }
    };
  }, [userId]);

  const sendHeartbeat = async (seconds: number) => {
    try {
      await fetch('/api/admin/activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_duration_seconds: seconds })
      });
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  };

  return null; // هذا component غير مرئي
}

// دالة مساعدة لتسجيل النشاطات
export async function logActivity(
  action_type: 'create' | 'update' | 'delete' | 'complete_task' | 'view',
  entity_type: 'store' | 'task' | 'user' | 'campaign' | 'setting' | 'client',
  action_description: string,
  entity_id?: string
) {
  try {
    await fetch('/api/admin/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type,
        entity_type,
        action_description,
        entity_id
      })
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
