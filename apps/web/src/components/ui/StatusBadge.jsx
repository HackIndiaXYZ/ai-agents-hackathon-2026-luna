const map = {
  DRAFT: 'neutral', CONFIRMED: 'info', IN_TRANSIT: 'warning',
  DELIVERED: 'success', SETTLED: 'success', CANCELLED: 'danger',
  Active: 'success', Pending: 'warning', Completed: 'info', Cancelled: 'danger',
};

export default function StatusBadge({ status }) {
  const v = map[status] || 'neutral';
  const colors = {
    neutral: 'bg-gray-100 text-gray-600',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${colors[v]}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
