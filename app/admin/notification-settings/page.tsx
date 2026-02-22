import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';

const NotificationSettingsClient = dynamic(() => import('./NotificationSettingsClient'), {
  ssr: false,
  loading: () => <PageLoader />,
});

export default function NotificationSettingsPage() {
  return <NotificationSettingsClient />;
}
