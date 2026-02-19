import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const SnapchatDiagnosticsClient = dynamic(() => import('./SnapchatDiagnosticsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function SnapchatDiagnosticsPage() {
  return <SnapchatDiagnosticsClient />;
}