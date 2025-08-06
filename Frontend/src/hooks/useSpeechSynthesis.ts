import { useState, useCallback, useRef } from 'react';

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  browserSupportsSpeechSynthesis: boolean;
}

export const useSpeechSynthesis = (language: string = 'en-US'): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const browserSupportsSpeechSynthesis = 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!browserSupportsSpeechSynthesis) {
      console.error('Browser does not support speech synthesis');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [language, browserSupportsSpeechSynthesis]);

  const stop = useCallback(() => {
    if (browserSupportsSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [browserSupportsSpeechSynthesis]);

  return {
    isSpeaking,
    speak,
    stop,
    browserSupportsSpeechSynthesis
  };
};