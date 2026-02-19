import dynamic from 'next/dynamic';

const MeetingStatsClient = dynamic(() => import('./MeetingStatsClient'), { ssr: false });

export default function MeetingStatsPage() {
  return <MeetingStatsClient />;
}