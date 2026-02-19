import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AttendanceManageClient = dynamic(() => import('./AttendanceManageClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AttendanceManagePage() {
  return <AttendanceManageClient />;
}