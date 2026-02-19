import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AdminDashboardPage() {
  return <DashboardClient />;
}