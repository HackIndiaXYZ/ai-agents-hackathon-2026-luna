import { create } from 'zustand';

export const useStore = create((set) => ({
  // Authentication states
  isAuthenticated: false,
  setAuthenticated: (bool) => set({ isAuthenticated: bool }),

  demoUser: { 
    name: "Ramesh Patil", 
    email: "ramesh@demo.com", 
    region: "Vidarbha", 
    language: "en" 
  },

  // Active configurations
  selectedCommodity: 'Cotton',
  setSelectedCommodity: (commodity) => set({ selectedCommodity: commodity }),

  currentRecommendation: null,
  setCurrentRecommendation: (recommendation) => set({ currentRecommendation: recommendation }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),

  learningStats: null,
  setLearningStats: (learningStats) => set({ learningStats }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

export default useStore;
