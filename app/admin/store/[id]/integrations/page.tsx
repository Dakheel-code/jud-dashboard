import dynamic from 'next/dynamic';

const IntegrationsClient = dynamic(() => import('./IntegrationsClient'), { ssr: false });

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}