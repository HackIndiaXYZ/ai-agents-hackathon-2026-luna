import React from 'react';

/** TradeNexus wordmark with geometric green N icon — matches reference UI */
export const TradeNexusLogo = ({ dark = false, className = '' }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect width="28" height="28" rx="6" fill={dark ? '#14532d' : '#dcfce7'} />
      <path
        d="M8 8h4l6 8V8h4v14h-4l-6-8v8H8V8z"
        fill={dark ? '#4ade80' : '#16a34a'}
      />
    </svg>
    <span className={`text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
      TradeNexus
    </span>
  </div>
);

export default TradeNexusLogo;
