'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StoreFavicon from '@/components/StoreFavicon';

interface UserStats {
  total_stores: number;
  completed_stores: number;
  in_progress_stores: number;
  average_completion: number;
  total_tasks_completed: number;
  total_tasks: number;
}

interface Store {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  completion_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  created_at: string;
  status?: string;
  priority?: string;
}

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  avatar?: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  last_seen_at?: string;
}

interface AttendanceStats {
  present_days: number;
  absent_days: number;
  late_days: number;
  total_work_hours: number;
  avg_check_in: string | null;
  avg_check_out: string | null;
}

interface TeamMemberKpi {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role: string;
  last_seen_at?: string;
  kpi: { open: number; overdue: number; done_month: number };
}

interface LogEntry {
  id: string;
  type: 'task_action' | 'reassign';
  action: string;
  details: any;
  task_title: string;
  created_at: string;
}

interface ChartData {
  daily14: { date: string; count: number }[];
  monthly: { this_month: number; last_month: number; growth_pct: number };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  store?: { id: string; store_name: string; store_url: string };
}

interface KpiData {
  open: number;
  overdue: number;
  due_soon: number;
  completed_this_month: number;
  avg_closing_days: number;
  commitment_rate: number;
  workload_score: number;
  monthly_goal: number;
}

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'المسؤول الرئيسي',
  admin: 'المسؤول',
  team_leader: 'قائد فريق',
  account_manager: 'مدير حساب',
  media_buyer: 'ميديا باير',
  programmer: 'مبرمج',
  designer: 'مصمم',
  web_developer: 'مطور ويب',
};

// دالة لتنظيف رابط المتجر
const cleanStoreUrl = (url: string) => {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  admin: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  team_leader: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  account_manager: 'bg-green-500/20 text-green-300 border-green-500/30',
  media_buyer: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  programmer: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  designer: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  web_developer: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

function UserDetailsContent() {
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [taskTab, setTaskTab] = useState<'today' | 'top3' | 'all'>('top3');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [closingNote, setClosingNote] = useState<{ taskId: string; note: string } | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);

  // تبويب المدير
  const [managerTab, setManagerTab] = useState<'team' | 'logs'>('team');
  const [teamData, setTeamData] = useState<{ team: any; members: TeamMemberKpi[] } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // إحصائيات النشاط
  const [activityStats, setActivityStats] = useState({
    browsing: { total_hours_30_days: 0, sessions_count: 0 },
    activity: { total_actions: 0, creates: 0, updates: 0, deletes: 0, task_completions: 0 }
  });

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchActivityStats();
      fetchKpi();
      fetchTasks('top3');
      fetchCharts();
      fetchTeam();
      fetchAttendanceStats();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchTasks(taskTab);
  }, [taskTab]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        setStores(data.stores || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity`);
      const data = await response.json();
      setActivityStats(data);
    } catch (err) {
      console.error('Failed to fetch activity stats:', err);
    }
  };

  const fetchKpi = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/kpi`);
      if (res.ok) {
        const data = await res.json();
        setKpi(data);
      }
    } catch {}
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/team`);
      if (res.ok) setTeamData(await res.json());
    } catch {}
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/logs`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch {}
    finally { setLoadingLogs(false); }
  };

  const doBulkReassign = async () => {
    if (!bulkFrom || !bulkTo || bulkFrom === bulkTo) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/bulk-reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: bulkFrom, toUserId: bulkTo }),
      });
      const d = await res.json();
      if (res.ok) {
        setBulkResult(`✅ تم نقل ${d.reassigned} مهمة بنجاح`);
        fetchTeam();
        fetchKpi();
      } else {
        setBulkResult(`❌ ${d.error}`);
      }
    } catch { setBulkResult('❌ حدث خطأ'); }
    finally { setBulkLoading(false); }
  };

  const fetchAttendanceStats = async () => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/admin/attendance?user_id=${userId}&month=${month}`);
      if (!res.ok) return;
      const data = await res.json();
      const records: any[] = data.records || [];
      const present = records.filter(r => r.status === 'present').length;
      const late = records.filter(r => r.is_late).length;
      const totalHours = records.reduce((s, r) => s + (r.work_hours || 0), 0);
      // حساب متوسط وقت الحضور والانصراف
      const checkIns = records.filter(r => r.check_in_time).map(r => new Date(r.check_in_time).getHours() * 60 + new Date(r.check_in_time).getMinutes());
      const checkOuts = records.filter(r => r.check_out_time).map(r => new Date(r.check_out_time).getHours() * 60 + new Date(r.check_out_time).getMinutes());
      const avgIn = checkIns.length ? Math.round(checkIns.reduce((a, b) => a + b, 0) / checkIns.length) : null;
      const avgOut = checkOuts.length ? Math.round(checkOuts.reduce((a, b) => a + b, 0) / checkOuts.length) : null;
      const fmtTime = (mins: number | null) => mins === null ? null : `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      // أيام العمل في الشهر الحالي حتى اليوم
      const daysInMonth = now.getDate();
      const workDays = Math.ceil(daysInMonth * 5 / 7); // تقريب
      setAttendanceStats({
        present_days: present,
        absent_days: Math.max(0, workDays - present),
        late_days: late,
        total_work_hours: Math.round(totalHours * 10) / 10,
        avg_check_in: fmtTime(avgIn),
        avg_check_out: fmtTime(avgOut),
      });
    } catch {}
  };

  const fetchCharts = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/charts`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch {}
  };

  const fetchTasks = async (filter: string) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tasks?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {}
    finally { setLoadingTasks(false); }
  };

  const updateTaskStatus = async (taskId: string, status: string, note?: string) => {
    setUpdatingTask(taskId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, closing_note: note }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
        setClosingNote(null);
        fetchKpi();
      }
    } catch {}
    finally { setUpdatingTask(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] relative">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-900/40 animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-48 rounded-lg bg-purple-900/40 animate-pulse" />
                <div className="h-4 w-32 rounded-lg bg-purple-900/30 animate-pulse" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 animate-pulse" />
          </div>
          {/* KPI Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-purple-900/30 animate-pulse" />
            ))}
          </div>
          {/* Performance Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-purple-900/30 animate-pulse" />
            ))}
          </div>
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-48 rounded-2xl bg-purple-900/30 animate-pulse" />
            <div className="h-48 rounded-2xl bg-purple-900/30 animate-pulse" />
          </div>
          {/* Tasks Skeleton */}
          <div className="rounded-2xl bg-purple-900/30 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">المستخدم غير موجود</p>
          <Link href="/admin/users" className="text-purple-400 hover:text-purple-300">
            العودة لقائمة المستخدمين
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* ═══ 1. HEADER ═══ */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden border-2 border-purple-500/40">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>{user.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-purple-400 text-sm">@{user.username}</span>
                {user.email && <span className="text-purple-500/60 text-sm hidden sm:inline">• {user.email}</span>}
                {(user.roles || [user.role]).map((role) => (
                  <span key={role} className={`px-2 py-0.5 rounded-full text-xs border ${ROLE_COLORS[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                    {ROLE_NAMES[role] || role}
                  </span>
                ))}
                <span className={`flex items-center gap-1 text-xs ${user.last_seen_at && (Date.now() - new Date(user.last_seen_at).getTime()) < 120000 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.last_seen_at && (Date.now() - new Date(user.last_seen_at).getTime()) < 120000 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                  {user.last_seen_at && (Date.now() - new Date(user.last_seen_at).getTime()) < 120000 ? 'متصل الآن' : 'غير متصل'}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all shrink-0"
            title="العودة"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {/* ═══ 2. معلومات المستخدم ═══ */}
        <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 mb-6">
          <h2 className="text-sm font-semibold text-purple-300/70 uppercase tracking-wider mb-4">معلومات المستخدم</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-purple-400/60 text-xs mb-1">البريد الإلكتروني</p>
              <p className="text-white text-sm truncate">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-purple-400/60 text-xs mb-1">رقم الجوال</p>
              <p className="text-white text-sm font-mono">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-purple-400/60 text-xs mb-1">الحالة</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {user.is_active ? 'نشط' : 'معطل'}
              </span>
            </div>
            <div>
              <p className="text-purple-400/60 text-xs mb-1">تاريخ الإنشاء</p>
              <p className="text-white text-sm">{new Date(user.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
            <div>
              <p className="text-purple-400/60 text-xs mb-1">آخر دخول</p>
              <p className="text-white text-sm">
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString('ar-SA') + ' ' + new Date(user.last_login).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                  : 'لم يسجل دخول'}
              </p>
            </div>
            <div>
              <p className="text-purple-400/60 text-xs mb-1">آخر نشاط</p>
              <p className="text-white text-sm">
                {user.last_seen_at
                  ? new Date(user.last_seen_at).toLocaleDateString('ar-SA') + ' ' + new Date(user.last_seen_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ 3. إحصائيات الحضور والانصراف ═══ */}
        {attendanceStats && (
          <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-purple-300/70 uppercase tracking-wider">الحضور والانصراف — هذا الشهر</h2>
              <a href="/admin/attendance" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">عرض التفاصيل ←</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-green-400/70 text-xs">أيام الحضور</p>
                </div>
                <p className="text-2xl font-bold text-green-400">{attendanceStats.present_days}</p>
                <p className="text-green-400/50 text-xs mt-1">يوم</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <p className="text-red-400/70 text-xs">أيام الغياب</p>
                </div>
                <p className="text-2xl font-bold text-red-400">{attendanceStats.absent_days}</p>
                <p className="text-red-400/50 text-xs mt-1">يوم</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <p className="text-yellow-400/70 text-xs">أيام التأخير</p>
                </div>
                <p className="text-2xl font-bold text-yellow-400">{attendanceStats.late_days}</p>
                <p className="text-yellow-400/50 text-xs mt-1">يوم</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <p className="text-blue-400/70 text-xs">إجمالي ساعات العمل</p>
                </div>
                <p className="text-2xl font-bold text-blue-400">{attendanceStats.total_work_hours}</p>
                <p className="text-blue-400/50 text-xs mt-1">ساعة</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <p className="text-purple-400/70 text-xs">متوسط وقت الحضور</p>
                </div>
                <p className="text-xl font-bold text-purple-400 font-mono">{attendanceStats.avg_check_in || '--:--'}</p>
                <p className="text-purple-400/50 text-xs mt-1">صباحاً</p>
              </div>
              <div className="bg-fuchsia-500/10 rounded-xl p-3 border border-fuchsia-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                  <p className="text-fuchsia-400/70 text-xs">متوسط وقت الانصراف</p>
                </div>
                <p className="text-xl font-bold text-fuchsia-400 font-mono">{attendanceStats.avg_check_out || '--:--'}</p>
                <p className="text-fuchsia-400/50 text-xs mt-1">مساءً</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-900/10 rounded-2xl p-4 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{kpi.open}</p>
                  <p className="text-blue-400/70 text-xs">مهام مفتوحة</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-900/10 rounded-2xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{kpi.overdue}</p>
                  <p className="text-red-400/70 text-xs">مهام متأخرة</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-900/10 rounded-2xl p-4 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{kpi.completed_this_month}</p>
                  <p className="text-green-400/70 text-xs">مكتملة هذا الشهر</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-900/10 rounded-2xl p-4 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{kpi.avg_closing_days}<span className="text-sm font-normal mr-1">يوم</span></p>
                  <p className="text-purple-400/70 text-xs">متوسط وقت الإغلاق</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* مؤشرات الأداء */}
        {kpi && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            {/* الالتزام */}
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-purple-300">معدل الالتزام</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  kpi.commitment_rate >= 80 ? 'bg-green-500/20 text-green-400' :
                  kpi.commitment_rate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {kpi.commitment_rate >= 80 ? '✅ ممتاز' : kpi.commitment_rate >= 50 ? '⚠️ مقبول' : '❌ يحتاج تحسين'}
                </span>
              </div>
              <p className="text-4xl font-bold text-white mb-3">{kpi.commitment_rate}<span className="text-lg text-purple-400">%</span></p>
              <div className="w-full bg-purple-900/40 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    kpi.commitment_rate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    kpi.commitment_rate >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-rose-400'
                  }`}
                  style={{ width: `${kpi.commitment_rate}%` }}
                />
              </div>
              <p className="text-purple-400/60 text-xs mt-2">مهام مكتملة قبل الموعد</p>
            </div>

            {/* Workload Meter */}
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-purple-300">ضغط العمل</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  kpi.workload_score <= 40 ? 'bg-green-500/20 text-green-400' :
                  kpi.workload_score <= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {kpi.workload_score <= 40 ? 'مريح' : kpi.workload_score <= 70 ? 'متوسط' : 'ضغط عالي'}
                </span>
              </div>
              <p className="text-4xl font-bold text-white mb-3">{kpi.workload_score}<span className="text-lg text-purple-400">%</span></p>
              <div className="w-full bg-purple-900/40 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    kpi.workload_score <= 40 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    kpi.workload_score <= 70 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-rose-400'
                  }`}
                  style={{ width: `${kpi.workload_score}%` }}
                />
              </div>
              <p className="text-purple-400/60 text-xs mt-2">مفتوحة {kpi.open} • متأخرة {kpi.overdue} • تستحق قريباً {kpi.due_soon}</p>
            </div>

            {/* الهدف الشهري */}
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-purple-300">الهدف الشهري</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  kpi.completed_this_month >= kpi.monthly_goal ? 'bg-green-500/20 text-green-400' :
                  kpi.completed_this_month >= kpi.monthly_goal * 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {kpi.completed_this_month >= kpi.monthly_goal ? '✅ تحقق' : `${Math.round((kpi.completed_this_month / kpi.monthly_goal) * 100)}%`}
                </span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <p className="text-4xl font-bold text-white">{kpi.completed_this_month}</p>
                <p className="text-purple-400 text-lg mb-1">/ {kpi.monthly_goal}</p>
              </div>
              <div className="w-full bg-purple-900/40 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-400 transition-all"
                  style={{ width: `${Math.min(100, Math.round((kpi.completed_this_month / kpi.monthly_goal) * 100))}%` }}
                />
              </div>
              <p className="text-purple-400/60 text-xs mt-2">مهمة مكتملة هذا الشهر</p>
            </div>

          </div>
        )}

        {/* الرسوم البيانية */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Bar Chart — آخر 14 يوم */}
            <div className="lg:col-span-2 bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-purple-300">المهام المكتملة — آخر 14 يوم</p>
                <span className="text-xs text-purple-500">
                  إجمالي: {chartData.daily14.reduce((s, d) => s + d.count, 0)}
                </span>
              </div>
              {(() => {
                const maxVal = Math.max(...chartData.daily14.map(d => d.count), 1);
                return (
                  <div className="flex items-end gap-1 h-28">
                    {chartData.daily14.map((d, i) => {
                      const heightPct = Math.round((d.count / maxVal) * 100);
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('ar-SA', { day: 'numeric', month: 'numeric' });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          {d.count > 0 && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-purple-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {d.count}
                            </span>
                          )}
                          <div className="w-full flex items-end" style={{ height: '88px' }}>
                            <div
                              className={`w-full rounded-t transition-all ${
                                isToday ? 'bg-fuchsia-500' : d.count > 0 ? 'bg-purple-500' : 'bg-purple-900/40'
                              }`}
                              style={{ height: `${Math.max(heightPct, d.count > 0 ? 8 : 4)}%` }}
                            />
                          </div>
                          <span className={`text-[9px] ${isToday ? 'text-fuchsia-400' : 'text-purple-600'}`}>
                            {i % 2 === 0 ? dayLabel : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* مقارنة شهرية */}
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between">
              <p className="text-sm font-medium text-purple-300 mb-4">مقارنة شهرية</p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-400">هذا الشهر</span>
                    <span className="text-white font-bold">{chartData.monthly.this_month}</span>
                  </div>
                  <div className="w-full bg-purple-900/40 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-400"
                      style={{ width: `${Math.min(100, chartData.monthly.this_month / Math.max(chartData.monthly.last_month, chartData.monthly.this_month, 1) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-400">الشهر الماضي</span>
                    <span className="text-white font-bold">{chartData.monthly.last_month}</span>
                  </div>
                  <div className="w-full bg-purple-900/40 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-purple-600/60"
                      style={{ width: `${Math.min(100, chartData.monthly.last_month / Math.max(chartData.monthly.last_month, chartData.monthly.this_month, 1) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className={`mt-4 text-center py-2 rounded-xl text-sm font-bold ${
                chartData.monthly.growth_pct > 0 ? 'bg-green-500/20 text-green-400' :
                chartData.monthly.growth_pct < 0 ? 'bg-red-500/20 text-red-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {chartData.monthly.growth_pct > 0 ? '↑' : chartData.monthly.growth_pct < 0 ? '↓' : '='}{' '}
                {Math.abs(chartData.monthly.growth_pct)}%
                {chartData.monthly.growth_pct > 0 ? ' تحسن' : chartData.monthly.growth_pct < 0 ? ' تراجع' : ' ثابت'}
              </div>
            </div>

          </div>
        )}

        {/* تبويبات المهام */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 mb-6 overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center gap-1 p-3 border-b border-purple-500/20">
            {([
              { key: 'top3', label: '🔥 أولويات', desc: 'Top 3 عاجلة' },
              { key: 'today', label: '📅 اليوم', desc: 'مهام اليوم' },
              { key: 'all', label: '📋 الكل', desc: 'جميع المفتوحة' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setTaskTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  taskTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-400 hover:bg-purple-500/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <span className="mr-auto text-purple-500 text-xs">{tasks.length} مهمة</span>
          </div>

          {/* Tasks List */}
          <div className="divide-y divide-purple-500/10">
            {loadingTasks ? (
              <div className="p-8 text-center text-purple-400 text-sm">جاري التحميل...</div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-purple-500 text-sm">
                {taskTab === 'today' ? 'لا توجد مهام لهذا اليوم' : 'لا توجد مهام مفتوحة'}
              </div>
            ) : tasks.map(task => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
              const priorityColors: Record<string, string> = {
                critical: 'bg-red-500/20 text-red-400 border-red-500/30',
                high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
                medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
              };
              const priorityLabels: Record<string, string> = {
                critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض',
              };
              const statusColors: Record<string, string> = {
                pending:     'bg-gray-500/20 text-gray-400',
                in_progress: 'bg-blue-500/20 text-blue-400',
                waiting:     'bg-yellow-500/20 text-yellow-400',
                blocked:     'bg-red-500/20 text-red-400',
              };
              const statusLabels: Record<string, string> = {
                pending: 'معلق', in_progress: 'جاري', waiting: 'انتظار', blocked: 'محظور',
              };

              return (
                <div key={task.id} className="p-4 hover:bg-purple-900/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority] || priorityColors.medium}`}>
                          {priorityLabels[task.priority] || task.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status] || 'bg-purple-500/20 text-purple-400'}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                        {isOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">⚠️ متأخرة</span>
                        )}
                        {task.store && (
                          <span className="text-xs text-purple-500 truncate">{task.store.store_name || task.store.store_url}</span>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-purple-400/60'}`}>
                          الموعد: {new Date(task.due_date).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                    </div>

                    {/* أزرار سريعة */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status !== 'in_progress' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          disabled={updatingTask === task.id}
                          className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all disabled:opacity-50"
                        >
                          {updatingTask === task.id ? '...' : 'جاري'}
                        </button>
                      )}
                      <button
                        onClick={() => setClosingNote({ taskId: task.id, note: '' })}
                        disabled={updatingTask === task.id}
                        className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                      >
                        ✓ إغلاق
                      </button>
                    </div>
                  </div>

                  {/* ملاحظة الإغلاق */}
                  {closingNote?.taskId === task.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="ملاحظة الإغلاق (اختياري)..."
                        value={closingNote.note}
                        onChange={e => setClosingNote({ ...closingNote, note: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-green-400"
                        onKeyDown={e => e.key === 'Enter' && updateTaskStatus(task.id, 'done', closingNote.note)}
                      />
                      <button
                        onClick={() => updateTaskStatus(task.id, 'done', closingNote.note)}
                        disabled={updatingTask === task.id}
                        className="px-4 py-2 text-sm bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                      >
                        {updatingTask === task.id ? '...' : 'تأكيد'}
                      </button>
                      <button
                        onClick={() => setClosingNote(null)}
                        className="px-3 py-2 text-sm text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* تبويب المدير — يظهر فقط إذا كان المستخدم قائد فريق */}
        {teamData?.team && (
          <div className="bg-purple-950/40 rounded-2xl border border-yellow-500/20 mb-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-yellow-400 font-medium text-sm">{teamData.team.name}</span>
                <span className="text-yellow-500/60 text-xs">— مركز الإدارة</span>
              </div>
              <div className="flex gap-1">
                {(['team', 'logs'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => { setManagerTab(tab); if (tab === 'logs' && logs.length === 0) fetchLogs(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      managerTab === tab ? 'bg-yellow-500/30 text-yellow-300' : 'text-yellow-500 hover:bg-yellow-500/10'
                    }`}
                  >
                    {tab === 'team' ? '👥 الفريق' : '📋 السجلات'}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Tab */}
            {managerTab === 'team' && (
              <div className="p-4 space-y-4">
                {/* أعضاء الفريق + KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamData.members.map(m => {
                    const isOnline = m.last_seen_at && (Date.now() - new Date(m.last_seen_at).getTime()) < 120000;
                    return (
                      <div key={m.id} className="bg-purple-900/20 rounded-xl p-3 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative">
                            {m.avatar
                              ? <img src={m.avatar} className="w-8 h-8 rounded-full object-cover" alt={m.name} />
                              : <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-sm font-bold">{m.name.charAt(0)}</div>
                            }
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a0a2e] ${isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{m.name}</p>
                            <p className="text-purple-400/60 text-xs truncate">@{m.username}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="bg-blue-500/10 rounded-lg py-1">
                            <p className="text-blue-400 font-bold text-sm">{m.kpi.open}</p>
                            <p className="text-blue-400/60 text-[10px]">مفتوحة</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg py-1">
                            <p className="text-red-400 font-bold text-sm">{m.kpi.overdue}</p>
                            <p className="text-red-400/60 text-[10px]">متأخرة</p>
                          </div>
                          <div className="bg-green-500/10 rounded-lg py-1">
                            <p className="text-green-400 font-bold text-sm">{m.kpi.done_month}</p>
                            <p className="text-green-400/60 text-[10px]">هذا الشهر</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Reassign */}
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-orange-400 text-sm font-medium mb-3">نقل مهام جماعي</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select value={bulkFrom} onChange={e => setBulkFrom(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-orange-400 [&>option]:bg-[#1a0a2e]">
                      <option value="">من (العضو)...</option>
                      {teamData.members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.kpi.open} مهمة)</option>)}
                    </select>
                    <select value={bulkTo} onChange={e => setBulkTo(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-purple-900/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-orange-400 [&>option]:bg-[#1a0a2e]">
                      <option value="">إلى (الموظف)...</option>
                      {teamData.members.filter(m => m.id !== bulkFrom).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button onClick={doBulkReassign} disabled={!bulkFrom || !bulkTo || bulkLoading}
                      className="px-4 py-2 text-sm bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-all disabled:opacity-50 whitespace-nowrap">
                      {bulkLoading ? 'جاري...' : 'نقل المهام'}
                    </button>
                  </div>
                  {bulkResult && <p className="text-sm mt-2 text-purple-300">{bulkResult}</p>}
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {managerTab === 'logs' && (
              <div className="divide-y divide-purple-500/10">
                {loadingLogs ? (
                  <div className="p-8 text-center text-purple-400 text-sm">جاري التحميل...</div>
                ) : logs.length === 0 ? (
                  <div className="p-8 text-center text-purple-500 text-sm">لا توجد سجلات</div>
                ) : logs.map(log => {
                  const actionLabels: Record<string, string> = {
                    created: 'أنشأ', updated: 'عدّل', commented: 'علّق على', status_changed: 'غيّر حالة',
                    reassigned: 'أُعيد تعيين', attached: 'أرفق ملف', help_requested: 'طلب مساعدة',
                  };
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-purple-900/10">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        log.type === 'reassign' ? 'bg-orange-400' :
                        log.action === 'status_changed' ? 'bg-green-400' :
                        log.action === 'created' ? 'bg-blue-400' : 'bg-purple-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="text-purple-300">{actionLabels[log.action] || log.action}</span>
                          {' '}مهمة: <span className="text-purple-200 truncate">{log.task_title}</span>
                        </p>
                        {log.type === 'reassign' && log.details && (
                          <p className="text-xs text-orange-400/70 mt-0.5">
                            من {log.details.from} → إلى {log.details.to}
                            {log.details.by ? ` (بواسطة ${log.details.by})` : ''}
                          </p>
                        )}
                        {log.details?.new_status && (
                          <p className="text-xs text-green-400/70 mt-0.5">الحالة: {log.details.new_status}</p>
                        )}
                      </div>
                      <span className="text-xs text-purple-600 shrink-0">
                        {new Date(log.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ 8. إحصائيات المتاجر + النشاط ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* إحصائيات المتاجر */}
          {stats && (
            <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
              <h2 className="text-sm font-semibold text-purple-300/70 uppercase tracking-wider mb-4">إحصائيات المتاجر</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.total_stores}</p>
                  <p className="text-purple-400/60 text-xs mt-1">إجمالي المتاجر</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.completed_stores}</p>
                  <p className="text-purple-400/60 text-xs mt-1">مكتملة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.in_progress_stores}</p>
                  <p className="text-purple-400/60 text-xs mt-1">قيد التنفيذ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.average_completion}%</p>
                  <p className="text-purple-400/60 text-xs mt-1">متوسط الإنجاز</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-fuchsia-400">{stats.total_tasks_completed}</p>
                  <p className="text-purple-400/60 text-xs mt-1">مهام منجزة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{stats.total_tasks}</p>
                  <p className="text-purple-400/60 text-xs mt-1">إجمالي المهام</p>
                </div>
              </div>
            </div>
          )}

          {/* إحصائيات النشاط */}
          <div className="bg-purple-950/40 rounded-2xl p-5 border border-purple-500/20">
            <h2 className="text-sm font-semibold text-purple-300/70 uppercase tracking-wider mb-4">نشاط النظام (30 يوم)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-cyan-500/5 rounded-xl p-3 border border-cyan-500/20">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-cyan-400">{activityStats.browsing?.total_hours_30_days || 0}</p>
                  <p className="text-cyan-400/60 text-xs">ساعات التصفح</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-green-500/5 rounded-xl p-3 border border-green-500/20">
                <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-400">{activityStats.activity?.total_actions || 0}</p>
                  <p className="text-green-400/60 text-xs">إجمالي العمليات</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-purple-500/5 rounded-xl p-3 border border-purple-500/20">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-purple-400">{activityStats.activity?.creates || 0}</p>
                  <p className="text-purple-400/60 text-xs">عمليات الإضافة</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-orange-500/5 rounded-xl p-3 border border-orange-500/20">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-400">{activityStats.activity?.updates || 0}</p>
                  <p className="text-orange-400/60 text-xs">عمليات التعديل</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ═══ 9. المتاجر المسندة ═══ */}
        <div className="bg-purple-950/40  rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">المتاجر المسندة ({stores.length})</h2>
          </div>

          {stores.length === 0 ? (
            <div className="p-8 text-center text-purple-400/60">
              لا توجد متاجر مسندة لهذا المستخدم
            </div>
          ) : (
            <div className="divide-y divide-purple-500/20">
              {stores.map((store) => (
                <div key={store.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Store Logo */}
                      <StoreFavicon storeUrl={store.store_url} alt={store.store_name || store.store_url} size={48} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            href={`/admin/store/${store.id}`}
                            className="text-white font-medium hover:text-fuchsia-400 transition-colors"
                          >
                            {store.store_name || cleanStoreUrl(store.store_url)}
                          </Link>
                          <a 
                            href={store.store_url.startsWith('http') ? store.store_url : `https://${store.store_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-purple-400/50 hover:text-purple-300 transition-colors"
                            title="فتح المتجر"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            store.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            store.status === 'paused' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            store.status === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {store.status === 'active' ? 'نشط' :
                             store.status === 'paused' ? 'متوقف' :
                             store.status === 'expired' ? 'منتهي' : 'جديد'}
                          </span>
                          {/* Priority Badge */}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            store.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            store.priority === 'low' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {store.priority === 'high' ? 'مرتفع' :
                             store.priority === 'low' ? 'منخفض' : 'متوسط'}
                          </span>
                        </div>
                        <p className="text-purple-400/60 text-sm mt-1">
                          {store.owner_name && store.owner_name !== '-' ? `${store.owner_name} • ` : ''}
                          {store.owner_phone || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-purple-400/60 text-xs">المهام</p>
                        <p className="text-white font-medium">{store.completed_tasks}/{store.total_tasks}</p>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-purple-950/50 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                store.completion_percentage === 100 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
                              }`}
                              style={{ width: `${store.completion_percentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium w-10 text-left ${
                            store.completion_percentage === 100 ? 'text-green-400' : 'text-purple-200'
                          }`}>
                            {store.completion_percentage}%
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/admin/store/${store.id}`}
                        className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserDetailsPage() {
  return <UserDetailsContent />;
}
