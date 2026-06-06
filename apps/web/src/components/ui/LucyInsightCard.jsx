import { Sparkles } from 'lucide-react';

export default function LucyInsightCard({ insight, stats = [], cta, onCta }) {
  return (
    <div className="rounded-xl p-5 text-white" style={{ background: 'var(--green-950)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-lg">L</div>
        <div>
          <p className="font-semibold">Lucy AI Insight</p>
          <p className="text-xs text-green-400">Active 24/7</p>
        </div>
        <Sparkles size={16} className="ml-auto text-green-400" />
      </div>
      <p className="text-sm text-green-50 leading-relaxed mb-4">{insight}</p>
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full bg-white/10 text-xs font-medium">{s}</span>
          ))}
        </div>
      )}
      {cta && (
        <button onClick={onCta} className="text-sm font-semibold text-green-400 hover:text-green-300">
          {cta} →
        </button>
      )}
    </div>
  );
}
