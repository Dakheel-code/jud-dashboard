import dynamic from 'next/dynamic';

const TaskManagementClient = dynamic(() => import('./TaskManagementClient'), { ssr: false });

export default function TaskManagementPage() {
  return <TaskManagementClient />;
}
