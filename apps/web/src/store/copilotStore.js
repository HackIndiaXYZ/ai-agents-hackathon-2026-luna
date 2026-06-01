import { create } from 'zustand';

/**
 * Copilot state management — controls the global AI assistant panel,
 * speech recognition state, execution timeline, and response display.
 */
export const useCopilotStore = create((set, get) => ({
  // Panel visibility
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  // Speech state
  isListening: false,
  setListening: (val) => set({ isListening: val }),
  transcript: '',
  setTranscript: (t) => set({ transcript: t }),
  interimTranscript: '',
  setInterimTranscript: (t) => set({ interimTranscript: t }),

  // Processing state
  isProcessing: false,
  setProcessing: (val) => set({ isProcessing: val }),

  // Page context (injected by each page)
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  activeCommodity: null,
  setActiveCommodity: (c) => set({ activeCommodity: c }),

  // Response
  response: null,
  setResponse: (r) => set({ response: r }),

  // Execution steps (for timeline animation)
  executionSteps: [],
  setExecutionSteps: (steps) => set({ executionSteps: steps }),

  // Conversation history (session-only, last 10)
  history: [],
  addToHistory: (entry) =>
    set((s) => ({
      history: [...s.history.slice(-9), entry],
    })),

  // Error state
  error: null,
  setError: (e) => set({ error: e }),

  // Master reset
  resetResponse: () =>
    set({
      response: null,
      executionSteps: [],
      error: null,
    }),

  // Full process action
  processTranscript: async (text) => {
    const { currentPage, activeCommodity, addToHistory, setError } = get();

    set({
      isProcessing: true,
      response: null,
      executionSteps: [],
      error: null,
      transcript: text,
    });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/copilot/process`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: text,
            page_context: currentPage,
            active_commodity: activeCommodity,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      set({
        response: data,
        executionSteps: data.execution_steps || [],
        isProcessing: false,
      });

      addToHistory({
        type: 'user',
        text,
        timestamp: Date.now(),
      });
      addToHistory({
        type: 'assistant',
        text: data.voice_response,
        intent: data.intent?.intent,
        cards: data.cards,
        timestamp: Date.now(),
      });

      // TTS (Web Speech API)
      if (data.voice_response && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.voice_response);
        utterance.rate = 1.05;
        utterance.pitch = 1;
        utterance.lang = data.intent?.language_detected === 'hi' ? 'hi-IN' : 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('[Copilot] Process error:', err);
      setError(err.message);
      set({ isProcessing: false });
    }
  },
}));

export default useCopilotStore;
