import dynamic from 'next/dynamic';

const TaskDetailClient = dynamic(() => import('./TaskDetailClient'), { ssr: false });

export default function TaskDetailsPage() {
  return <TaskDetailClient />;
}