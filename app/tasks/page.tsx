import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const TasksClient = dynamic(() => import('./TasksClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function TasksPage() {
  return <TasksClient />;
}