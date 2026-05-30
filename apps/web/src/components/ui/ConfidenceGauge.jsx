import React, { useEffect, useState } from 'react';

export const ConfidenceGauge = ({ score = 0.7 }) => {
  const [animatedOffset, setAnimatedOffset] = useState(251.3);

  // SVG arc configuration
  // Semi-circle path length is pi * r (pi * 80 ≈ 251.3)
  const radius = 80;
  const pathLength = Math.PI * radius; // 251.327

  // Normalize score between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));

  // Determine levels
  let color = 'stroke-rose-500';
  let textColor = 'text-rose-400';
  let label = 'High Risk';
  let bgGradient = 'from-rose-500/10 to-transparent';

  if (normalizedScore >= 0.7) {
    color = 'stroke-emerald-500';
    textColor = 'text-emerald-400';
    label = 'Reliable';
    bgGradient = 'from-emerald-500/10 to-transparent';
  } else if (normalizedScore >= 0.4) {
    color = 'stroke-amber-500';
    textColor = 'text-amber-400';
    label = 'Medium Risk';
    bgGradient = 'from-amber-500/10 to-transparent';
  }

  useEffect(() => {
    // Animate arc fill on mount
    const timeout = setTimeout(() => {
      const targetOffset = pathLength - normalizedScore * pathLength;
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timeout);
  }, [normalizedScore, pathLength]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-surface-800/40 border border-surface-700/30 rounded-2xl backdrop-blur-md relative overflow-hidden group">
      {/* Background soft pulse glow */}
      <div className={`absolute inset-0 bg-gradient-to-t ${bgGradient} opacity-30 transition-all duration-700 group-hover:opacity-50`} />

      <div className="relative w-48 h-32 flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Base Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
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

        {/* Center Labels */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight text-white font-display">
            {Math.round(normalizedScore * 100)}%
          </span>
          <span className={`text-xs font-bold tracking-wider uppercase mt-0.5 ${textColor}`}>
            {label}
          </span>
        </div>
      </div>

      <div className="text-xs text-surface-400 mt-2 font-medium text-center relative z-10">
        Route Reliability Confidence Score
      </div>
    </div>
  );
};

export default ConfidenceGauge;
