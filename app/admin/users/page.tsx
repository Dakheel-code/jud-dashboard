import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const UsersClient = dynamic(() => import('./UsersClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function UsersPage() {
  return <UsersClient />;
}