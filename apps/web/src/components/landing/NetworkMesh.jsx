import React from 'react';

export const NetworkMesh = ({ className = '', variant = 'dark' }) => {
  const stroke = variant === 'dark' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(22, 163, 74, 0.08)';
  const dot = variant === 'dark' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.25)';

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none animate-mesh-drift ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="mesh-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={stroke} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mesh-grid)" />
      {[
        [12, 18], [28, 32], [45, 22], [62, 38], [78, 20], [88, 55],
        [35, 62], [55, 72], [72, 48], [18, 78], [92, 28], [8, 45],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={`${cx}%`} cy={`${cy}%`} r="2" fill={dot} />
          {i < 8 && (
            <line
              x1={`${cx}%`}
              y1={`${cy}%`}
              x2={`${((cx + 15) % 90) + 5}%`}
              y2={`${((cy + 12) % 80) + 10}%`}
              stroke={stroke}
              strokeWidth="1"
            />
          )}
        </g>
      ))}
    </svg>
  );
};

export default NetworkMesh;
