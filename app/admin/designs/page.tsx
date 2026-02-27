import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const DesignsClient = dynamic(() => import('./DesignsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function DesignsPage() {
  return <DesignsClient />;
}
