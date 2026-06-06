import { clsx as cx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes) => twMerge(cx(...classes));

export const inr = (n) => {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

export const qty = (n, unit = 'qtl') => `${n?.toLocaleString('en-IN')} ${unit}`;
export const pct = (n, decimals = 2) => `${n >= 0 ? '+' : ''}${n?.toFixed(decimals)}%`;
export const pnlColor = (n) => (n >= 0 ? 'var(--green-600)' : 'var(--red-600)');
export const pnlBg = (n) => (n >= 0 ? 'var(--green-50)' : 'var(--red-100)');
export const clsx = (...classes) => classes.filter(Boolean).join(' ');

export const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const exportCSV = (rows, filename = 'export.csv') => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
