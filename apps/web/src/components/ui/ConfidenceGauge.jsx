import { useEffect, useState } from 'react';

export default function ConfidenceGauge({ score = 0.75, label = 'Confidence', size = 120 }) {
  const [animated, setAnimated] = useState(0);
  const r = (size - 16) / 2;
  const circumference = Math.PI * r;
  const color = score >= 0.8 ? '#16a34a' : score >= 0.5 ? '#d97706' : '#dc2626';

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animated)}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="text-lg font-bold" fill="#0D1F0D">
          {Math.round(animated * 100)}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}
