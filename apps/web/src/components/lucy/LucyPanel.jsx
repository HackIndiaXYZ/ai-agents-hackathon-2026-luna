import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { X, Mic, Keyboard, Volume2, LayoutDashboard } from 'lucide-react';
import { useLucyStore } from '../../store/lucyStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { processLucyMessage } from '../../lib/lucyEngine';
import ExecutionTimeline from './ExecutionTimeline';
import PriceForecastChart from '../ui/PriceForecastChart';
import PnLDisplay from '../ui/PnLDisplay';
import { inr } from '../../lib/utils';

function MessageCard({ card }) {
  if (card.type === 'pnl') {
    return (
      <div className="mt-2 p-3 rounded-lg bg-black/30 text-sm space-y-1">
        <p>Today P&L: <PnLDisplay value={card.today} size="sm" /></p>
        <p>MTM: <PnLDisplay value={card.mtm} size="sm" /></p>
        {card.worst && <p className="text-red-400">Worst: {card.worst.id} {inr(card.worst.pnl)}</p>}
      </div>
    );
  }
  if (card.type === 'forecast') {
    return <div className="mt-2 rounded-lg overflow-hidden bg-white/5 p-2"><PriceForecastChart data={card.data} height={140} /></div>;
  }
  if (card.type === 'buyers' || card.type === 'mandis') {
    return (
      <div className="mt-2 space-y-1">
        {card.items.map((b) => (
          <div key={b.id || b.mandi} className="p-2 rounded bg-black/30 text-xs flex justify-between">
            <span>{b.name || b.mandi}</span>
            <span className="text-green-400">{b.reliability ? `${Math.round(b.reliability * 100)}%` : `₹${b.modal}`}</span>
          </div>
        ))}
      </div>
    );
  }
  if (card.type === 'contract') {
    const c = card.contract;
    return (
      <div className="mt-2 p-3 rounded-lg bg-black/30 text-xs space-y-1">
        <p>{c.type} {c.qty}q {c.commodity} @ ₹{c.contractPrice}/qtl</p>
        <p>Counterparty: {c.counterparty}</p>
      </div>
    );
  }
  if (card.type === 'risk') {
    return (
      <div className="mt-2 p-3 rounded-lg bg-black/30 text-xs space-y-1">
        <p className="text-amber-400">Concentration: {card.concentration}</p>
        <p>MTM: {inr(card.mtm)} · Alerts: {card.alerts}</p>
      </div>
    );
  }
  if (card.type === 'dispatch') {
    return (
      <div className="mt-2 p-3 rounded-lg bg-black/30 text-xs">
        <p>{card.origin} → {card.destination} · ETA {card.eta}</p>
      </div>
    );
  }
  return null;
}

function Message({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
          isUser ? 'bg-green-600 text-white' : 'bg-[#1a2e1a] text-white border-l-[3px] border-green-500'
        }`}
      >
        <p className="leading-relaxed">{msg.text}</p>
        {msg.cards?.map((c, i) => <MessageCard key={i} card={c} />)}
        {msg.steps && <ExecutionTimeline steps={msg.steps} expanded={expanded} onToggle={() => setExpanded(!expanded)} />}
        {msg.actions?.map((a) => (
          <a key={a.label} href={a.path} className="inline-block mt-2 mr-2 text-xs text-green-400 font-semibold hover:underline">
            {a.label} →
          </a>
        ))}
      </div>
    </div>
  );
}

const QUICK = [
  "What's my P&L today?", 'Best mandi for Cotton?', 'Cotton forecast',
  'Schedule dispatch', 'Parse field note', 'Any risk alerts?',
];

export default function LucyPanel() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const [textMode, setTextMode] = useState(true);
  const [input, setInput] = useState('');
  const {
    close, messages, addMessage, isProcessing, setProcessing, setSteps,
    pendingQuery, setPendingQuery, showInventoryBanner, dismissInventoryBanner,
    setPendingFormPrefill, voiceEnabled,
  } = useLucyStore();
  const inventorySummary = useInventoryStore((s) => s.getSummary());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (pendingQuery) {
      send(pendingQuery);
      setPendingQuery('');
    }
  }, [pendingQuery]);

  const send = async (text) => {
    if (!text.trim() || isProcessing) return;
    addMessage({ role: 'user', text: text.trim() });
    setInput('');
    setProcessing(true);
    setSteps([]);
    const steps = [];
    const result = await processLucyMessage(text, {
      sessionId: null,
      setSteps: (s) => { steps.push(...s); setSteps(s); },
      navigate: (path) => navigate(path),
    });
    if (result.toast) toast.success(result.toast);
    if (result.prefill) setPendingFormPrefill(result.prefill);
    addMessage({ role: 'assistant', text: result.text, cards: result.cards, actions: result.actions, steps });
    setProcessing(false);
    setSteps([]);
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.start();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: 'rgba(13,31,13,0.96)' }}
    >
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center font-bold text-white">L</div>
        <div className="flex-1">
          <h2 className="text-white font-semibold text-lg">Lucy</h2>
          <p className="text-green-400 text-xs">Trade Copilot · Active 24/7</p>
        </div>
        <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
          <LayoutDashboard size={14} /> Dashboard
        </button>
        <button onClick={close} className="p-2 rounded-lg hover:bg-white/10 text-white"><X size={20} /></button>
      </header>

      {showInventoryBanner && (
        <div className="px-6 py-2 bg-green-900/50 text-green-200 text-xs flex items-center justify-between">
          <span>Your inventory: {inventorySummary}</span>
          <button onClick={dismissInventoryBanner} className="text-green-400 hover:text-white"><X size={14} /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-2xl font-bold text-white mb-4 animate-pulse">L</div>
            <h3 className="text-white text-xl font-semibold mb-1">Good morning, Ramesh</h3>
            <p className="text-green-300/70 text-sm mb-6">{inventorySummary}</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)} className="px-3 py-2 rounded-lg bg-white/10 text-green-100 text-xs hover:bg-white/20 text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Message key={m.id} msg={m} />)
        )}
        {isProcessing && (
          <div className="text-green-400 text-sm animate-pulse pl-2">Lucy is thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-white/10" style={{ minHeight: 80 }}>
        {textMode ? (
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try: What's my worst losing contract?"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-green-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button type="submit" className="px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold">Send</button>
          </form>
        ) : (
          <div className="flex justify-center">
            <button onClick={startVoice} className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center shadow-lg" style={{ animation: 'pulse-ring 1.5s infinite' }}>
              <Mic size={24} className="text-white" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setTextMode(!textMode)} className="text-green-400/70 hover:text-green-300">
            {textMode ? <Mic size={18} /> : <Keyboard size={18} />}
          </button>
          <span className="text-xs text-green-400/50 px-2 py-0.5 rounded-full border border-green-800">हिं/EN</span>
          <button className={`${voiceEnabled ? 'text-green-400' : 'text-gray-500'}`}>
            <Volume2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
