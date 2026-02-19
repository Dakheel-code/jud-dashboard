import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const TaskDetailClient = dynamic(() => import('./TaskDetailClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function TaskDetailsPage() {
  return <TaskDetailClient />;
}