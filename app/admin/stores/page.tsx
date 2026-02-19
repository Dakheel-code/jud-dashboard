import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const StoresClient = dynamic(() => import('./StoresClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function StoresPage() {
  return <StoresClient />;
}