import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const CampaignsClient = dynamic(() => import('./CampaignsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function CampaignsPage() {
  return <CampaignsClient />;
}