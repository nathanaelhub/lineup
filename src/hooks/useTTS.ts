import { useState, useEffect, useCallback, useRef } from 'react';
import { ttsEngine } from '../lib/ttsEngine';
import type { CharacterVoiceMap } from '../types';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const voiceMapRef = useRef<CharacterVoiceMap>({});

  useEffect(() => {
    ttsEngine.waitForVoices().then(() => setVoicesReady(true));
  }, []);

  const assignVoices = useCallback((characters: string[], pitchOverrides?: Record<string, number>) => {
    voiceMapRef.current = ttsEngine.assignVoicesToCharacters(characters, pitchOverrides);
  }, []);

  const speak = useCallback(async (text: string, character?: string) => {
    const config = character ? voiceMapRef.current[character] : undefined;
    setIsSpeaking(true);
    setIsPaused(false);
    try {
      await ttsEngine.speak(text, config ? { ...config, rate: speed } : { rate: speed });
    } finally {
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [speed]);

  const stop = useCallback(() => {
    ttsEngine.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    ttsEngine.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    ttsEngine.resume();
    setIsPaused(false);
  }, []);

  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    ttsEngine.setRate(newSpeed);
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    voicesReady,
    assignVoices,
    speed,
    changeSpeed,
    voiceMap: voiceMapRef.current,
  };
}
