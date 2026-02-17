import dynamic from 'next/dynamic';

const TasksClient = dynamic(() => import('./TasksClient'), { ssr: false });

export default function TasksPage() {
  return <TasksClient />;
}
