import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const SnapchatSelectClient = dynamic(() => import('./SnapchatSelectClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function SnapchatSelectAccountPage() {
  return <SnapchatSelectClient />;
}