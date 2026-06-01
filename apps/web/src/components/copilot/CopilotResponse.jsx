import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, MapPin, AlertTriangle,
  Sparkles, ArrowRight, Shield, BarChart3, Minus
} from 'lucide-react';

/**
 * CopilotResponse — Renders structured response cards from the copilot API.
 * Supports: price_table, route_summary, alert_list, recommendation, text.
 */

const CopilotResponse = ({ response }) => {
  if (!response) return null;

  return (
    <div className="space-y-3">
      {/* Voice response bubble */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex justify-start"
      >
        <div
          className="max-w-[92%] px-4 py-3 rounded-xl rounded-bl-md text-[13px] leading-relaxed shadow-sm"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {response.voice_response}
        </div>
      </motion.div>

      {/* Data Cards */}
      {response.cards?.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + idx * 0.1 }}
        >
          <CardRenderer card={card} />
        </motion.div>
      ))}

      {/* Intent metadata pill */}
      {response.intent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 pt-2"
        >
          <span
            className="text-[10px] px-2 py-1 rounded-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {response.intent.intent} · {response.intent.language_detected} ·{' '}
            {Math.round(response.intent.confidence * 100)}%
          </span>
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {response.total_duration_ms}ms
          </span>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Card type renderer — dispatches to specialized sub-components.
 */
const CardRenderer = ({ card }) => {
  switch (card.card_type) {
    case 'price_table':
      return <PriceTableCard card={card} />;
    case 'route_summary':
      return <RouteSummaryCard card={card} />;
    case 'alert_list':
      return <AlertListCard card={card} />;
    case 'recommendation':
      return <RecommendationCard card={card} />;
    case 'text':
      return <TextCard card={card} />;
    default:
      return <TextCard card={card} />;
  }
};

/**
 * Price Table Card
 */
const PriceTableCard = ({ card }) => {
  const { mandis = [], avg_price, trend_7d, data_as_of } = card.data || {};

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={14} style={{ color: 'var(--brand-green)' }} />
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {card.title}
          </span>
        </div>
        {trend_7d != null && (
          <div
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background:
                trend_7d > 0 ? 'var(--brand-green-light)' : trend_7d < 0 ? 'var(--rose-light)' : 'var(--surface-alt)',
              color:
                trend_7d > 0 ? 'var(--brand-green)' : trend_7d < 0 ? 'var(--rose)' : 'var(--text-muted)',
            }}
          >
            {trend_7d > 0 ? (
              <TrendingUp size={11} />
            ) : trend_7d < 0 ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {trend_7d > 0 ? '+' : ''}
            {trend_7d?.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Price rows */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {mandis.slice(0, 5).map((m, idx) => (
          <div
            key={idx}
            className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
          >
            <div>
              <span
                className="text-[12px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {m.mandi_name}
              </span>
              <span
                className="text-[11px] ml-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {m.state}
              </span>
            </div>
            <span
              className="text-[13px] font-semibold font-mono"
              style={{ color: 'var(--brand-green)' }}
            >
              ₹{m.modal_price?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      {avg_price && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-alt)',
          }}
        >
          <span
            className="text-[11px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Average
          </span>
          <span
            className="text-[12px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            ₹{avg_price?.toLocaleString('en-IN')}/quintal
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Route Summary Card
 */
const RouteSummaryCard = ({ card }) => {
  const data = card.data || {};

  const riskColors = {
    low: { bg: 'var(--brand-green-light)', text: 'var(--brand-green)' },
    medium: { bg: 'var(--amber-light)', text: 'var(--amber)' },
    high: { bg: 'var(--rose-light)', text: 'var(--rose)' },
  };
  const risk = riskColors[data.delay_risk] || riskColors.medium;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={14} style={{ color: 'var(--blue)' }} />
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {card.title}
        </span>
      </div>

      {/* Route visual */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="text-[12px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.origin}
        </span>
        <div className="flex-1 flex items-center gap-1">
          <div
            className="flex-1 h-[2px]"
            style={{ background: 'var(--border-strong)' }}
          />
          <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
        </div>
        <span
          className="text-[12px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {data.destination}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--surface-alt)' }}
        >
          <p
            className="text-[10px] mb-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Distance
          </p>
          <p
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.distance_km} km
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--surface-alt)' }}
        >
          <p
            className="text-[10px] mb-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Duration
          </p>
          <p
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.estimated_hours}h
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-center"
          style={{ background: risk.bg }}
        >
          <p
            className="text-[10px] mb-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Delay Risk
          </p>
          <p
            className="text-[13px] font-semibold capitalize"
            style={{ color: risk.text }}
          >
            {data.delay_risk}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Alert List Card
 */
const AlertListCard = ({ card }) => {
  const alerts = card.data?.alerts || [];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {card.title}
        </span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded-full ml-auto"
          style={{
            background: alerts.length > 0 ? 'var(--amber-light)' : 'var(--brand-green-light)',
            color: alerts.length > 0 ? 'var(--amber)' : 'var(--brand-green)',
          }}
        >
          {alerts.length} active
        </span>
      </div>

      {alerts.length > 0 ? (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {alerts.slice(0, 4).map((alert, idx) => (
            <div key={idx} className="px-4 py-2.5">
              <p
                className="text-[12px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {alert.message || 'Market activity alert'}
              </p>
              {alert.mandi_name && (
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {alert.mandi_name}, {alert.state}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <Shield size={20} className="mx-auto mb-2" style={{ color: 'var(--brand-green)' }} />
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            No active alerts. Markets are stable.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Recommendation Card
 */
const RecommendationCard = ({ card }) => {
  const data = card.data || {};

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(to right, rgba(22, 163, 74, 0.04), transparent)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--brand-green)' }} />
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {card.title}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background:
              data.confidence_score > 0.7
                ? 'var(--brand-green-light)'
                : 'var(--amber-light)',
            color:
              data.confidence_score > 0.7
                ? 'var(--brand-green)'
                : 'var(--amber)',
          }}
        >
          {Math.round((data.confidence_score || 0) * 100)}% confidence
        </div>
      </div>

      {/* AI Recommendation Text */}
      <div className="px-4 py-3">
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {data.ai_recommendation}
        </p>
      </div>

      {/* Top Markets */}
      {data.top_markets?.length > 0 && (
        <div
          className="px-4 py-2.5"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-alt)',
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Top Markets
          </p>
          <div className="flex flex-wrap gap-2">
            {data.top_markets.map((m, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{
                  background:
                    idx === 0 ? 'var(--brand-green-light)' : 'var(--surface)',
                  color:
                    idx === 0
                      ? 'var(--brand-green)'
                      : 'var(--text-secondary)',
                  border:
                    idx === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {m.mandi} · ₹{m.modal_price?.toLocaleString('en-IN')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{
          borderTop: '1px solid var(--border)',
        }}
      >
        <span
          className="text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.data_freshness}
        </span>
        {data.best_route && (
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Route: {data.best_route.origin} → {data.best_route.destination}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Generic Text Card
 */
const TextCard = ({ card }) => (
  <div
    className="rounded-xl p-4"
    style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}
  >
    {card.title && (
      <p
        className="text-[11px] font-semibold mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {card.title}
      </p>
    )}
    <p
      className="text-[12px] leading-relaxed"
      style={{ color: 'var(--text-secondary)' }}
    >
      {card.data?.text || ''}
    </p>
  </div>
);

export default CopilotResponse;
