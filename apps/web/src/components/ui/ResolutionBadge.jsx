import React from 'react';
import { Zap, Search, Sparkles, Brain, HelpCircle } from 'lucide-react';

export const ResolutionBadge = ({ tier }) => {
  const configs = {
    exact: {
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Exact Match',
      icon: Zap,
    },
    trigram: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Fuzzy Match',
      icon: Search,
    },
    embedding: {
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      label: 'Semantic Match',
      icon: Sparkles,
    },
    llm: {
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'AI Resolved',
      icon: Brain,
    },
    unknown: {
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      label: 'Unknown',
      icon: HelpCircle,
    },
  };

  const current = configs[tier?.toLowerCase()] || configs.unknown;
  const IconComponent = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${current.color} shadow-sm select-none`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      {current.label}
    </span>
  );
};

export default ResolutionBadge;
