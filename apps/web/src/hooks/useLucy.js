import { useCallback, useEffect, useRef } from 'react';
import useLucyStore from '../store/lucyStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export { useLucyStore };

export function useLucy() {
  const {
    sessionId,
    messages,
    isOpen,
    voiceEnabled,
    isListening,
    isProcessing,
    currentSteps,
    context,
    setSessionId,
    setMessages,
    addMessage,
    setVoiceEnabled,
    setListening,
    setProcessing,
    setCurrentSteps,
    setContext,
    reset,
  } = useLucyStore();

  const recognitionRef = useRef(null);

  // Web Speech Synthesis (TTS) Helper
  const speak = useCallback((text, langCode = 'en') => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Map response language hint to voice lang
    if (langCode === 'hi' || langCode === 'hinglish') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN'; // Indian English standard
    }
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Send Message Action
  const sendMessage = useCallback(async (text, languageHint = null) => {
    if (!text || !text.trim() || isProcessing) return;

    const userText = text.trim();
    
    // 1. Add user message to history
    addMessage({
      role: 'user',
      content: userText,
      timestamp: Date.now()
    });

    setProcessing(true);
    setCurrentSteps([]);

    try {
      // 2. Post to Lucy chat endpoint
      const res = await fetch(`${API_BASE}/api/v1/lucy/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId,
          language_hint: languageHint || 'en'
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      // 3. Update execution steps and context
      if (data.execution_steps) {
        setCurrentSteps(data.execution_steps);
      }
      if (data.context_update) {
        setContext(data.context_update);
      }

      // 4. Add assistant response to history
      const responseMsg = {
        role: 'assistant',
        content: data.response_text,
        voice_response: data.voice_response,
        voice_language: data.voice_language || 'en',
        execution_steps: data.execution_steps || [],
        actions_taken: data.actions_taken || [],
        ui_hints: data.ui_hints || [],
        retrieval_used: data.retrieval_used ?? false,
        retrieval_confidence: data.retrieval_confidence ?? 0,
        dominant_retrieved_intent: data.dominant_retrieved_intent || data.dominant_intent || null,
        lucy_intent: data.lucy_intent || null,
        routed_agent: data.routed_agent || null,
        retrieved_examples: data.retrieved_examples || data.retrieval_examples || [],
        timestamp: Date.now()
      };
      
      addMessage(responseMsg);
      setProcessing(false);

      // 5. Trigger TTS speech
      if (data.voice_response) {
        speak(data.voice_response, data.voice_language || 'en');
      }

      // 6. Return response for any inline handler
      return data;

    } catch (err) {
      console.error('[Lucy Hook] Error sending message:', err);
      addMessage({
        role: 'assistant',
        content: `⚠️ **System Error**: Failed to communicate with Lucy. Make sure the backend server is running.\n\n*Detail: ${err.message}*`,
        timestamp: Date.now()
      });
      setProcessing(false);
    }
  }, [sessionId, isProcessing, addMessage, setProcessing, setCurrentSteps, setContext, speak]);

  // Start Session Action
  const startSession = useCallback(async (customId = null) => {
    // If session already exists and is initialized, don't restart
    if (sessionId && messages.length > 0) return;

    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/lucy/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: customId || sessionId || null
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to create Lucy session: ${res.status}`);
      }

      const data = await res.json();
      
      setSessionId(data.session_id);
      if (data.context) {
        setContext(data.context);
      }

      // Add the initial Lucy welcome greeting
      const greetingMsg = {
        role: 'assistant',
        content: data.response_text,
        voice_response: data.voice_response,
        timestamp: Date.now()
      };

      setMessages([greetingMsg]);
      setProcessing(false);

      // Play the greeting voice if voiceEnabled
      if (data.voice_response) {
        speak(data.voice_response, 'en');
      }

    } catch (err) {
      console.error('[Lucy Hook] Session creation error:', err);
      setMessages([{
        role: 'assistant',
        content: "⚠️ **System Error**: Could not launch Lucy session. Connection to TradeNexus backend failed.",
        timestamp: Date.now()
      }]);
      setProcessing(false);
    }
  }, [sessionId, messages.length, setSessionId, setContext, setMessages, setProcessing, speak]);

  // Reset Session Action
  const resetSession = useCallback(async () => {
    // Cancel any active SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    reset();
    // Re-initialize session with new id
    await startSession();
  }, [reset, startSession]);

  // --- Speech Recognition (STT) Logic ---
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'hi-IN'; // Multilingual / Hindi primary standard

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }

      if (final && final.trim()) {
        setListening(false);
        sendMessage(final.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Lucy STT] Recognition error:', event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isSpeechSupported, sendMessage, setListening]);

  const startListening = useCallback(() => {
    if (!isSpeechSupported || !recognitionRef.current) return;
    try {
      // Cancel speech if speaking
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current.start();
    } catch (e) {
      console.warn('[Lucy STT] Already listening or error:', e.message);
    }
  }, [isSpeechSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // ignore
    }
  }, []);

  return {
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
    stopListening,
  };
}

export default useLucy;
