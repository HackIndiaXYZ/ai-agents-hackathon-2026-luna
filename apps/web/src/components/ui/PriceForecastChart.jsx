import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function PriceForecastChart({ data, height = 280 }) {
  const hist = data.filter((d) => !d.forecast);
  const all = data;
  const band = data.filter((d) => d.lower != null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={all} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" domain={['auto', 'auto']} />
        <Tooltip formatter={(v) => [`₹${v}`, 'Price']} />
        <Area dataKey="upper" stroke="none" fill="#dcfce7" fillOpacity={0.5} data={band} />
        <Area dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} data={band} />
        <Line dataKey="price" stroke="#16a34a" strokeWidth={2} dot={false} data={hist} connectNulls={false} />
        <Line dataKey="price" stroke="#4ade80" strokeWidth={2} strokeDasharray="6 4" dot={false} data={data.filter((d) => d.forecast)} />
        <ReferenceLine x="Jun 4" stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'Today', fontSize: 10, fill: '#6b7280' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
