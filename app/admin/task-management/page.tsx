import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const TaskManagementClient = dynamic(() => import('./TaskManagementClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function TaskManagementPage() {
  return <TaskManagementClient />;
}