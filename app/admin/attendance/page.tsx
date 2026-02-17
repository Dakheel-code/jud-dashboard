import dynamic from 'next/dynamic';

const AttendanceClient = dynamic(() => import('./AttendanceClient'), { ssr: false });

export default function AttendancePage() {
  return <AttendanceClient />;
}
