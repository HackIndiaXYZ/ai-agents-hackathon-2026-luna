import { useRef, useCallback, useEffect } from 'react';
import { useCopilotStore } from '../store/copilotStore';

/**
 * Custom hook for Web Speech API integration.
 * Handles browser SpeechRecognition with Hindi/English support,
 * interim transcripts, and automatic fallback detection.
 */
export function useSpeechRecognition() {
  const recognitionRef = useRef(null);
  const {
    isListening,
    setListening,
    setTranscript,
    setInterimTranscript,
    processTranscript,
  } = useCopilotStore();

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Support Hindi + English
    recognition.lang = 'hi-IN'; // Primary: Hindi (will also capture Hinglish)

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        setTranscript(final.trim());
        setInterimTranscript('');
        // Auto-process the final transcript
        processTranscript(final.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      setListening(false);
      setInterimTranscript('');

      // Don't treat "no-speech" as a critical error
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[SpeechRecognition] Critical error:', event.error);
      }
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
          // Ignore cleanup errors
        }
      }
    };
  }, [isSupported, setListening, setInterimTranscript, setTranscript, processTranscript]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started — ignore
      console.warn('[SpeechRecognition] Start error:', e.message);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped — ignore
    }
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
  };
}

export default useSpeechRecognition;
