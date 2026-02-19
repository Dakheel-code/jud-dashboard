import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const IntegrationsClient = dynamic(() => import('./IntegrationsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}