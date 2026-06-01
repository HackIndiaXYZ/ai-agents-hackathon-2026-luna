import React from 'react';
import { motion } from 'motion/react';
import { Mic } from 'lucide-react';

/**
 * TranscriptBar — Real-time voice transcription display with
 * animated waveform indicator and interim text rendering.
 */
const TranscriptBar = ({ interimTranscript, isListening }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="mb-4"
    >
      <div
        className="rounded-xl p-4 relative overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Gradient shimmer */}
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{
            background: [
              'linear-gradient(90deg, transparent 0%, rgba(22, 163, 74, 0.06) 50%, transparent 100%)',
              'linear-gradient(90deg, transparent 0%, rgba(22, 163, 74, 0.12) 50%, transparent 100%)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />

        <div className="relative flex items-start gap-3">
          {/* Animated mic icon */}
          <div className="flex-shrink-0 mt-0.5">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.15)',
              }}
            >
              <Mic size={14} className="text-white" />
            </motion.div>
          </div>

          {/* Transcript text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--rose)' }}
            >
              Listening...
            </p>
            {interimTranscript ? (
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {interimTranscript}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ color: 'var(--brand-green)' }}
                >
                  |
                </motion.span>
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Waveform dots */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: ['4px', '16px', '4px'],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: 'easeInOut',
                    }}
                    className="w-[3px] rounded-full"
                    style={{ background: 'var(--brand-green)' }}
                  />
                ))}
                <span
                  className="text-[12px] ml-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Speak now...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TranscriptBar;
