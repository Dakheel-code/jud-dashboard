import dynamic from 'next/dynamic';

const AnnouncementsAdminClient = dynamic(() => import('./AnnouncementsAdminClient'), { ssr: false });

export default function AnnouncementsAdminPage() {
  return <AnnouncementsAdminClient />;
}
