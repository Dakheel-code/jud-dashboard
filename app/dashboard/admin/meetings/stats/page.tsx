import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const MeetingStatsClient = dynamic(() => import('./MeetingStatsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function MeetingStatsPage() {
  return <MeetingStatsClient />;
}