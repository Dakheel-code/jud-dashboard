import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const ClientsClient = dynamic(() => import('./ClientsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function ClientsPage() {
  return <ClientsClient />;
}