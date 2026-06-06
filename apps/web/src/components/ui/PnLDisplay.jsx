import { inr, pnlColor } from '../../lib/utils';

const sizes = { sm: 'text-sm', md: 'text-base font-semibold', lg: 'text-2xl font-bold' };

export default function PnLDisplay({ value, size = 'md' }) {
  return (
    <span className={sizes[size]} style={{ color: pnlColor(value) }}>
      {value >= 0 ? '+' : ''}{inr(value)}
    </span>
  );
}
