import dynamic from 'next/dynamic';

const SnapchatDiagnosticsClient = dynamic(() => import('./SnapchatDiagnosticsClient'), { ssr: false });

export default function SnapchatDiagnosticsPage() {
  return <SnapchatDiagnosticsClient />;
}