import React, { useEffect, useState } from 'react';

export const ConfidenceGauge = ({ score = 0.7 }) => {
  const [animatedOffset, setAnimatedOffset] = useState(251.3);

  // SVG semi-circle arc calculations
  // radius = 80, pathLength = pi * 80 ≈ 251.3
  const radius = 80;
  const pathLength = Math.PI * radius; // 251.327

  // Normalize score between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));

  // Determine thresholds
  let color = 'stroke-rose-500';
  let textColor = 'text-rose-600';
  let label = 'High Risk';
  let bgColor = 'bg-rose-50';

  if (normalizedScore >= 0.7) {
    color = 'stroke-emerald-500';
    textColor = 'text-emerald-600';
    label = 'Reliable';
    bgColor = 'bg-emerald-50';
  } else if (normalizedScore >= 0.4) {
    color = 'stroke-amber-500';
    textColor = 'text-amber-600';
    label = 'Moderate';
    bgColor = 'bg-amber-50';
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const targetOffset = pathLength - normalizedScore * pathLength;
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timeout);
  }, [normalizedScore, pathLength]);

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-xl bg-white shadow-sm relative overflow-hidden h-[180px]">
      <div className="relative w-44 h-28 flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Base Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--border)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            className={`${color} transition-all duration-1000 ease-out`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={pathLength}
            strokeDashoffset={animatedOffset}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            {Math.round(normalizedScore * 100)}%
          </span>
          <span className={`text-[11px] font-bold tracking-wider uppercase mt-0.5 px-2 py-0.5 rounded-full ${bgColor} ${textColor}`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceGauge;
