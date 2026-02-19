import { useState, useCallback, useEffect, useRef } from 'react';
import { sttListener, compareTranscript } from '../lib/sttListener';

export function useSTT() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onSpeechEndRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    sttListener.setCallbacks({
      onSpeechStart: () => setIsSpeaking(true),
      onSpeechEnd: () => {
        setIsSpeaking(false);
        setIsListening(false);
        onSpeechEndRef.current?.();
      },
      onTranscript: (text, _isFinal) => {
        transcriptRef.current = text;
        setTranscript(text);
      },
      onError: (err) => {
        setError(err);
        setIsListening(false);
      },
    });
  }, []);

  const startListening = useCallback((onEnd?: () => void) => {
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
    onSpeechEndRef.current = onEnd || null;
    sttListener.startListening();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    sttListener.stopListening();
    setIsListening(false);
    onSpeechEndRef.current = null;
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    transcriptRef,
    error,
    startListening,
    stopListening,
    isSupported: sttListener.isSupported,
    compareTranscript,
  };
}
