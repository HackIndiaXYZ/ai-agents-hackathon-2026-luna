import { Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useLucyStore } from '../../store/lucyStore';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function LucyButton() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { isOpen, open, isListening, isProcessing } = useLucyStore();

  if (!isAuthenticated || isOpen) return null;

  if (isProcessing) {
    return (
      <button className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
        <LoadingSpinner size={24} />
      </button>
    );
  }

  if (isListening) {
    return (
      <button
        onClick={open}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-green-600 flex items-center justify-center shadow-lg"
        style={{ animation: 'pulse-ring 1.5s infinite' }}
      >
        <span className="text-white text-xl">🎙</span>
      </button>
    );
  }

  return (
    <button
      onClick={open}
      title="Press ⌘K to open"
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 text-white font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
      style={{ boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}
    >
      <Sparkles size={16} />
      Ask Lucy
    </button>
  );
}
