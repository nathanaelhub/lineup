import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptLine, SessionConfig, RehearsalState } from '../types';
import { getDialogueLines, isMyLine, isOtherLine, isDirection } from '../lib/rehearsalEngine';
import { speakWithElevenLabs } from '../lib/elevenLabsEngine';
import { useTTS } from './useTTS';
import { useSTT } from './useSTT';

export function useRehearsal(config: SessionConfig | null) {
  const [state, setState] = useState<RehearsalState>('IDLE');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [offBook, setOffBook] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  // Timer state
  const [lineElapsed, setLineElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tts = useTTS();
  const stt = useSTT();

  const stateRef = useRef(state);
  stateRef.current = state;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const configRef = useRef(config);
  configRef.current = config;
  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;

  const startTimer = useCallback(() => {
    setLineElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLineElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    if (config) {
      const filteredLines = getDialogueLines(config.script, config.showDirections);
      setLines(filteredLines);
      setOffBook(config.offBook);
      setAutoAdvance(config.autoAdvance);
      tts.assignVoices(config.script.characters);
      tts.changeSpeed(config.speed);
    }
  }, [config]);

  const speakLine = useCallback(async (text: string, character: string | undefined) => {
    const cfg = configRef.current;
    if (cfg?.elevenLabs?.apiKey && character) {
      const voiceId = cfg.elevenLabs.characterVoiceMap[character];
      if (voiceId) {
        await speakWithElevenLabs(text, voiceId, cfg.elevenLabs.apiKey, cfg.speed);
        return;
      }
    }
    await tts.speak(text, character);
  }, [tts]);

  const processLine = useCallback(async (index: number) => {
    const currentLines = linesRef.current;
    const currentConfig = configRef.current;
    if (!currentConfig || index >= currentLines.length) {
      stopTimer();
      setState('COMPLETE');
      return;
    }

    const line = currentLines[index];
    setCurrentIndex(index);
    stopTimer();
    setLineElapsed(0);

    if (isDirection(line)) {
      setState('PLAYING_OTHER');
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (stateRef.current === 'PAUSED') return;
      processLine(index + 1);
      return;
    }

    if (isOtherLine(line, currentConfig.myCharacter)) {
      setState('PLAYING_OTHER');
      startTimer();
      try {
        await speakLine(line.text, line.character);
      } catch {
        // TTS error — continue
      }
      stopTimer();
      if (stateRef.current === 'PAUSED') return;
      processLine(index + 1);
      return;
    }

    if (isMyLine(line, currentConfig.myCharacter)) {
      setState('WAITING_FOR_USER');
      if (autoAdvanceRef.current && stt.isSupported) {
        stt.startListening(() => {
          if (stateRef.current === 'WAITING_FOR_USER' || stateRef.current === 'USER_SPEAKING') {
            processLine(currentIndexRef.current + 1);
          }
        });
      }
      return;
    }
  }, [tts, stt, speakLine, startTimer, stopTimer]);

  const play = useCallback(() => {
    if (state === 'PAUSED') {
      tts.resume();
      setState('PLAYING_OTHER');
      processLine(currentIndex);
      return;
    }
    processLine(0);
  }, [state, currentIndex, processLine, tts]);

  const pause = useCallback(() => {
    tts.stop();
    stt.stopListening();
    stopTimer();
    setState('PAUSED');
  }, [tts, stt, stopTimer]);

  const skip = useCallback(() => {
    tts.stop();
    stt.stopListening();
    stopTimer();
    const next = currentIndex + 1;
    if (next < lines.length) {
      processLine(next);
    } else {
      setState('COMPLETE');
    }
  }, [currentIndex, lines.length, tts, stt, stopTimer, processLine]);

  const back = useCallback(() => {
    tts.stop();
    stt.stopListening();
    stopTimer();
    const prev = Math.max(0, currentIndex - 1);
    processLine(prev);
  }, [currentIndex, tts, stt, stopTimer, processLine]);

  const goToLine = useCallback((index: number) => {
    tts.stop();
    stt.stopListening();
    stopTimer();
    processLine(Math.max(0, Math.min(index, lines.length - 1)));
  }, [lines.length, tts, stt, stopTimer, processLine]);

  const restart = useCallback(() => {
    tts.stop();
    stt.stopListening();
    stopTimer();
    setCurrentIndex(0);
    setLineElapsed(0);
    setState('IDLE');
  }, [tts, stt, stopTimer]);

  const advance = useCallback(() => {
    stt.stopListening();
    processLine(currentIndex + 1);
  }, [currentIndex, stt, processLine]);

  const toggleOffBook = useCallback(() => setOffBook(prev => !prev), []);
  const toggleAutoAdvance = useCallback(() => setAutoAdvance(prev => !prev), []);

  const currentLine = lines[currentIndex] || null;
  const progress = {
    currentLineIndex: currentIndex,
    totalLines: lines.length,
    percentage: lines.length > 0 ? Math.round((currentIndex / lines.length) * 100) : 0,
  };

  return {
    state,
    currentLine,
    currentIndex,
    lines,
    progress,
    offBook,
    autoAdvance,
    lineElapsed,
    tts,
    stt,
    play,
    pause,
    skip,
    back,
    goToLine,
    restart,
    advance,
    toggleOffBook,
    toggleAutoAdvance,
  };
}
