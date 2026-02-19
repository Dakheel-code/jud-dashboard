import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const SettingsClient = dynamic(() => import('./SettingsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function SettingsPage() {
  return <SettingsClient />;
}