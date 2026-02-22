export function Badge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[status] || { label: status, cls: 'bg-purple-500/15 text-purple-400 border-purple-500/20' };
  return <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${s.cls}`}>{s.label}</span>;
}
