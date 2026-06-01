import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic } from 'lucide-react';
import { useCopilotStore } from '../../store/copilotStore';

/**
 * CopilotButton — Floating action button for the AI copilot.
 * Renders in the bottom-right corner with a breathing glow effect.
 * Supports Ctrl+K keyboard shortcut.
 */
const CopilotButton = () => {
  const { isOpen, toggle, isListening, isProcessing } = useCopilotStore();

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          className="fixed bottom-6 right-6 z-[997] w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer group"
          style={{
            background: isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #16a34a, #059669)',
            boxShadow: isListening
              ? '0 4px 20px rgba(239, 68, 68, 0.35), 0 0 0 4px rgba(239, 68, 68, 0.1)'
              : '0 4px 20px rgba(22, 163, 74, 0.35), 0 0 0 4px rgba(22, 163, 74, 0.08)',
          }}
          title="TradeNexus AI Copilot (Ctrl+K)"
          id="copilot-fab"
        >
          {/* Icon */}
          {isListening ? (
            <Mic size={22} className="text-white" />
          ) : (
            <Sparkles size={22} className="text-white" />
          )}

          {/* Breathing glow ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              boxShadow: isListening
                ? [
                    '0 0 0 0px rgba(239, 68, 68, 0.3)',
                    '0 0 0 14px rgba(239, 68, 68, 0)',
                  ]
                : [
                    '0 0 0 0px rgba(22, 163, 74, 0.25)',
                    '0 0 0 14px rgba(22, 163, 74, 0)',
                  ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />

          {/* Processing spinner */}
          {isProcessing && (
            <motion.div
              className="absolute inset-[-3px] rounded-2xl"
              style={{
                border: '2px solid transparent',
                borderTopColor: 'rgba(255, 255, 255, 0.6)',
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          {/* Tooltip */}
          <div
            className="absolute bottom-full mb-3 right-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-medium shadow-lg"
              style={{
                background: 'var(--text-primary)',
                color: 'white',
              }}
            >
              AI Copilot
              <span className="ml-1.5 opacity-60">Ctrl+K</span>
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default CopilotButton;
