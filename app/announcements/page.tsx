import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AnnouncementsClient = dynamic(() => import('./AnnouncementsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AnnouncementsPage() {
  return <AnnouncementsClient />;
}