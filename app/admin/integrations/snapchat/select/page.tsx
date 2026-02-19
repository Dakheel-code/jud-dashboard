import dynamic from 'next/dynamic';

const SnapchatSelectClient = dynamic(() => import('./SnapchatSelectClient'), { ssr: false });

export default function SnapchatSelectAccountPage() {
  return <SnapchatSelectClient />;
}