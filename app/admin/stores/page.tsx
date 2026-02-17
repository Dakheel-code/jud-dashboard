import dynamic from 'next/dynamic';

const StoresClient = dynamic(() => import('./StoresClient'), { ssr: false });

export default function StoresPage() {
  return <StoresClient />;
}
