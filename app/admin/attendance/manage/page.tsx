'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  work_hours: number | null;
  device_type: string;
  browser: string;
  status: string;
  user?: {
    id: string;
    name: string;
    username: string;
    role: string;
    roles: string[];
  };
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

function AttendanceManageContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [workSettings, setWorkSettings] = useState({
    workStartTime: '09:00',
    workEndTime: '17:00',
    workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    timezone: 'Asia/Riyadh',
    lateThresholdMinutes: 15,
    earlyLeaveThresholdMinutes: 15,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    fetchAllAttendance();
    fetchWorkSettings();
    fetchLeaveRequests();
  }, [selectedDate, selectedMonth, viewMode]);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch('/api/admin/leave-requests?status=pending');
      const data = await response.json();
      setLeaveRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  const handleLeaveRequest = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch('/api/admin/leave-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, status, admin_notes: adminNotes })
      });
      if (response.ok) {
        fetchLeaveRequests();
      }
    } catch (err) {
      console.error('Failed to process leave request:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  const fetchWorkSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/work-hours');
      const data = await response.json();
      if (data.settings) {
        setWorkSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch work settings:', err);
    }
  };

  const saveWorkSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/settings/work-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workSettings)
      });
      if (response.ok) {
        setShowSettingsModal(false);
      }
    } catch (err) {
      console.error('Failed to save work settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchAllAttendance = async () => {
    setLoading(true);
    try {
      const params = viewMode === 'daily' ? `date=${selectedDate}` : `month=${selectedMonth}`;
      const response = await fetch(`/api/admin/attendance?${params}`);
      const data = await response.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile') {
      return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    }
    return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
  };

  // حساب الغياب - نحتاج جلب جميع المستخدمين ومقارنتهم بالحاضرين
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // إحصائيات
  const presentUserIds = new Set(records.map(r => r.user_id));
  const absentUsers = allUsers.filter(u => !presentUserIds.has(u.id));
  
  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: absentUsers.length,
    completed: records.filter(r => r.check_out_time).length,
    totalHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
  };

  // تجميع حسب المستخدم للعرض الشهري
  const groupedByUser = records.reduce((acc, record) => {
    const userName = record.user?.name || 'غير معروف';
    if (!acc[userName]) {
      acc[userName] = {
        user: record.user,
        records: [],
        totalHours: 0,
        daysPresent: 0,
      };
    }
    acc[userName].records.push(record);
    acc[userName].totalHours += record.work_hours || 0;
    acc[userName].daysPresent += 1;
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </div>
          <p className="text-purple-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>إدارة الحضور والانصراف</h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">متابعة حضور وانصراف جميع الموظفين</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-300 rounded-xl border border-orange-500/30 hover:bg-orange-500/30 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ساعات العمل
            </button>
            <Link href="/admin/attendance" className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              تسجيل حضوري
            </Link>
          </div>
        </div>

        {/* Work Hours Info */}
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-xl rounded-2xl p-4 border border-orange-500/20 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-white font-medium">ساعات العمل الرسمية</h3>
                <p className="text-orange-300 text-sm">من {workSettings.workStartTime} إلى {workSettings.workEndTime} (توقيت السعودية)</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-orange-400 font-bold">{workSettings.lateThresholdMinutes} دقيقة</p>
                <p className="text-orange-400/70">سماح التأخير</p>
              </div>
              <div className="text-center">
                <p className="text-orange-400 font-bold">{workSettings.workDays.length} أيام</p>
                <p className="text-orange-400/70">أيام العمل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
                <p className="text-blue-400/70 text-xs">إجمالي السجلات</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.present}</p>
                <p className="text-green-400/70 text-xs">حاضرين</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.absent}</p>
                <p className="text-red-400/70 text-xs">غائبين</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{stats.completed}</p>
                <p className="text-orange-400/70 text-xs">أكملوا اليوم</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400">{stats.totalHours.toFixed(1)}</p>
                <p className="text-cyan-400/70 text-xs">إجمالي الساعات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-xl transition-all ${viewMode === 'daily' ? 'bg-purple-500 text-white' : 'bg-purple-950/40 text-purple-300 border border-purple-500/20'}`}
            >
              يومي
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-xl transition-all ${viewMode === 'monthly' ? 'bg-purple-500 text-white' : 'bg-purple-950/40 text-purple-300 border border-purple-500/20'}`}
            >
              شهري
            </button>
          </div>
          
          {viewMode === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
            />
          )}
        </div>

        {/* Pending Leave Requests Section */}
        {leaveRequests.length > 0 && (
          <div className="bg-yellow-950/20 backdrop-blur-xl rounded-2xl border border-yellow-500/20 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-yellow-500/20 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                طلبات معلقة ({leaveRequests.length})
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {leaveRequests.map((req) => (
                <div key={req.id} className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {req.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{req.user?.name || 'غير معروف'}</p>
                        <p className="text-yellow-400 text-sm">
                          {req.type === 'leave' ? 'طلب إجازة' : 'طلب استئذان'} - 
                          {req.type === 'leave' 
                            ? ` من ${new Date(req.start_date).toLocaleDateString('ar-SA')} إلى ${new Date(req.end_date).toLocaleDateString('ar-SA')}`
                            : ` ${new Date(req.start_date).toLocaleDateString('ar-SA')} (${req.start_time} - ${req.end_time})`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-purple-300 text-sm max-w-xs">{req.reason}</p>
                      <button
                        onClick={() => handleLeaveRequest(req.id, 'approved')}
                        disabled={processingRequest === req.id}
                        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        موافقة
                      </button>
                      <button
                        onClick={() => handleLeaveRequest(req.id, 'rejected')}
                        disabled={processingRequest === req.id}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        رفض
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Absent Users Section - Only show in daily view */}
        {viewMode === 'daily' && absentUsers.length > 0 && (
          <div className="bg-red-950/20 backdrop-blur-xl rounded-2xl border border-red-500/20 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-red-500/20 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                الموظفين الغائبين ({absentUsers.length})
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {absentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{user.name}</p>
                      <p className="text-red-400/70 text-xs">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">
              {viewMode === 'daily' ? `سجل الحضور - ${new Date(selectedDate).toLocaleDateString('ar-SA')}` : `سجل الحضور - ${selectedMonth}`}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right text-purple-300 font-medium p-4">الموظف</th>
                  <th className="text-right text-purple-300 font-medium p-4">الدور</th>
                  {viewMode === 'daily' ? (
                    <>
                      <th className="text-right text-purple-300 font-medium p-4">وقت الحضور</th>
                      <th className="text-right text-purple-300 font-medium p-4">وقت الانصراف</th>
                      <th className="text-right text-purple-300 font-medium p-4">ساعات العمل</th>
                      <th className="text-right text-purple-300 font-medium p-4">الجهاز</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right text-purple-300 font-medium p-4">أيام الحضور</th>
                      <th className="text-right text-purple-300 font-medium p-4">إجمالي الساعات</th>
                      <th className="text-right text-purple-300 font-medium p-4">متوسط ساعات/يوم</th>
                    </>
                  )}
                  <th className="text-right text-purple-300 font-medium p-4">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === 'daily' ? (
                  records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-purple-400 py-8">لا توجد سجلات لهذا اليوم</td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold">
                              {record.user?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{record.user?.name || 'غير معروف'}</p>
                              <p className="text-purple-400 text-sm">@{record.user?.username || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {ROLE_NAMES[record.user?.role || ''] || record.user?.role || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-green-400">{formatTime(record.check_in_time)}</td>
                        <td className="p-4 text-orange-400">{record.check_out_time ? formatTime(record.check_out_time) : '-'}</td>
                        <td className="p-4 text-cyan-400">{record.work_hours ? `${record.work_hours.toFixed(1)} ساعة` : '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-purple-400">
                            {getDeviceIcon(record.device_type)}
                            <span className="text-sm">{record.device_type === 'mobile' ? 'جوال' : 'كمبيوتر'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${record.check_out_time ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {record.check_out_time ? 'مكتمل' : 'قيد العمل'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  Object.keys(groupedByUser).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-purple-400 py-8">لا توجد سجلات لهذا الشهر</td>
                    </tr>
                  ) : (
                    Object.entries(groupedByUser).map(([userName, data]: [string, any]) => (
                      <tr key={userName} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold">
                              {userName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{userName}</p>
                              <p className="text-purple-400 text-sm">@{data.user?.username || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {ROLE_NAMES[data.user?.role || ''] || data.user?.role || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-green-400 font-bold">{data.daysPresent} يوم</td>
                        <td className="p-4 text-cyan-400 font-bold">{data.totalHours.toFixed(1)} ساعة</td>
                        <td className="p-4 text-purple-400">{data.daysPresent > 0 ? (data.totalHours / data.daysPresent).toFixed(1) : 0} ساعة</td>
                        <td className="p-4">
                          <Link href={`/admin/users/${data.user?.id}`} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30 transition-all">
                            عرض التفاصيل
                          </Link>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Work Hours Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">إعدادات ساعات العمل</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-purple-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Work Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-2">بداية الدوام</label>
                  <input
                    type="time"
                    value={workSettings.workStartTime}
                    onChange={(e) => setWorkSettings({...workSettings, workStartTime: e.target.value})}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-2">نهاية الدوام</label>
                  <input
                    type="time"
                    value={workSettings.workEndTime}
                    onChange={(e) => setWorkSettings({...workSettings, workEndTime: e.target.value})}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-2">سماح التأخير (دقيقة)</label>
                  <input
                    type="number"
                    value={workSettings.lateThresholdMinutes}
                    onChange={(e) => setWorkSettings({...workSettings, lateThresholdMinutes: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-2">سماح الخروج المبكر (دقيقة)</label>
                  <input
                    type="number"
                    value={workSettings.earlyLeaveThresholdMinutes}
                    onChange={(e) => setWorkSettings({...workSettings, earlyLeaveThresholdMinutes: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    min="0"
                  />
                </div>
              </div>

              {/* Work Days */}
              <div>
                <label className="block text-sm text-purple-300 mb-3">أيام العمل</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'sunday', label: 'الأحد' },
                    { value: 'monday', label: 'الإثنين' },
                    { value: 'tuesday', label: 'الثلاثاء' },
                    { value: 'wednesday', label: 'الأربعاء' },
                    { value: 'thursday', label: 'الخميس' },
                    { value: 'friday', label: 'الجمعة' },
                    { value: 'saturday', label: 'السبت' },
                  ].map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const days = workSettings.workDays.includes(day.value)
                          ? workSettings.workDays.filter(d => d !== day.value)
                          : [...workSettings.workDays, day.value];
                        setWorkSettings({...workSettings, workDays: days});
                      }}
                      className={`p-2 rounded-lg text-sm transition-all ${
                        workSettings.workDays.includes(day.value)
                          ? 'bg-green-500/30 border-green-500/50 text-green-400 border'
                          : 'bg-purple-900/30 border-purple-500/20 text-purple-300 border hover:bg-purple-900/50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">المنطقة الزمنية</label>
                <select
                  value={workSettings.timezone}
                  onChange={(e) => setWorkSettings({...workSettings, timezone: e.target.value})}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="Asia/Riyadh">توقيت السعودية (الرياض)</option>
                  <option value="Asia/Dubai">توقيت الإمارات (دبي)</option>
                  <option value="Asia/Kuwait">توقيت الكويت</option>
                  <option value="Africa/Cairo">توقيت مصر (القاهرة)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveWorkSettings}
                  disabled={savingSettings}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50"
                >
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceManagePage() {
  return (
    <AdminAuth>
      <AttendanceManageContent />
    </AdminAuth>
  );
}
