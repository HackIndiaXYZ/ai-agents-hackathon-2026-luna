export default function AgentBadge({ agent, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
      style={{ backgroundColor: color || '#16a34a' }}
    >
      {agent}
    </span>
  );
}
