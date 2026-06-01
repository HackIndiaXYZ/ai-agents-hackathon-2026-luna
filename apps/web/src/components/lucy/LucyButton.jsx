import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, Loader2, Bot } from 'lucide-react';
import { useLucyStore } from '../../store/lucyStore';

/**
 * LucyButton — Premium pill-shaped floating action button for LUCY.
 * Renders in the bottom-right corner with a breathing glow effect.
 * Key shortcut: Ctrl+K or Cmd+K.
 */
const LucyButton = () => {
  const { isOpen, toggle, isListening, isProcessing } = useLucyStore();

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  // Determine styles based on states
  const getButtonStyles = () => {
    if (isListening) {
      return {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)', // pulsing red/pink
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4), 0 0 0 4px rgba(239, 68, 68, 0.1)',
      };
    }
    if (isOpen) {
      return {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)', // amber
        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 0 0 4px rgba(245, 158, 11, 0.1)',
      };
    }
    return {
      background: 'linear-gradient(135deg, #10b981, #059669)', // emerald green
      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35), 0 0 0 4px rgba(16, 185, 129, 0.08)',
    };
  };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 350 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[9997] h-12 px-5 rounded-full flex items-center gap-2.5 text-white font-medium shadow-xl cursor-pointer group"
        style={getButtonStyles()}
        title="Ask Lucy (Ctrl+K)"
        id="lucy-fab"
      >
        {/* State Icon */}
        {isListening ? (
          <Mic size={18} className="text-white animate-pulse" />
        ) : isProcessing ? (
          <Loader2 size={18} className="text-white animate-spin" />
        ) : (
          <Bot size={18} className="text-white group-hover:rotate-12 transition-transform duration-300" />
        )}

        {/* Text */}
        <span className="text-sm tracking-wide font-semibold">
          {isListening ? 'Listening...' : isProcessing ? 'Lucy is thinking...' : isOpen ? 'Close Lucy' : '🤖 Ask Lucy'}
        </span>

        {/* Breathing glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isListening
              ? ['0 0 0 0px rgba(239, 68, 68, 0.35)', '0 0 0 16px rgba(239, 68, 68, 0)']
              : isOpen
              ? ['0 0 0 0px rgba(245, 158, 11, 0.3)', '0 0 0 16px rgba(245, 158, 11, 0)']
              : ['0 0 0 0px rgba(16, 185, 129, 0.25)', '0 0 0 16px rgba(16, 185, 129, 0)'],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />

        {/* Shortcut tag in tooltip */}
        <div className="absolute bottom-full mb-3 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-900 text-white shadow-xl flex items-center gap-1.5">
            <span>Natural Language Operating System</span>
            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-emerald-400 font-mono">Ctrl+K</span>
          </div>
        </div>
      </motion.button>
    </AnimatePresence>
  );
};

export default LucyButton;
