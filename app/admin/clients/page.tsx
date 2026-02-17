import dynamic from 'next/dynamic';

const ClientsClient = dynamic(() => import('./ClientsClient'), { ssr: false });

export default function ClientsPage() {
  return <ClientsClient />;
}
