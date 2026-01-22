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
  device_info: string;
  location: string | null;
  notes: string | null;
  status: string;
}

function AttendanceContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayStatus, setTodayStatus] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'leave' | 'permission'>('leave');
  const [leaveForm, setLeaveForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    reason: '',
    leave_category: 'regular' as 'regular' | 'sick',
    medical_report: null as File | null
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({ total: 21, used: 0, remaining: 21 });

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        // جلب البيانات بعد تعيين المستخدم
        fetchAttendanceWithUser(user.id);
        fetchLeaveRequests(user.id);
        fetchLeaveBalance(user.id);
      } catch (e) {
        console.error('Error parsing user:', e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [selectedMonth]);

  // تحديث الرصيد والطلبات كل 10 ثواني للتحقق من التغييرات
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const interval = setInterval(() => {
      fetchLeaveRequests(currentUser.id);
      fetchLeaveBalance(currentUser.id);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const fetchLeaveRequests = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/leave-requests?user_id=${userId}`);
      const data = await response.json();
      setLeaveRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  const fetchLeaveBalance = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/leave-balance?user_id=${userId}`);
      const data = await response.json();
      if (data.balance) {
        setLeaveBalance(data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
    }
  };

  const handleSubmitLeave = async () => {
    // التحقق من إلزامية التقرير الطبي للإجازة المرضية
    if (leaveType === 'leave' && leaveForm.leave_category === 'sick' && !leaveForm.medical_report) {
      setMessage({ type: 'error', text: 'يجب إرفاق التقرير الطبي للإجازة المرضية' });
      return;
    }

    setSubmittingLeave(true);
    setMessage(null);
    try {
      let medical_report_url = null;

      // رفع التقرير الطبي إذا كان موجوداً
      if (leaveForm.medical_report) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', leaveForm.medical_report);
        formData.append('user_id', currentUser?.id || '');
        
        const uploadResponse = await fetch('/api/admin/upload-file', {
          method: 'POST',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          medical_report_url = uploadData.url;
        } else {
          setMessage({ type: 'error', text: 'فشل في رفع التقرير الطبي' });
          setUploadingFile(false);
          setSubmittingLeave(false);
          return;
        }
        setUploadingFile(false);
      }

      const response = await fetch('/api/admin/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: leaveType,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          start_time: leaveForm.start_time,
          end_time: leaveForm.end_time,
          reason: leaveForm.reason,
          leave_category: leaveForm.leave_category,
          medical_report_url,
          user_id: currentUser?.id
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'تم إرسال الطلب بنجاح' });
        setShowLeaveModal(false);
        setLeaveForm({
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '10:00',
          reason: '',
          leave_category: 'regular',
          medical_report: null
        });
        if (currentUser?.id) fetchLeaveRequests(currentUser.id);
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل في إرسال الطلب' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setSubmittingLeave(false);
    }
  };

  const fetchAttendanceWithUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/attendance?month=${selectedMonth}&user_id=${userId}`);
      const data = await response.json();
      setRecords(data.records || []);
      setTodayStatus(data.todayStatus || null);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setMessage(null);
    
    // الحصول على موقع المستخدم
    const getUserLocation = (): Promise<{latitude: number, longitude: number} | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    };

    try {
      const userLocation = await getUserLocation();
      
      const response = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          device_info: navigator.userAgent,
          user_id: currentUser?.id,
          user_latitude: userLocation?.latitude,
          user_longitude: userLocation?.longitude
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'تم تسجيل الحضور بنجاح' });
        if (currentUser?.id) fetchAttendanceWithUser(currentUser.id);
      } else {
        if (data.requires_location && !userLocation) {
          setMessage({ type: 'error', text: 'يجب تفعيل خدمة الموقع للتسجيل. يرجى السماح بالوصول للموقع وإعادة المحاولة.' });
        } else {
          setMessage({ type: 'error', text: data.error || 'فشل في تسجيل الحضور' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'تم تسجيل الانصراف بنجاح' });
        if (currentUser?.id) fetchAttendanceWithUser(currentUser.id);
      } else {
        setMessage({ type: 'error', text: data.error || 'فشل في تسجيل الانصراف' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile') {
      return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    }
    return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
  };

  const myRecords = records.filter(r => r.user_id === currentUser?.id);
  const totalWorkHours = myRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
  const presentDays = myRecords.filter(r => r.status === 'present').length;

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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>الحضور والانصراف</h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">تسجيل ومتابعة الحضور والانصراف</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setLeaveType('permission'); setShowLeaveModal(true); }}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-xl border border-yellow-500/30 hover:bg-yellow-500/30 transition-all text-sm sm:text-base flex-1 sm:flex-none"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="hidden sm:inline">طلب استئذان</span>
              <span className="sm:hidden">استئذان</span>
            </button>
            <button
              onClick={() => { setLeaveType('leave'); setShowLeaveModal(true); }}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm sm:text-base flex-1 sm:flex-none"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="hidden sm:inline">طلب إجازة</span>
              <span className="sm:hidden">إجازة</span>
            </button>
            <Link href="/admin/attendance/manage" className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all text-sm sm:text-base flex-1 sm:flex-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">إدارة الحضور</span>
              <span className="sm:hidden">إدارة</span>
            </Link>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">حالة اليوم</h2>
              <p className="text-purple-300">{formatDate(new Date().toISOString())}</p>
              {todayStatus ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>وقت الحضور: {formatTime(todayStatus.check_in_time)}</span>
                  </div>
                  {todayStatus.check_out_time ? (
                    <div className="flex items-center gap-2 text-orange-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span>وقت الانصراف: {formatTime(todayStatus.check_out_time)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>لم يتم تسجيل الانصراف بعد</span>
                    </div>
                  )}
                  {todayStatus.device_type && (
                    <div className="flex items-center gap-2 text-purple-400 text-sm">
                      {getDeviceIcon(todayStatus.device_type)}
                      <span>{todayStatus.browser} - {todayStatus.device_type === 'mobile' ? 'جوال' : 'كمبيوتر'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-yellow-400">لم يتم تسجيل الحضور بعد</p>
              )}
            </div>
            <div className="flex gap-3">
              {!todayStatus ? (
                <button onClick={handleCheckIn} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  {actionLoading ? 'جاري التسجيل...' : 'تسجيل حضور'}
                </button>
              ) : !todayStatus.check_out_time ? (
                <button onClick={handleCheckOut} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-400 hover:to-red-400 transition-all disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  {actionLoading ? 'جاري التسجيل...' : 'تسجيل انصراف'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-3 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  تم إكمال اليوم
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{presentDays}</p>
                <p className="text-green-400/70 text-xs">أيام الحضور</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400">{totalWorkHours.toFixed(1)}</p>
                <p className="text-cyan-400/70 text-xs">ساعات العمل</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{presentDays > 0 ? (totalWorkHours / presentDays).toFixed(1) : 0}</p>
                <p className="text-purple-400/70 text-xs">متوسط ساعات/يوم</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{myRecords.filter(r => r.check_out_time).length}</p>
                <p className="text-orange-400/70 text-xs">أيام مكتملة</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <label className="text-purple-300">الشهر:</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400" />
        </div>

        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">سجل الحضور والانصراف</h2>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right text-purple-300 font-medium p-4">التاريخ</th>
                  <th className="text-right text-purple-300 font-medium p-4">وقت الحضور</th>
                  <th className="text-right text-purple-300 font-medium p-4">وقت الانصراف</th>
                  <th className="text-right text-purple-300 font-medium p-4">ساعات العمل</th>
                  <th className="text-right text-purple-300 font-medium p-4">الجهاز</th>
                  <th className="text-right text-purple-300 font-medium p-4">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {myRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-purple-400 py-8">لا توجد سجلات لهذا الشهر</td>
                  </tr>
                ) : (
                  myRecords.map((record) => (
                    <tr key={record.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                      <td className="p-4 text-white">{new Date(record.date).toLocaleDateString('ar-SA')}</td>
                      <td className="p-4 text-green-400">{formatTime(record.check_in_time)}</td>
                      <td className="p-4 text-orange-400">{record.check_out_time ? formatTime(record.check_out_time) : '-'}</td>
                      <td className="p-4 text-cyan-400">{record.work_hours ? `${record.work_hours.toFixed(1)} ساعة` : '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-purple-400">
                          {getDeviceIcon(record.device_type)}
                          <span className="text-sm">{record.browser}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${record.check_out_time ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {record.check_out_time ? 'مكتمل' : 'قيد العمل'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {myRecords.length === 0 ? (
              <div className="text-center text-purple-400 py-8">لا توجد سجلات لهذا الشهر</div>
            ) : (
              myRecords.map((record) => (
                <div key={record.id} className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{new Date(record.date).toLocaleDateString('ar-SA')}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${record.check_out_time ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {record.check_out_time ? 'مكتمل' : 'قيد العمل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-green-400 font-medium">{formatTime(record.check_in_time)}</div>
                      <div className="text-purple-300/50 text-xs">حضور</div>
                    </div>
                    <div>
                      <div className="text-orange-400 font-medium">{record.check_out_time ? formatTime(record.check_out_time) : '-'}</div>
                      <div className="text-purple-300/50 text-xs">انصراف</div>
                    </div>
                    <div>
                      <div className="text-cyan-400 font-medium">{record.work_hours ? `${record.work_hours.toFixed(1)}` : '-'}</div>
                      <div className="text-purple-300/50 text-xs">ساعات</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400 text-xs mt-3 pt-3 border-t border-purple-500/10">
                    {getDeviceIcon(record.device_type)}
                    <span>{record.browser} - {record.device_type === 'mobile' ? 'جوال' : 'كمبيوتر'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leave Requests Section */}
        {leaveRequests.length > 0 && (
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-purple-500/20">
              <h2 className="text-lg font-semibold text-white">طلباتي السابقة</h2>
            </div>
            <div className="p-4 space-y-3">
              {leaveRequests.map((req) => (
                <div key={req.id} className={`p-4 rounded-xl border ${
                  req.status === 'approved' ? 'bg-green-500/10 border-green-500/20' :
                  req.status === 'rejected' ? 'bg-red-500/10 border-red-500/20' :
                  'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        req.type === 'leave' ? 'bg-blue-500/20' : 'bg-yellow-500/20'
                      }`}>
                        {req.type === 'leave' ? (
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{req.type === 'leave' ? 'إجازة' : 'استئذان'}</p>
                        <p className="text-purple-400 text-sm">
                          {req.type === 'leave' 
                            ? `من ${new Date(req.start_date).toLocaleDateString('ar-SA')} إلى ${new Date(req.end_date).toLocaleDateString('ar-SA')}`
                            : `${new Date(req.start_date).toLocaleDateString('ar-SA')} - ${req.start_time} إلى ${req.end_time}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-purple-300 text-sm max-w-xs truncate">{req.reason}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {req.status === 'approved' ? 'موافق عليه' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </span>
                    </div>
                  </div>
                  {req.admin_notes && (
                    <p className="mt-2 text-sm text-purple-400 bg-purple-500/10 p-2 rounded-lg">ملاحظات الإدارة: {req.admin_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leave/Permission Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {leaveType === 'leave' ? 'طلب إجازة' : 'طلب استئذان'}
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-purple-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveType('leave')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    leaveType === 'leave' ? 'bg-blue-500 text-white' : 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                  }`}
                >
                  إجازة
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveType('permission')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    leaveType === 'permission' ? 'bg-yellow-500 text-white' : 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                  }`}
                >
                  استئذان
                </button>
              </div>

              {leaveType === 'leave' ? (
                <>
                  {/* Leave Balance */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">رصيد الإجازات</p>
                          <p className="text-blue-400 text-sm">المتبقي: {leaveBalance.remaining} يوم من {leaveBalance.total}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-400">{leaveBalance.remaining}</p>
                        <p className="text-blue-400/70 text-xs">يوم متبقي</p>
                      </div>
                    </div>
                  </div>

                  {/* Leave Category */}
                  <div>
                    <label className="block text-sm text-purple-300 mb-2">نوع الإجازة</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLeaveForm({...leaveForm, leave_category: 'regular'})}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          leaveForm.leave_category === 'regular' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        إجازة عادية
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveForm({...leaveForm, leave_category: 'sick'})}
                        className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          leaveForm.leave_category === 'sick' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        إجازة مرضية
                      </button>
                    </div>
                  </div>

                  {/* Medical Report Upload - Only for Sick Leave */}
                  {leaveForm.leave_category === 'sick' && (
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">
                        التقرير الطبي <span className="text-red-400">*</span>
                      </label>
                      <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                        leaveForm.medical_report 
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-purple-500/30 bg-purple-900/20 hover:border-purple-400/50'
                      }`}>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setLeaveForm({...leaveForm, medical_report: file});
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {leaveForm.medical_report ? (
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="text-right">
                              <p className="text-green-400 font-medium">{leaveForm.medical_report.name}</p>
                              <p className="text-green-400/70 text-xs">{(leaveForm.medical_report.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeaveForm({...leaveForm, medical_report: null});
                              }}
                              className="ml-2 p-1 bg-red-500/20 rounded-lg hover:bg-red-500/30"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-10 h-10 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="text-purple-300">اضغط لرفع التقرير الطبي</p>
                            <p className="text-purple-400/50 text-xs mt-1">PDF, JPG, PNG - حد أقصى 5MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">من تاريخ</label>
                      <input
                        type="date"
                        value={leaveForm.start_date}
                        onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">إلى تاريخ</label>
                      <input
                        type="date"
                        value={leaveForm.end_date}
                        onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                  
                  {/* عداد أيام الإجازة */}
                  {leaveForm.start_date && leaveForm.end_date && (
                    <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 text-center">
                      <p className="text-purple-300 text-sm">مدة الإجازة</p>
                      <p className="text-2xl font-bold text-white">
                        {(() => {
                          const start = new Date(leaveForm.start_date);
                          const end = new Date(leaveForm.end_date);
                          const diffTime = end.getTime() - start.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return diffDays > 0 ? diffDays : 1;
                        })()}
                        <span className="text-sm text-purple-400 mr-1">يوم</span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-purple-300 mb-2">التاريخ</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                      className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">من الساعة</label>
                      <input
                        type="time"
                        value={leaveForm.start_time}
                        onChange={(e) => setLeaveForm({...leaveForm, start_time: e.target.value})}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-purple-300 mb-2">إلى الساعة</label>
                      <input
                        type="time"
                        value={leaveForm.end_time}
                        onChange={(e) => setLeaveForm({...leaveForm, end_time: e.target.value})}
                        className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-purple-300 mb-2">السبب</label>
                <textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  placeholder={leaveType === 'leave' ? 'اكتب سبب الإجازة...' : 'اكتب سبب الاستئذان...'}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmitLeave}
                  disabled={submittingLeave}
                  className={`flex-1 py-3 font-medium rounded-xl transition-all disabled:opacity-50 ${
                    leaveType === 'leave' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400'
                  }`}
                >
                  {submittingLeave ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
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

export default function AttendancePage() {
  return (
    <AdminAuth>
      <AttendanceContent />
    </AdminAuth>
  );
}
