import React from 'react';

export const ResolutionBadge = ({ tier }) => {
  const configs = {
    exact: {
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Exact Match',
    },
    trigram: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      label: 'Fuzzy Match',
    },
    embedding: {
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      label: 'Semantic Match',
    },
    llm: {
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'AI Resolved',
    },
    unknown: {
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Unknown',
    },
  };

  const current = configs[tier?.toLowerCase()] || configs.unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.color} shadow-sm animate-fade-in`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {current.label}
    </span>
  );
};

export default ResolutionBadge;
