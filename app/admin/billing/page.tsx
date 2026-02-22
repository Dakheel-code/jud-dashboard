import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const BillingClient = dynamic(() => import('./BillingClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function BillingPage() {
  return <BillingClient />;
}
