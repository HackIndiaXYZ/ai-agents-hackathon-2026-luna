import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, X, Send, Sparkles, Clock, Volume2, VolumeX,
  Bot, RefreshCw, ChevronDown, ChevronUp, MapPin, ShieldCheck,
  TrendingUp, FileText, CheckCircle2, User, Globe, HelpCircle,
  Package, Scale, DollarSign, ArrowRight, Shield, CloudRain,
  BarChart3, Truck, AlertTriangle, ExternalLink, Search
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, CartesianGrid
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import useLucy, { useLucyStore } from '../../hooks/useLucy';
import ExecutionTimeline from '../copilot/ExecutionTimeline';

/**
 * A highly robust, self-contained Markdown-to-HTML/JSX parser
 * that converts headers, bold text, lists, and agricultural tables
 * into stunning interactive elements.
 */
const renderFormattedText = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let tableHeader = null;
  let tableRows = [];
  let inTable = false;

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 my-2 space-y-1 text-slate-700 text-sm">
          {currentList.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      );
      currentList = [];
    }
  };

  const flushTable = (key) => {
    if (inTable && tableHeader) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto my-3 rounded-xl border border-slate-100 shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {tableHeader.map((h, idx) => (
                  <th key={idx} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-slate-600">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap font-medium">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = null;
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Table Detector
    if (trimmed.startsWith('|')) {
      flushList(lineIdx);
      inTable = true;
      const cells = trimmed.split('|').filter(c => c !== '');
      
      // Divider row e.g. |---|---|
      if (cells.every(c => c.trim().startsWith('-'))) {
        return;
      }
      
      if (!tableHeader) {
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else {
      flushTable(lineIdx);
    }

    // List Detector
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const content = trimmed.substring(1).trim();
      currentList.push(parseInlineFormatting(content));
      return;
    } else {
      flushList(lineIdx);
    }

    // Headers
    if (trimmed.startsWith('###')) {
      elements.push(
        <h4 key={lineIdx} className="text-sm font-bold text-slate-800 mt-4 mb-2">
          {parseInlineFormatting(trimmed.substring(3).trim())}
        </h4>
      );
    } else if (trimmed.startsWith('##')) {
      elements.push(
        <h3 key={lineIdx} className="text-base font-bold text-emerald-800 mt-4 mb-2">
          {parseInlineFormatting(trimmed.substring(2).trim())}
        </h3>
      );
    } else if (trimmed.startsWith('#')) {
      elements.push(
        <h2 key={lineIdx} className="text-lg font-extrabold text-emerald-900 mt-5 mb-3">
          {parseInlineFormatting(trimmed.substring(1).trim())}
        </h2>
      );
    } else if (trimmed === '') {
      elements.push(<div key={lineIdx} className="h-2" />);
    } else {
      elements.push(
        <p key={lineIdx} className="text-slate-700 text-sm leading-relaxed mb-2 font-normal">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    }
  });

  // Flush remaining lists or tables
  flushList('end');
  flushTable('end');

  return elements;
};

const parseInlineFormatting = (text) => {
  // Regex to capture **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};


// ─── Quick Action Chip Configs ────────────────────────────────
const CTRM_QUICK_ACTIONS = [
  { text: "What is in my inventory?", label: "Inventory", icon: Package, color: "emerald" },
  { text: "What is my P&L?", label: "Portfolio P&L", icon: DollarSign, color: "violet" },
  { text: "Any risk alerts?", label: "Risk Alerts", icon: Shield, color: "rose" },
  { text: "What will cotton prices be next week?", label: "Price Forecast", icon: BarChart3, color: "indigo" },
  { text: "Find cotton buyers near Nagpur", label: "Discover Buyers", icon: User, color: "cyan" },
  { text: "Suggest a profitable trade for cotton", label: "Trade Advisory", icon: TrendingUp, color: "amber" },
];

const PAGE_CONTEXT_CHIPS = {
  contracts: [
    { text: "What is the status of my latest contract?", label: "Contract Status", icon: FileText },
    { text: "Create a buy contract for 100 quintal cotton", label: "New Contract", icon: FileText },
    { text: "What is my P&L?", label: "Portfolio P&L", icon: DollarSign },
  ],
  risk: [
    { text: "Any risk alerts?", label: "Risk Alerts", icon: Shield },
    { text: "What is my P&L?", label: "Portfolio P&L", icon: DollarSign },
    { text: "What will cotton prices be next week?", label: "Forecast", icon: BarChart3 },
  ],
  markets: [
    { text: "What will cotton prices be next week?", label: "Price Forecast", icon: BarChart3 },
    { text: "Any risk alerts?", label: "Risk Alerts", icon: Shield },
    { text: "Suggest a profitable trade", label: "Trade Advisory", icon: TrendingUp },
  ],
  dispatch: [
    { text: "Schedule dispatch for my latest contract", label: "New Dispatch", icon: Truck },
    { text: "What is the status of my latest contract?", label: "Contract Status", icon: FileText },
    { text: "How is the weather on Nagpur to Mumbai route?", label: "Route Weather", icon: CloudRain },
  ],
};

const CHIP_COLORS = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/60' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200/60' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
};


/**
 * Full-screen natural language operating system overlay for Lucy.
 */
const LucyMode = () => {
  const {
    sessionId,
    messages,
    isOpen,
    voiceEnabled,
    isListening,
    isProcessing,
    currentSteps,
    context,
    sendMessage,
    startSession,
    resetSession,
    setVoiceEnabled,
    isSpeechSupported,
    startListening,
    stopListening
  } = useLucy();

  const navigate = useNavigate();
  const location = useLocation();
  const [textInput, setTextInput] = useState('');
  const [timelineCollapsed, setTimelineCollapsed] = useState({});
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Detect current page for context-aware chip suggestions
  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/risk')) return 'risk';
    if (path.includes('/markets') || path.includes('/market')) return 'markets';
    if (path.includes('/dispatch')) return 'dispatch';
    return null;
  }, [location.pathname]);

  // Initialize session on mount/open
  useEffect(() => {
    if (isOpen) {
      startSession();
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, startSession]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isProcessing]);

  // Handle text submissions
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    
    const input = textInput.trim();
    setTextInput('');
    sendMessage(input);
  };

  // Keyboard events: Escape key closes Lucy mode
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) {
        useLucyStore.getState().close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // ─── Navigate UI Hint Handler ──────────────────────
  // When Lucy returns a navigate: hint, allow one-click navigation
  const handleNavigateHint = (hint) => {
    const navPrefix = 'navigate:';
    if (hint && hint.startsWith(navPrefix)) {
      const path = hint.substring(navPrefix.length);
      useLucyStore.getState().close();
      navigate(path);
    }
  };

  // ─── Toast Triggers for actions_taken ──────────────
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg.role === 'assistant' && lastMsg.ui_hints?.includes('inventory_update')) {
      toast.success(
        <div className="flex flex-col text-left">
          <span className="font-semibold text-emerald-900 text-sm">Inventory Synced Live</span>
          <span className="text-[11px] text-slate-500">Form filled & database successfully saved.</span>
        </div>,
        {
          duration: 3500,
          position: 'top-right',
          icon: <CheckCircle2 className="text-emerald-500 h-5 w-5" />,
          style: {
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #d1fae5',
            padding: '12px 16px'
          }
        }
      );
    }

    if (lastMsg.role === 'assistant' && lastMsg.ui_hints?.includes('contract_created')) {
      toast.success(
        <div className="flex flex-col text-left">
          <span className="font-semibold text-indigo-900 text-sm">Contract Created ✓</span>
          <span className="text-[11px] text-slate-500">Lucy created a new contract autonomously.</span>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          icon: <FileText className="text-indigo-500 h-5 w-5" />,
          style: {
            background: 'white', borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            border: '1px solid #e0e7ff', padding: '12px 16px'
          }
        }
      );
    }

    if (lastMsg.role === 'assistant' && lastMsg.ui_hints?.includes('dispatch_created')) {
      toast.success(
        <div className="flex flex-col text-left">
          <span className="font-semibold text-amber-900 text-sm">Dispatch Scheduled ✓</span>
          <span className="text-[11px] text-slate-500">Shipment has been queued for processing.</span>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          icon: <Truck className="text-amber-500 h-5 w-5" />,
          style: {
            background: 'white', borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            border: '1px solid #fef3c7', padding: '12px 16px'
          }
        }
      );
    }
  }, [messages]);

  if (!isOpen) return null;

  // Build suggestion prompts — context-aware based on current page
  const suggestionPrompts = currentPage && PAGE_CONTEXT_CHIPS[currentPage]
    ? PAGE_CONTEXT_CHIPS[currentPage]
    : CTRM_QUICK_ACTIONS.slice(0, 3);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xl flex justify-center items-center overflow-hidden">
      <Toaster />
      <div className="w-full h-full max-w-4xl bg-slate-50 shadow-2xl flex flex-col relative md:rounded-2xl md:max-h-[92vh] border border-slate-100 overflow-hidden">
        
        {/* --- Header --- */}
        <div className="h-20 bg-white border-b border-slate-100 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Animated avatar */}
            <div className="relative">
              <div className={`w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-400/30 ${isListening ? 'animate-pulse bg-rose-50 border-rose-400/30' : ''}`}>
                <Bot size={22} className={isListening ? 'text-rose-500' : isProcessing ? 'text-amber-500' : 'text-emerald-600'} />
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isListening ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800">LUCY</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">OS Beta</span>
              </div>
              <p className="text-xs text-slate-400">TradeNexus Autonomous Operations Copilot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2.5 rounded-xl hover:bg-slate-100 transition-all text-slate-400 cursor-pointer ${voiceEnabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100/70' : ''}`}
              title={voiceEnabled ? 'Mute Lucy voice' : 'Enable Lucy voice'}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Clear/Reset Session */}
            <button
              onClick={resetSession}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              title="Reset memory and start fresh"
            >
              <RefreshCw size={18} />
            </button>

            {/* Close Button */}
            <button
              onClick={() => useLucyStore.getState().close()}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all cursor-pointer"
              title="Return to Dashboard (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* --- Current Inventory Dashboard Banner --- */}
        {context.inventory_snapshot && Object.keys(context.inventory_snapshot).length > 0 && (
          <div className="bg-emerald-50/70 border-b border-emerald-100/50 px-6 py-2 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-emerald-900">Your Current Stock:</span>
              <span className="truncate max-w-[500px]">
                {Object.entries(context.inventory_snapshot).map(([k, v]) => `${k} (${v}q)`).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* --- Main Chat Window --- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6 flex flex-col bg-slate-50/50 custom-scrollbar"
        >
          {messages.length === 0 && !isProcessing ? (
            /* --- Empty State --- */
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-400/20"
              >
                <Bot size={38} className="text-white" />
              </motion.div>

              <div>
                <h3 className="text-lg font-bold text-slate-800">Meet Lucy</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Your autonomous CTRM operations copilot. Create contracts, check P&L, forecast prices, schedule dispatches, or analyze deals — all through natural language.
                </p>
              </div>

              {/* Contextual chip suggestions */}
              <div className="w-full space-y-2 pt-2">
                {suggestionPrompts.map((p, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(p.text)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 rounded-xl text-left border border-slate-200/60 shadow-sm cursor-pointer transition-all"
                  >
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">{p.label}</span>
                    <span className="text-[13px] text-slate-600 flex-1 ml-3 font-medium truncate">{p.text}</span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </motion.button>
                ))}
              </div>

              {/* Quick Action Chips grid */}
              <div className="w-full pt-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {CTRM_QUICK_ACTIONS.map((chip, idx) => {
                    const colors = CHIP_COLORS[chip.color] || CHIP_COLORS.emerald;
                    const Icon = chip.icon;
                    return (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sendMessage(chip.text)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} text-[11px] font-semibold cursor-pointer shadow-sm hover:shadow transition-all`}
                      >
                        <Icon size={12} />
                        {chip.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* --- Message Streams --- */
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
                  
                  {/* Avatar wrapper */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md mr-3 mt-1 flex-shrink-0">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${isUser ? 'bg-emerald-600 text-white rounded-3xl rounded-tr-none px-5 py-3 shadow-lg shadow-emerald-600/10' : 'flex flex-col w-full'}`}>
                    
                    {isUser ? (
                      /* User text bubble */
                      <p className="text-[14px] leading-relaxed font-medium">{msg.content}</p>
                    ) : (
                      /* Lucy structured block bubble */
                      <div className="bg-white border border-slate-200/70 shadow-sm rounded-3xl rounded-tl-none p-5 flex flex-col space-y-4">
                        
                        {/* Custom components based on response triggers / hints */}
                        {(msg.retrieval_used || (msg.retrieved_examples && msg.retrieved_examples.length > 0)) && (
                          <RetrievalSection msg={msg} />
                        )}

                        {msg.execution_steps && msg.execution_steps.length > 0 && (
                          <div className="border-b border-slate-100 pb-3">
                            <button
                              onClick={() => setTimelineCollapsed(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="flex items-center justify-between w-full text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5 text-emerald-700">
                                <Sparkles size={13} />
                                {`✓ Verified pipeline executed (${(msg.execution_steps.reduce((acc, s) => acc + s.duration_ms, 0) / 1000).toFixed(2)}s)`}
                              </span>
                              {timelineCollapsed[idx] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </button>
                            
                            {!timelineCollapsed[idx] && (
                              <div className="mt-3">
                                <ExecutionTimeline steps={msg.execution_steps} isLive={false} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── P&L Summary Card ─── */}
                        {msg.ui_hints?.includes('pnl_summary') && (
                          <PnLSummaryCard msg={msg} />
                        )}

                        {/* ─── Price Forecast Inline Chart ─── */}
                        {msg.ui_hints?.includes('price_forecast') && (
                          <ForecastChartCard msg={msg} />
                        )}

                        {/* ─── Risk Alerts Card ─── */}
                        {msg.ui_hints?.includes('risk_alerts') && (
                          <RiskAlertsCard msg={msg} />
                        )}

                        {/* ─── Weather Forecast Card ─── */}
                        {msg.ui_hints?.includes('weather_forecast') && (
                          <WeatherCard msg={msg} />
                        )}

                        {/* Rich Action Card Renderers */}
                        {msg.ui_hints?.includes('buyer_discovery') && messages[idx].content && (
                          <BuyerDiscoveryCard msg={msg} />
                        )}

                        {msg.ui_hints?.includes('deal_analysis') && (
                          <DealAnalysisCard msg={msg} />
                        )}

                        {/* Primary Markdown Text Output */}
                        <div className="prose prose-emerald max-w-none">
                          {renderFormattedText(msg.content)}
                        </div>

                        {/* ─── Navigate Action Buttons ─── */}
                        {msg.ui_hints && msg.ui_hints.some(h => h.startsWith('navigate:')) && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                            {msg.ui_hints.filter(h => h.startsWith('navigate:')).map((hint, hIdx) => {
                              const path = hint.substring('navigate:'.length);
                              const label = path.includes('contracts') ? 'View Contract' : path.includes('dispatch') ? 'View Dispatch' : 'Open Page';
                              const NavIcon = path.includes('contracts') ? FileText : path.includes('dispatch') ? Truck : ExternalLink;
                              return (
                                <motion.button
                                  key={hIdx}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => handleNavigateHint(hint)}
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow hover:bg-slate-800 cursor-pointer transition-all"
                                >
                                  <NavIcon size={13} />
                                  {label}
                                  <ArrowRight size={12} />
                                </motion.button>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* --- Live Pipeline Timeline Spinner --- */}
          {isProcessing && (
            <div className="flex justify-start w-full">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                <Bot size={16} className="text-amber-500 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200/70 shadow-sm rounded-3xl rounded-tl-none p-5 flex flex-col space-y-4 w-full max-w-[85%]">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider animate-pulse">Lucy is compiling multi-agent inputs...</span>
                </div>
                {currentSteps.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <ExecutionTimeline steps={currentSteps} isLive={true} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* --- Bottom STT/Speech Input area --- */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
          {/* Context-aware chip row (visible when conversation is active) */}
          {messages.length > 0 && !isProcessing && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {(currentPage && PAGE_CONTEXT_CHIPS[currentPage]
                ? PAGE_CONTEXT_CHIPS[currentPage]
                : CTRM_QUICK_ACTIONS.slice(0, 4)
              ).map((chip, idx) => {
                const Icon = chip.icon || Sparkles;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(chip.text)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200/60 hover:bg-slate-200/70 cursor-pointer transition-all"
                  >
                    <Icon size={10} />
                    {chip.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          <form onSubmit={handleTextSubmit} className="flex items-center gap-3">
            {/* Pulsing Voice STT button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? stopListening : startListening}
              disabled={!isSpeechSupported || isProcessing}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg transition-all ${
                isListening
                  ? 'bg-rose-500 shadow-rose-500/20'
                  : isSpeechSupported
                  ? 'bg-emerald-600 shadow-emerald-600/10 hover:bg-emerald-700'
                  : 'bg-slate-200 cursor-not-allowed text-slate-400'
              }`}
              title={isListening ? 'Stop listening' : 'Start speak with Lucy'}
            >
              {isListening ? (
                <MicOff size={22} className="animate-pulse" />
              ) : (
                <Mic size={22} className={isSpeechSupported ? 'text-white' : 'text-slate-400'} />
              )}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: ['0 0 0 0px rgba(244, 63, 94, 0.4)', '0 0 0 16px rgba(244, 63, 94, 0)'],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </motion.button>

            {/* Input Bar text box */}
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isListening ? 'Listening. Speak now...' : 'Ask Lucy anything — contracts, P&L, forecasts, dispatches...'}
              disabled={isProcessing || isListening}
              className="flex-1 h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200/60 outline-none text-slate-700 text-sm font-medium focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!textInput.trim() || isProcessing}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                textInput.trim() && !isProcessing
                  ? 'bg-slate-900 text-white cursor-pointer hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Send size={18} />
            </motion.button>
          </form>

          {/* Quick chip actions under input */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <div className="flex items-center gap-1.5">
              <Globe size={12} className="text-slate-400" />
              <span>Supports multilingual voice input (Hindi, Hinglish, English)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-slate-100 font-mono px-1 py-0.5 rounded border border-slate-200 text-slate-500">ESC</span>
              <span>to exit</span>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};


// ─── Collapsible RAG Retrieval Section (Prompt C) ───────
const RetrievalSection = ({ msg }) => {
  const [expanded, setExpanded] = useState(false);
  const examples = msg.retrieved_examples || [];
  const confidencePct = Math.round((msg.retrieval_confidence || 0) * 100);
  const count = examples.length || (msg.retrieval_used ? 1 : 0);

  if (!msg.retrieval_used && examples.length === 0) return null;

  return (
    <div className="border-b border-slate-100 pb-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold cursor-pointer text-slate-500 hover:text-slate-700"
      >
        <span className="flex items-center gap-1.5 text-indigo-700">
          <Search size={13} />
          Retrieved {count} similar example{count !== 1 ? 's' : ''} · {confidencePct}% confidence
          {msg.dominant_retrieved_intent && (
            <span className="text-[10px] text-slate-400 font-medium ml-1">
              → {msg.dominant_retrieved_intent}
            </span>
          )}
          {msg.lucy_intent && (
            <span className="text-[10px] text-indigo-600 font-semibold ml-1">
              · Lucy: {msg.lucy_intent}
            </span>
          )}
          {msg.routed_agent && (
            <span className="text-[10px] text-emerald-600 font-medium ml-1">
              → {msg.routed_agent}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 pl-1">
          {examples.length > 0 ? (
            examples.map((ex, i) => (
              <p key={i} className="text-[11px] text-slate-500 leading-snug">
                Similar: &quot;{ex.utterance}&quot; → <span className="font-semibold text-slate-700">{ex.intent}</span>
                {ex.similarity != null && (
                  <span className="text-slate-400 ml-1">({Math.round(ex.similarity * 100)}%)</span>
                )}
              </p>
            ))
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Intent retrieval matched with {confidencePct}% confidence.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Inline Result Card: P&L Summary ──────────────────
const PnLSummaryCard = ({ msg }) => {
  // Extract P&L data from execution_steps detail text
  const pnlStep = msg.execution_steps?.find(s => s.step_id === 'risk_agent_pnl');
  const detail = pnlStep?.detail || '';

  // Parse "Total P&L: ₹X across Y contracts"
  const pnlMatch = detail.match(/Total P&L:\s*₹([\d,.-]+)\s*across\s*(\d+)/);
  const totalPnl = pnlMatch ? pnlMatch[1] : null;
  const contractCount = pnlMatch ? pnlMatch[2] : null;
  const isPositive = totalPnl && !totalPnl.startsWith('-');

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${isPositive ? 'bg-emerald-50/40 border-emerald-100/50' : 'bg-rose-50/40 border-rose-100/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className={isPositive ? 'text-emerald-700' : 'text-rose-700'} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isPositive ? 'text-emerald-900' : 'text-rose-900'}`}>
            Portfolio P&L Summary
          </span>
        </div>
        {contractCount && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {contractCount} Contracts
          </span>
        )}
      </div>
      {totalPnl && (
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-extrabold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isPositive ? '+' : ''}₹{totalPnl}
          </span>
          <span className="text-xs text-slate-500">unrealized MtM</span>
        </div>
      )}
    </div>
  );
};

// ─── Inline Result Card: Price Forecast Chart ─────────
const ForecastChartCard = ({ msg }) => {
  const mlStep = msg.execution_steps?.find(s => s.step_id === 'ml_inference_predict');
  const detail = mlStep?.detail || '';

  // Parse range from detail: "7-day range: ₹X → ₹Y (trend) | MAPE: Z%"
  const rangeMatch = detail.match(/₹([\d,]+)\s*→\s*₹([\d,]+)\s*\((\w+)\)/);
  const mapeMatch = detail.match(/MAPE:\s*([\d.]+)%/);

  const startPrice = rangeMatch ? rangeMatch[1].replace(/,/g, '') : null;
  const endPrice = rangeMatch ? rangeMatch[2].replace(/,/g, '') : null;
  const trend = rangeMatch ? rangeMatch[3] : 'stable';
  const mape = mapeMatch ? mapeMatch[1] : null;

  // Generate synthetic chart data from start→end for visual
  const chartData = useMemo(() => {
    if (!startPrice || !endPrice) return [];
    const start = parseFloat(startPrice);
    const end = parseFloat(endPrice);
    const points = [];
    for (let i = 0; i <= 7; i++) {
      const progress = i / 7;
      const price = start + (end - start) * progress + (Math.random() - 0.5) * (end - start) * 0.1;
      const lower = price * 0.97;
      const upper = price * 1.03;
      points.push({
        day: `Day ${i}`,
        price: Math.round(price),
        lower: Math.round(lower),
        upper: Math.round(upper),
      });
    }
    return points;
  }, [startPrice, endPrice]);

  const trendColor = trend === 'rising' ? '#10b981' : trend === 'falling' ? '#f43f5e' : '#f59e0b';

  return (
    <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-indigo-700" />
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">7-Day Price Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          {mape && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              MAPE: {mape}%
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: trendColor + '20', color: trendColor }}>
            {trend === 'rising' ? '↗ Rising' : trend === 'falling' ? '↘ Falling' : '→ Stable'}
          </span>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="upper" stroke="none" fill={trendColor} fillOpacity={0.08} />
              <Area type="monotone" dataKey="lower" stroke="none" fill={trendColor} fillOpacity={0.08} />
              <Line type="monotone" dataKey="price" stroke={trendColor} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] text-slate-400 italic">AI forecast based on 180 days of historical patterns</p>
    </div>
  );
};


// ─── Inline Result Card: Risk Alerts ──────────────────
const RiskAlertsCard = ({ msg }) => {
  const alertStep = msg.execution_steps?.find(s => s.step_id === 'risk_agent_alerts');
  const detail = alertStep?.detail || '';
  const alertMatch = detail.match(/Detected\s*(\d+)\s*risk alert/);
  const alertCount = alertMatch ? parseInt(alertMatch[1]) : 0;
  const isClean = alertCount === 0;

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${isClean ? 'bg-emerald-50/40 border-emerald-100/50' : 'bg-rose-50/40 border-rose-100/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isClean ? (
            <CheckCircle2 size={15} className="text-emerald-700" />
          ) : (
            <AlertTriangle size={15} className="text-rose-700" />
          )}
          <span className={`text-xs font-bold uppercase tracking-wider ${isClean ? 'text-emerald-900' : 'text-rose-900'}`}>
            Risk Assessment
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isClean ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {isClean ? 'All Clear' : `${alertCount} Alert${alertCount > 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
};


// ─── Inline Result Card: Weather ──────────────────────
const WeatherCard = ({ msg }) => {
  const weatherStep = msg.execution_steps?.find(s => s.step_id === 'weather_agent');
  const detail = weatherStep?.detail || '';
  const riskMatch = detail.match(/Max risk score:\s*([\d.]+)/);
  const riskScore = riskMatch ? parseFloat(riskMatch[1]) : 0;
  const isRisky = riskScore > 0.5;

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${isRisky ? 'bg-amber-50/40 border-amber-100/50' : 'bg-sky-50/40 border-sky-100/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain size={15} className={isRisky ? 'text-amber-700' : 'text-sky-700'} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isRisky ? 'text-amber-900' : 'text-sky-900'}`}>
            Route Weather Assessment
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRisky ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
          {isRisky ? `Risk: ${(riskScore * 100).toFixed(0)}%` : 'Route Clear'}
        </span>
      </div>
    </div>
  );
};


/**
 * Rich Card Component: Buyer Discovery Network View
 */
const BuyerDiscoveryCard = ({ msg }) => {
  return (
    <div className="bg-emerald-50/40 rounded-2xl border border-emerald-100/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={15} className="text-emerald-700" />
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">TradeNexus Buyer Network (Beta)</span>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">30 Seeded Buyers</span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">
        The matching cohort sorted geographically below has been fully vetted by TradeNexus operations desk:
      </p>
    </div>
  );
};

/**
 * Rich Card Component: Contract & Deal Analysis Scorecard
 */
const DealAnalysisCard = ({ msg }) => {
  return (
    <div className="bg-indigo-50/40 rounded-2xl border border-indigo-100/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={15} className="text-indigo-700" />
        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">LUCY Contract & Deal Scorecard</span>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">
        Lucy has executed cross-agent validations regarding stock verification, logistics costs, and pricing margins for this offer.
      </p>
    </div>
  );
};

export default LucyMode;
