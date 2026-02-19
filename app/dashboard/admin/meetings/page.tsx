import dynamic from 'next/dynamic';

const AdminMeetingsClient = dynamic(() => import('./AdminMeetingsClient'), { ssr: false });

export default function AdminMeetingsPage() {
  return <AdminMeetingsClient />;
}
