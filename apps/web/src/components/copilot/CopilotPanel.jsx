import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, X, Send, Sparkles, Clock,
  ChevronRight, AlertTriangle, TrendingUp,
  MapPin, Shield, Volume2, VolumeX, Loader2
} from 'lucide-react';
import { useCopilotStore } from '../../store/copilotStore';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import ExecutionTimeline from './ExecutionTimeline';
import CopilotResponse from './CopilotResponse';
import TranscriptBar from './TranscriptBar';
import { useCallback } from 'react';

/**
 * CopilotPanel — Slide-over panel containing the full AI copilot experience.
 * Includes voice input, text fallback, execution timeline, and response cards.
 */
const CopilotPanel = () => {
  const {
    isOpen,
    close,
    isProcessing,
    isListening,
    transcript,
    interimTranscript,
    response,
    executionSteps,
    error,
    history,
    processTranscript,
    resetResponse,
  } = useCopilotStore();

  const { isSupported, startListening, stopListening } = useSpeechRecognition();
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response, executionSteps, history]);

  // Handle text submission
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    processTranscript(textInput.trim());
    setTextInput('');
  };

  // Handle keyboard shortcut (Escape to close)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      window.speechSynthesis?.cancel();
    }
  };

  // Voice button handler
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetResponse();
      startListening();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998]"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white shadow-2xl z-[999] flex flex-col overflow-hidden"
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #059669)',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    TradeNexus AI
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {isProcessing
                      ? 'Processing...'
                      : isListening
                      ? 'Listening...'
                      : 'Voice or text input'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX size={16} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <Volume2 size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
                <button
                  onClick={close}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar"
              style={{ background: 'var(--surface-alt)' }}
            >
              {/* Conversation History */}
              {history.length > 0 && !isProcessing && !response && (
                <div className="space-y-3 mb-4">
                  {history.slice(-6).map((entry, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex ${
                        entry.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                          entry.type === 'user'
                            ? 'bg-slate-800 text-white rounded-br-md'
                            : 'bg-white text-slate-700 rounded-bl-md shadow-sm'
                        }`}
                        style={
                          entry.type !== 'user'
                            ? { border: '1px solid var(--border)' }
                            : {}
                        }
                      >
                        {entry.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Listening State */}
              <AnimatePresence>
                {isListening && (
                  <TranscriptBar
                    interimTranscript={interimTranscript}
                    isListening={isListening}
                  />
                )}
              </AnimatePresence>

              {/* Processing Timeline */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Loader2
                        size={16}
                        className="animate-spin"
                        style={{ color: 'var(--brand-green)' }}
                      />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Processing your request...
                      </span>
                    </div>
                    <ExecutionTimeline steps={executionSteps} isLive={true} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Response */}
              <AnimatePresence>
                {response && !isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    {/* Show the user's query */}
                    {transcript && (
                      <div className="flex justify-end mb-3">
                        <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl rounded-br-md bg-slate-800 text-white text-[13px]">
                          {transcript}
                        </div>
                      </div>
                    )}

                    {/* Execution steps */}
                    <ExecutionTimeline
                      steps={executionSteps}
                      isLive={false}
                    />

                    {/* Response cards */}
                    <CopilotResponse response={response} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl mt-3"
                    style={{
                      background: 'var(--rose-light)',
                      border: '1px solid rgba(225, 29, 72, 0.15)',
                    }}
                  >
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: 'var(--rose)' }}
                    />
                    <div>
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--rose)' }}
                      >
                        Something went wrong
                      </p>
                      <p
                        className="text-[12px] mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty State */}
              {!isListening && !isProcessing && !response && history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center py-12"
                >
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-green-light), #d1fae5)',
                    }}
                  >
                    <Sparkles
                      size={28}
                      style={{ color: 'var(--brand-green)' }}
                    />
                  </div>
                  <h3
                    className="text-sm font-semibold mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Ask TradeNexus AI
                  </h3>
                  <p
                    className="text-[12px] mb-6 max-w-[260px] mx-auto"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Voice or text — ask about prices, routes, mandis, or get
                    trade recommendations.
                  </p>

                  {/* Quick Actions */}
                  <div className="space-y-2 max-w-[280px] mx-auto">
                    {[
                      {
                        icon: TrendingUp,
                        text: 'What\'s the price of cotton?',
                        color: 'var(--brand-green)',
                      },
                      {
                        icon: MapPin,
                        text: 'Best mandi for wheat from Nagpur?',
                        color: 'var(--blue)',
                      },
                      {
                        icon: Shield,
                        text: 'Any active alerts for onion?',
                        color: 'var(--amber)',
                      },
                    ].map((action, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => processTranscript(action.text)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-left transition-shadow hover:shadow-md"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <action.icon size={15} style={{ color: action.color }} />
                        <span
                          className="text-[13px] flex-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {action.text}
                        </span>
                        <ChevronRight
                          size={14}
                          style={{ color: 'var(--text-muted)' }}
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Bar */}
            <div
              className="px-4 py-3"
              style={{
                borderTop: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <form
                onSubmit={handleTextSubmit}
                className="flex items-center gap-2"
              >
                {/* Voice Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleVoiceToggle}
                  disabled={!isSupported || isProcessing}
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: isListening
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : isSupported
                      ? 'linear-gradient(135deg, #16a34a, #059669)'
                      : '#e2e8f0',
                    boxShadow: isListening
                      ? '0 0 0 4px rgba(239, 68, 68, 0.2)'
                      : isSupported
                      ? '0 2px 8px rgba(22, 163, 74, 0.25)'
                      : 'none',
                    cursor: isSupported ? 'pointer' : 'not-allowed',
                  }}
                  title={
                    !isSupported
                      ? 'Speech not supported'
                      : isListening
                      ? 'Stop listening'
                      : 'Start voice input'
                  }
                >
                  {isListening ? (
                    <MicOff size={17} className="text-white" />
                  ) : (
                    <Mic
                      size={17}
                      className={isSupported ? 'text-white' : 'text-slate-400'}
                    />
                  )}

                  {/* Pulse ring when listening */}
                  {isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      animate={{
                        boxShadow: [
                          '0 0 0 0px rgba(239, 68, 68, 0.4)',
                          '0 0 0 12px rgba(239, 68, 68, 0)',
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                  )}
                </motion.button>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Listening...'
                      : 'Type or press mic to speak...'
                  }
                  disabled={isProcessing || isListening}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--brand-green)';
                    e.target.style.boxShadow =
                      '0 0 0 3px rgba(22, 163, 74, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />

                {/* Send Button */}
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={!textInput.trim() || isProcessing}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background:
                      textInput.trim() && !isProcessing
                        ? 'var(--text-primary)'
                        : 'var(--border)',
                    cursor:
                      textInput.trim() && !isProcessing
                        ? 'pointer'
                        : 'not-allowed',
                  }}
                >
                  <Send
                    size={15}
                    className={
                      textInput.trim() && !isProcessing
                        ? 'text-white'
                        : 'text-slate-400'
                    }
                  />
                </motion.button>
              </form>

              {/* Keyboard shortcut hint */}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <kbd
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Ctrl+K
                </kbd>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  to toggle copilot
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CopilotPanel;
