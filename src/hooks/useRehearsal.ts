import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptLine, SessionConfig, RehearsalState } from '../types';
import { getDialogueLines, isMyLine, isOtherLine, isDirection } from '../lib/rehearsalEngine';
import { useTTS } from './useTTS';
import { useSTT } from './useSTT';

export function useRehearsal(config: SessionConfig | null) {
  const [state, setState] = useState<RehearsalState>('IDLE');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [offBook, setOffBook] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

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

  // Initialize lines when config changes
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

  const processLine = useCallback(async (index: number) => {
    const currentLines = linesRef.current;
    const currentConfig = configRef.current;
    if (!currentConfig || index >= currentLines.length) {
      setState('COMPLETE');
      return;
    }

    const line = currentLines[index];
    setCurrentIndex(index);

    if (isDirection(line)) {
      // Show direction briefly, then auto-advance
      setState('PLAYING_OTHER');
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (stateRef.current === 'PAUSED') return;
      processLine(index + 1);
      return;
    }

    if (isOtherLine(line, currentConfig.myCharacter)) {
      setState('PLAYING_OTHER');
      try {
        await tts.speak(line.text, line.character);
      } catch {
        // TTS error — just continue
      }
      if (stateRef.current === 'PAUSED') return;
      // After speaking other character's line, move to next
      processLine(index + 1);
      return;
    }

    if (isMyLine(line, currentConfig.myCharacter)) {
      setState('WAITING_FOR_USER');

      if (autoAdvanceRef.current && stt.isSupported) {
        // Start listening for user to speak
        stt.startListening(() => {
          // Speech ended — advance to next line
          if (stateRef.current === 'WAITING_FOR_USER' || stateRef.current === 'USER_SPEAKING') {
            processLine(currentIndexRef.current + 1);
          }
        });
      }
      // Otherwise wait for manual advance
      return;
    }
  }, [tts, stt]);

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
    setState('PAUSED');
  }, [tts, stt]);

  const skip = useCallback(() => {
    tts.stop();
    stt.stopListening();
    const next = currentIndex + 1;
    if (next < lines.length) {
      processLine(next);
    } else {
      setState('COMPLETE');
    }
  }, [currentIndex, lines.length, tts, stt, processLine]);

  const back = useCallback(() => {
    tts.stop();
    stt.stopListening();
    const prev = Math.max(0, currentIndex - 1);
    processLine(prev);
  }, [currentIndex, tts, stt, processLine]);

  const goToLine = useCallback((index: number) => {
    tts.stop();
    stt.stopListening();
    processLine(Math.max(0, Math.min(index, lines.length - 1)));
  }, [lines.length, tts, stt, processLine]);

  const restart = useCallback(() => {
    tts.stop();
    stt.stopListening();
    setCurrentIndex(0);
    setState('IDLE');
  }, [tts, stt]);

  const advance = useCallback(() => {
    // Manual advance — used when user taps to move to next line
    stt.stopListening();
    processLine(currentIndex + 1);
  }, [currentIndex, stt, processLine]);

  const toggleOffBook = useCallback(() => {
    setOffBook(prev => !prev);
  }, []);

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance(prev => !prev);
  }, []);

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
