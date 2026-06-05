import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, IndianRupee, ArrowRight } from 'lucide-react';

const FALLBACK_ITEMS = [
  {
    icon: TrendingUp,
    title: 'Market Update',
    text: 'Cotton prices rose 3.2% in Indore today',
    time: '10 min ago',
  },
  {
    icon: Users,
    title: 'Opportunity Found',
    text: 'Potential buyer found: Shree Cotton Mills',
    time: '15 min ago',
  },
  {
    icon: IndianRupee,
    title: 'Profit Estimate',
    text: 'Estimated profit: ₹4.8L on open position',
    time: '20 min ago',
  },
];

export const LucyInsightBar = ({ insights = [], alerts = [] }) => {
  const items = React.useMemo(() => {
    if (alerts?.length >= 3) {
      return alerts.slice(0, 3).map((a, i) => ({
        icon: [TrendingUp, Users, IndianRupee][i],
        title: a.alert_type?.replace(/_/g, ' ') || 'Insight',
        text: a.message?.slice(0, 60) || 'Market signal detected',
        time: 'Live',
      }));
    }
    if (insights?.length >= 2) {
      return insights.slice(0, 3).map((text, i) => ({
        ...FALLBACK_ITEMS[i],
        text: text.slice(0, 70),
      }));
    }
    return FALLBACK_ITEMS;
  }, [insights, alerts]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0f0d]/90 backdrop-blur-md overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* Lucy profile */}
        <div className="flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-white/10 lg:min-w-[220px]">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0f0d]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Lucy AI</p>
            <p className="text-[10px] text-slate-400">Your Trading Assistant</p>
          </div>
        </div>

        {/* Insight feed */}
        <div className="flex-1 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="px-5 py-4 flex gap-3">
                <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/80">{item.title}</p>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center px-5 py-4 border-t lg:border-t-0 lg:border-l border-white/10">
          <Link
            to="/app/dashboard"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap"
          >
            View All Insights <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LucyInsightBar;
