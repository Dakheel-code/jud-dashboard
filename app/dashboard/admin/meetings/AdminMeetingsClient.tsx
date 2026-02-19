'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Meeting {
  id: string;
  employee_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  subject: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  status: string;
  google_meet_link?: string;
  created_at: string;
}

interface Employee { id: string; name: string; email: string; }

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'no_show', label: 'لم يحضر' },
  { value: 'rescheduled', label: 'أُعيد جدولته' },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  no_show: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  rescheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي',
  no_show: 'لم يحضر', rescheduled: 'أُعيد جدولته',
};

export default function AdminMeetingsClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ employee_id: '', status: '', start_date: '', end_date: '' });

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) { const data = await response.json(); setEmployees(data.users || []); }
    } catch (error) { console.error('Error fetching employees:', error); }
  }, []);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (filters.status) params.set('status', filters.status);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      if (filters.employee_id) params.set('employee_id', filters.employee_id);
      const response = await fetch(`/api/admin/meetings/all?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
        setTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (error) { console.error('Error fetching meetings:', error); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleFilterChange = (key: string, value: string) => { setFilters({ ...filters, [key]: value }); setPage(1); };
  const clearFilters = () => { setFilters({ employee_id: '', status: '', start_date: '', end_date: '' }); setPage(1); };
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'غير معروف';

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الاجتماعات</h1>
          <p className="text-purple-400/60 text-sm">عرض وإدارة جميع اجتماعات الموظفين</p>
        </div>
        <Link href="/dashboard/admin/meetings/stats" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center gap-2 w-fit">
          <span>📊</span> الإحصائيات
        </Link>
      </div>

      <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-purple-300 text-sm mb-1">الموظف</label>
            <select value={filters.employee_id} onChange={(e) => handleFilterChange('employee_id', e.target.value)} className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm">
              <option value="">كل الموظفين</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-purple-300 text-sm mb-1">الحالة</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm">
              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-purple-300 text-sm mb-1">من تاريخ</label>
            <input type="date" value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-purple-300 text-sm mb-1">إلى تاريخ</label>
            <input type="date" value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters} className="w-full px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg text-sm transition-all">مسح الفلاتر</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-purple-400/60">لا توجد اجتماعات</p>
        </div>
      ) : (
        <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الموظف</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">العميل</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الموضوع</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الوقت</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                    <td className="px-4 py-3 text-white text-sm">{getEmployeeName(meeting.employee_id)}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm">{meeting.client_name}</div>
                      <div className="text-purple-400/60 text-xs">{meeting.client_email}</div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm max-w-[200px] truncate">{meeting.subject}</td>
                    <td className="px-4 py-3 text-purple-300 text-sm">{formatDate(meeting.start_at)}</td>
                    <td className="px-4 py-3 text-purple-300 text-sm">{formatTime(meeting.start_at)} - {formatTime(meeting.end_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[meeting.status] || ''}`}>{STATUS_LABELS[meeting.status] || meeting.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {meeting.google_meet_link && (
                        <a href={meeting.google_meet_link} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-all" title="انضم للاجتماع">📹</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/30 disabled:opacity-50 text-purple-300 rounded-lg transition-all">السابق</button>
          <span className="text-purple-400 px-4">{page} من {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/30 disabled:opacity-50 text-purple-300 rounded-lg transition-all">التالي</button>
        </div>
      )}
    </div>
  );
}
