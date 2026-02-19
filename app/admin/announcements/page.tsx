import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AnnouncementsAdminClient = dynamic(() => import('./AnnouncementsAdminClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AnnouncementsAdminPage() {
  return <AnnouncementsAdminClient />;
}