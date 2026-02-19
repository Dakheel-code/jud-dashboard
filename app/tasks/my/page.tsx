import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const MyTasksClient = dynamic(() => import('./MyTasksClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function MyTasksPage() {
  return <MyTasksClient />;
}