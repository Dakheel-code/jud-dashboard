import dynamic from 'next/dynamic';

const StoreTasksClient = dynamic(() => import('./StoreTasksClient'), { ssr: false });

export default function StoreTasksPage() {
  return <StoreTasksClient />;
}
