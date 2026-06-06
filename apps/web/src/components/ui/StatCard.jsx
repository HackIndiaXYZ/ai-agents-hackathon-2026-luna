import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { inr } from '../../lib/utils';

function AnimatedValue({ value, format = 'number' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const isNum = typeof value === 'number';
    if (!isNum) return;
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  if (typeof value !== 'number') return value;
  return format === 'inr' ? inr(display) : display.toLocaleString('en-IN');
}

export default function StatCard({ label, value, delta, deltaType, icon: Icon, sparklineData, color }) {
  const deltaColor = deltaType === 'positive' ? 'text-green-600' : deltaType === 'negative' ? 'text-red-600' : 'text-gray-500';
  const format = typeof value === 'number' && value > 999 ? 'inr' : 'number';
  const spark = sparklineData || Array.from({ length: 10 }, (_, i) => ({ v: 50 + Math.sin(i) * 20 }));

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}15`, color }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>
        <AnimatedValue value={value} format={format} />
      </div>
      {delta && <span className={`text-xs font-medium ${deltaColor}`}>{delta}</span>}
      <div className="h-8 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v" stroke={color || '#16a34a'} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
