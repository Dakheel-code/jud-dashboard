import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const AdsClient = dynamic(() => import('./AdsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function AdsPage() {
  return <AdsClient />;
}
