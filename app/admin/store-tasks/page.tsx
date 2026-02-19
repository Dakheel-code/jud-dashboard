import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const StoreTasksClient = dynamic(() => import('./StoreTasksClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function StoreTasksPage() {
  return <StoreTasksClient />;
}