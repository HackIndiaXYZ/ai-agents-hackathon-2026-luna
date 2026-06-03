import React, { useEffect, useState } from 'react';
import { getModelInfo } from '../../lib/api';
import { Badge } from './Badge';
import { Card } from './Card';
import { ShieldCheck, Calendar, RefreshCw, BarChart2, Layers } from 'lucide-react';

export const ModelCredibilityBadge = ({ commodity, compact = false }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!commodity) return;
    setLoading(true);
    getModelInfo(commodity)
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get model info:', err);
        setLoading(false);
      });
  }, [commodity]);

  if (loading) {
    return <span className="text-xs text-secondary animate-pulse">Loading model metadata...</span>;
  }

  if (!info || !info.trained_at) {
    return null;
  }

  const {
    model_type,
    mape,
    rows_used,
    real_data_pct,
    credibility_statement,
    data_sources,
    trained_at
  } = info;

  // Determine badge color variant
  let badgeVariant = 'neutral';
  if (model_type === 'LSTM') badgeVariant = 'success';
  else if (model_type === 'Prophet') badgeVariant = 'info';
  else if (model_type === 'XGBoost') badgeVariant = 'warning';
  else if (model_type === 'Chronos') badgeVariant = 'danger';

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] font-medium">
        <ShieldCheck className="w-4 h-4 text-[var(--brand-green)]" />
        <span className="font-semibold text-[var(--text-primary)]">{model_type}</span>
        <span>•</span>
        <span>{rows_used} rows</span>
        <span>•</span>
        <span className={real_data_pct >= 90 ? 'text-[var(--brand-green)] font-semibold' : 'text-[var(--amber)] font-semibold'}>
          {real_data_pct}% real
        </span>
        <span>•</span>
        <span>MAPE {mape}%</span>
      </div>
    );
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--brand-green)]" />
          <h4 className="font-semibold text-sm text-[var(--text-primary)]">Model Integrity & Credibility</h4>
        </div>
        <Badge variant={badgeVariant}>{model_type}</Badge>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--surface-alt)] p-2.5 rounded border border-[var(--border)]">
        "{credibility_statement}"
      </p>

      <div className="grid grid-cols-2 gap-4 text-xs pt-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Sources</div>
            <div className="font-medium text-[var(--text-primary)]">{data_sources ? data_sources.join(', ') : 'Unknown'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">MAPE (Accuracy)</div>
            <div className="font-medium text-[var(--text-primary)]">{mape}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Dataset Size</div>
            <div className="font-medium text-[var(--text-primary)]">{rows_used} days ({real_data_pct}% real)</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Last Trained</div>
            <div className="font-medium text-[var(--text-primary)]">
              {trained_at ? new Date(trained_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ModelCredibilityBadge;
