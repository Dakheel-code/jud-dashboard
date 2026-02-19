import dynamic from 'next/dynamic';

const MyTasksClient = dynamic(() => import('./MyTasksClient'), { ssr: false });

export default function MyTasksPage() {
  return <MyTasksClient />;
}

