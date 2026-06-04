import React from 'react';
import { motion } from 'motion/react';
import {
  Check, Loader2, Search, TrendingUp, MapPin,
  Sparkles, AlertTriangle, Brain, Zap,
  FileText, Shield, CloudRain, BarChart3,
  Truck, Users, Package, Activity
} from 'lucide-react';

/**
 * ExecutionTimeline — Displays agent execution steps with staggered
 * animations, color-coded status indicators, and duration badges.
 * Shows the "thinking" process of the AI to build trust.
 *
 * Updated with CTRM agent icons and colors for:
 * - ContractAgent (FileText / indigo)
 * - RiskAgent (Shield / rose)
 * - WeatherAgent (CloudRain / sky)
 * - MLInferenceAgent (BarChart3 / violet)
 * - DispatchAgent (Truck / amber)
 * - CounterpartyAgent (Users / cyan)
 * - IngestionAgent (Package / orange)
 * - ComplianceAgent (Shield / emerald)
 */

// Map step_id prefixes to icons
const STEP_ICONS = {
  // Existing orchestrator steps
  intent_classification: Brain,
  session_create: Zap,
  session_load: Zap,
  response_synthesis: Sparkles,

  // Original agent steps
  resolve: Search,
  market_agent: TrendingUp,
  market_fetch: TrendingUp,
  market_analysis: TrendingUp,
  route_check: MapPin,
  route_scoring: MapPin,
  alert_fetch: AlertTriangle,
  synthesis: Sparkles,
  llm_response: Sparkles,
  greeting: Sparkles,

  // Existing inventory/buyer/trade agents
  inventory_agent: Package,
  buyer_discovery_agent: Users,
  trade_advisor_agent: TrendingUp,
  commodity_agent_learning: Brain,
  compliance_agent: Shield,
  dispatch_agent: Truck,
  deal_analysis: Activity,

  // NEW CTRM agent steps
  contract_agent_parse: FileText,
  contract_agent_create: FileText,
  contract_agent_status: FileText,
  contract_agent_list: FileText,
  counterparty_agent: Users,
  risk_agent_pnl: Shield,
  risk_agent_summary: Shield,
  risk_agent_alerts: AlertTriangle,
  dispatch_agent_create: Truck,
  weather_agent: CloudRain,
  ml_inference_loading: BarChart3,
  ml_inference_predict: BarChart3,
  ingestion_agent: Package,
};

// Agent-specific accent colors for timeline dots
const STEP_COLORS = {
  // Core orchestrator
  intent_classification: '#6366f1',   // indigo
  session_create: '#64748b',          // slate
  session_load: '#64748b',            // slate
  response_synthesis: '#10b981',      // emerald

  // Contract agent
  contract_agent_parse: '#6366f1',    // indigo
  contract_agent_create: '#6366f1',
  contract_agent_status: '#6366f1',
  contract_agent_list: '#6366f1',

  // Risk agent
  risk_agent_pnl: '#f43f5e',         // rose
  risk_agent_summary: '#f43f5e',
  risk_agent_alerts: '#ef4444',       // red

  // Weather
  weather_agent: '#0ea5e9',           // sky

  // ML Inference
  ml_inference_loading: '#8b5cf6',    // violet
  ml_inference_predict: '#8b5cf6',

  // Dispatch
  dispatch_agent: '#f59e0b',          // amber
  dispatch_agent_create: '#f59e0b',

  // Counterparty
  counterparty_agent: '#06b6d4',      // cyan

  // Ingestion
  ingestion_agent: '#f97316',         // orange

  // Deal analysis
  deal_analysis: '#14b8a6',           // teal

  // Existing
  inventory_agent: '#10b981',
  buyer_discovery_agent: '#06b6d4',
  trade_advisor_agent: '#f59e0b',
  market_agent: '#10b981',
  compliance_agent: '#10b981',
  commodity_agent_learning: '#8b5cf6',
};

const MIN_DISPLAY_MS = {
  intent_classification: 400,
  resolve: 600,
  market_fetch: 800,
  market_analysis: 800,
  route_check: 700,
  route_scoring: 700,
  alert_fetch: 500,
  synthesis: 900,
  llm_response: 900,
  contract_agent_parse: 500,
  contract_agent_create: 600,
  risk_agent_pnl: 700,
  risk_agent_summary: 700,
  risk_agent_alerts: 500,
  ml_inference_loading: 800,
  ml_inference_predict: 1000,
  weather_agent: 700,
  dispatch_agent_create: 600,
  ingestion_agent: 800,
  response_synthesis: 600,
};

/**
 * BouncingDots — "Lucy is thinking..." indicator with 3 bouncing dots.
 */
const BouncingDots = () => (
  <span className="inline-flex items-center gap-[3px] ml-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-[5px] h-[5px] rounded-full"
        style={{ background: 'var(--brand-green)' }}
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          delay: i * 0.12,
          ease: 'easeInOut',
        }}
      />
    ))}
  </span>
);

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
          const accentColor = STEP_COLORS[step.step_id] || 'var(--brand-green)';
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
                        ? accentColor
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
                      ? accentColor
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
                  {/* Agent name badge + label */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <IconComponent
                      size={11}
                      style={{ color: accentColor, flexShrink: 0 }}
                    />
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
                  </div>
                  {isCompleted && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-mono"
                      style={{
                        background: `${accentColor}18`,
                        color: accentColor,
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

        {/* Typing indicator when live with no steps yet */}
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
              className="text-[12px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Lucy is thinking
              <BouncingDots />
            </span>
          </motion.div>
        )}

        {/* Pulsing indicator when live and steps are executing */}
        {isLive && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-3 py-2 px-3"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--amber)' }}
            >
              <Loader2 size={11} className="text-white animate-spin" />
            </div>
            <span
              className="text-[12px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Processing
              <BouncingDots />
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExecutionTimeline;
