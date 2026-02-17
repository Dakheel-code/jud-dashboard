import dynamic from 'next/dynamic';

const AttendanceManageClient = dynamic(() => import('./AttendanceManageClient'), { ssr: false });

export default function AttendanceManagePage() {
  return <AttendanceManageClient />;
}
