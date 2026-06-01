import { create } from 'zustand';

/**
 * Lucy State Store — manages full-screen LUCY mode, conversational turns,
 * and state variables.
 */
export const useLucyStore = create((set) => ({
  sessionId: null,
  messages: [],
  isOpen: false,
  voiceEnabled: true,
  isListening: false,
  isProcessing: false,
  currentSteps: [],
  context: {},

  // Visibility actions
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  // State setters
  setSessionId: (id) => set({ sessionId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setVoiceEnabled: (val) => set({ voiceEnabled: val }),
  setListening: (val) => set({ isListening: val }),
  setProcessing: (val) => set({ isProcessing: val }),
  setCurrentSteps: (steps) => set({ currentSteps: steps }),
  setContext: (ctx) => set({ context: ctx }),

  // Master reset
  reset: () =>
    set({
      sessionId: null,
      messages: [],
      isOpen: false,
      isListening: false,
      isProcessing: false,
      currentSteps: [],
      context: {},
    }),
}));

export default useLucyStore;
