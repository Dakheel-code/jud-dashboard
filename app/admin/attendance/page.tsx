import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AttendanceClient = dynamic(() => import('./AttendanceClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AttendancePage() {
  return <AttendanceClient />;
}