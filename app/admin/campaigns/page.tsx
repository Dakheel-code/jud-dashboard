import dynamic from 'next/dynamic';

const CampaignsClient = dynamic(() => import('./CampaignsClient'), { ssr: false });

export default function CampaignsPage() {
  return <CampaignsClient />;
}
