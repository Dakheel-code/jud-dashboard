import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AdminMeetingsClient = dynamic(() => import('./AdminMeetingsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AdminMeetingsPage() {
  return <AdminMeetingsClient />;
}