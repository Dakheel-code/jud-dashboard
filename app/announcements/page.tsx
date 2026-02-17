import dynamic from 'next/dynamic';

const AnnouncementsClient = dynamic(() => import('./AnnouncementsClient'), { ssr: false });

export default function AnnouncementsPage() {
  return <AnnouncementsClient />;
}
