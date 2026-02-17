import dynamic from 'next/dynamic';

const UsersClient = dynamic(() => import('./UsersClient'), { ssr: false });

export default function UsersPage() {
  return <UsersClient />;
}
