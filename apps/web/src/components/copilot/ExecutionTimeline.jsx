import React from 'react';
import { motion } from 'motion/react';
import {
  Check, Loader2, Search, TrendingUp, MapPin,
  Sparkles, AlertTriangle, Brain, Zap
} from 'lucide-react';

/**
 * ExecutionTimeline — Displays agent execution steps with staggered
 * animations, color-coded status indicators, and duration badges.
 * Shows the "thinking" process of the AI to build trust.
 */

const STEP_ICONS = {
  intent_classify: Brain,
  resolve: Search,
  market_fetch: TrendingUp,
  market_analysis: TrendingUp,
  route_check: MapPin,
  route_scoring: MapPin,
  alert_fetch: AlertTriangle,
  synthesis: Sparkles,
  llm_response: Sparkles,
};

const MIN_DISPLAY_MS = {
  intent_classify: 400,
  resolve: 600,
  market_fetch: 800,
  market_analysis: 800,
  route_check: 700,
  route_scoring: 700,
  alert_fetch: 500,
  synthesis: 900,
  llm_response: 900,
};

const ExecutionTimeline = ({ steps = [], isLive = false }) => {
  if (steps.length === 0 && !isLive) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={12} style={{ color: 'var(--brand-green)' }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Execution Pipeline
        </span>
      </div>

      <div className="space-y-1">
        {steps.map((step, idx) => {
          const IconComponent = STEP_ICONS[step.step_id] || Zap;
          const isCompleted = step.status === 'completed';
          const isRunning = step.status === 'running';
          const isError = step.status === 'error';
          const displayMs = Math.max(
            step.duration_ms,
            MIN_DISPLAY_MS[step.step_id] || 300
          );

          return (
            <motion.div
              key={step.step_id + idx}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: idx * 0.12,
                duration: 0.25,
                ease: 'easeOut',
              }}
              className="flex items-start gap-3 py-2 px-3 rounded-lg"
              style={{
                background: isError
                  ? 'rgba(225, 29, 72, 0.04)'
                  : 'transparent',
              }}
            >
              {/* Timeline dot/icon */}
              <div className="relative mt-0.5 flex-shrink-0">
                {/* Vertical line connector */}
                {idx < steps.length - 1 && (
                  <div
                    className="absolute left-[9px] top-[20px] w-[2px] h-[20px]"
                    style={{
                      background: isCompleted
                        ? 'var(--brand-green)'
                        : 'var(--border)',
                    }}
                  />
                )}

                {/* Status icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.12 + 0.1, type: 'spring' }}
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: isCompleted
                      ? 'var(--brand-green)'
                      : isRunning
                      ? 'var(--amber)'
                      : isError
                      ? 'var(--rose)'
                      : 'var(--border)',
                  }}
                >
                  {isCompleted ? (
                    <Check size={11} className="text-white" strokeWidth={3} />
                  ) : isRunning ? (
                    <Loader2
                      size={11}
                      className="text-white animate-spin"
                    />
                  ) : (
                    <IconComponent size={10} className="text-white" />
                  )}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[12px] font-medium truncate"
                    style={{
                      color: isError
                        ? 'var(--rose)'
                        : 'var(--text-primary)',
                    }}
                  >
                    {step.label}
                  </span>
                  {isCompleted && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-mono"
                      style={{
                        background: 'var(--brand-green-light)',
                        color: 'var(--brand-green)',
                      }}
                    >
                      {displayMs}ms
                    </motion.span>
                  )}
                </div>
                {step.detail && (
                  <p
                    className="text-[11px] mt-0.5 truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Loading placeholder when live */}
        {isLive && steps.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 py-2 px-3"
          >
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: 'var(--brand-green)' }}
            />
            <span
              className="text-[12px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Initializing pipeline...
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExecutionTimeline;
