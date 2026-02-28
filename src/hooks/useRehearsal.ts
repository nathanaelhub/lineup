import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptLine, SessionConfig, RehearsalState, TranscriptFeedback } from '../types';
import { getDialogueLines, isMyLine, isOtherLine, isDirection } from '../lib/rehearsalEngine';
import { compareTranscript } from '../lib/sttListener';
import { speakWithElevenLabs, stopElevenLabsAudio } from '../lib/elevenLabsEngine';
import { savePosition, clearPosition } from '../utils/storage';
import { useTTS } from './useTTS';
import { useSTT } from './useSTT';

export function useRehearsal(config: SessionConfig | null) {
  const [state, setState] = useState<RehearsalState>('IDLE');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [offBook, setOffBook] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [cueMode, setCueMode] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<TranscriptFeedback | null>(null);
  // Loop state
  const [loopStart, setLoopStartLine] = useState<number | null>(null);
  const [loopEnd, setLoopEndLine] = useState<number | null>(null);
  const [loopIteration, setLoopIteration] = useState(0);
  // Timer state
  const [lineElapsed, setLineElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lineElapsedRef = useRef(0);

  // Per-run stats
  const lineStatsRef = useRef<Array<{ score: number; elapsed: number }>>([]);

  const tts = useTTS();
  const stt = useSTT();

  const stateRef = useRef(state);
  stateRef.current = state;
  const generationRef = useRef(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const configRef = useRef(config);
  configRef.current = config;
  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;
  const loopStartRef = useRef(loopStart);
  loopStartRef.current = loopStart;
  const loopEndRef = useRef(loopEnd);
  loopEndRef.current = loopEnd;

  const startTimer = useCallback(() => {
    lineElapsedRef.current = 0;
    setLineElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      lineElapsedRef.current += 1;
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
      setCueMode(config.cueMode);
      tts.assignVoices(config.script.characters, config.characterPitchMap);
      tts.changeSpeed(config.speed);
    }
  }, [config]);

  // Auto-save position every time currentIndex changes (but not at 0)
  useEffect(() => {
    if (!configRef.current || currentIndex <= 0) return;
    savePosition(configRef.current.script.title, currentIndex, configRef.current.myCharacter);
  }, [currentIndex]);

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
    const gen = generationRef.current;

    // Loop wrap: if both markers are set and we've passed B, jump back to A
    const ls = loopStartRef.current;
    const le = loopEndRef.current;
    if (ls !== null && le !== null && ls < le && index > le) {
      setLoopIteration(prev => prev + 1);
      processLine(ls);
      return;
    }

    const currentLines = linesRef.current;
    const currentConfig = configRef.current;
    if (!currentConfig || index >= currentLines.length) {
      stopTimer();
      setState('COMPLETE');
      return;
    }

    const line = currentLines[index];
    currentIndexRef.current = index; // Sync immediately so skip/back see the right index
    setCurrentIndex(index);
    stopTimer();
    lineElapsedRef.current = 0;
    setLineElapsed(0);

    if (isDirection(line)) {
      setState('PLAYING_OTHER');
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (generationRef.current !== gen) return;
      processLine(index + 1);
      return;
    }

    if (isOtherLine(line, currentConfig.myCharacter)) {
      setState('PLAYING_OTHER');
      if (currentConfig.ttsEnabled === false) {
        // TTS off: display line and wait for user to advance manually
        startTimer();
        return;
      }
      startTimer();
      try {
        await speakLine(line.text, line.character);
      } catch {
        // TTS error — continue
      }
      stopTimer();
      if (generationRef.current !== gen) return;
      processLine(index + 1);
      return;
    }

    if (isMyLine(line, currentConfig.myCharacter)) {
      setLastFeedback(null);
      setState('WAITING_FOR_USER');
      startTimer();
      if (autoAdvanceRef.current && stt.isSupported) {
        setTimeout(() => {
          if (generationRef.current !== gen) return;
          if (stateRef.current !== 'WAITING_FOR_USER') return;
          stt.startListening(() => {
            if (generationRef.current !== gen) return;
            const heard = stt.transcriptRef.current;
            let score = -1;
            if (heard) {
              const expected = linesRef.current[currentIndexRef.current]?.text || '';
              score = compareTranscript(expected, heard);
              setLastFeedback({ heard, score });
            }
            lineStatsRef.current.push({ score, elapsed: lineElapsedRef.current });
            if (stateRef.current === 'WAITING_FOR_USER' || stateRef.current === 'USER_SPEAKING') {
              processLine(currentIndexRef.current + 1);
            }
          });
        }, 200);
      }
      return;
    }
  }, [tts, stt, speakLine, startTimer, stopTimer]);

  const play = useCallback(() => {
    if (state === 'PAUSED') {
      generationRef.current++;
      tts.resume();
      setState('PLAYING_OTHER');
      processLine(currentIndexRef.current);
      return;
    }
    generationRef.current++;
    const isFirstPlay = runCount === 0;
    setRunCount(prev => prev + 1);
    const start = isFirstPlay ? (configRef.current?.startIndex ?? 0) : 0;
    processLine(start);
  }, [state, currentIndex, processLine, tts]);

  const pause = useCallback(() => {
    generationRef.current++;
    tts.stop();
    stopElevenLabsAudio();
    stt.stopListening();
    stopTimer();
    setState('PAUSED');
  }, [tts, stt, stopTimer]);

  const skip = useCallback(() => {
    generationRef.current++;
    tts.stop();
    stopElevenLabsAudio();
    stt.stopListening();
    stopTimer();
    const next = currentIndexRef.current + 1;
    if (next < linesRef.current.length) {
      processLine(next);
    } else {
      setState('COMPLETE');
    }
  }, [tts, stt, stopTimer, processLine]);

  const back = useCallback(() => {
    generationRef.current++;
    tts.stop();
    stopElevenLabsAudio();
    stt.stopListening();
    stopTimer();
    const prev = Math.max(0, currentIndexRef.current - 1);
    processLine(prev);
  }, [tts, stt, stopTimer, processLine]);

  const goToLine = useCallback((index: number) => {
    generationRef.current++;
    tts.stop();
    stopElevenLabsAudio();
    stt.stopListening();
    stopTimer();
    processLine(Math.max(0, Math.min(index, lines.length - 1)));
  }, [lines.length, tts, stt, stopTimer, processLine]);

  const restart = useCallback(() => {
    generationRef.current++;
    tts.stop();
    stopElevenLabsAudio();
    stt.stopListening();
    stopTimer();
    lineStatsRef.current = [];
    lineElapsedRef.current = 0;
    setCurrentIndex(0);
    setLineElapsed(0);
    setLoopIteration(0);
    setLoopStartLine(null);
    setLoopEndLine(null);
    setState('IDLE');
    if (configRef.current) clearPosition(configRef.current.script.title);
  }, [tts, stt, stopTimer]);

  const advance = useCallback(() => {
    generationRef.current++;
    const currentLine = linesRef.current[currentIndexRef.current];
    if (currentLine && isMyLine(currentLine, configRef.current?.myCharacter || '')) {
      const heard = stt.transcriptRef.current;
      let score = -1;
      if (heard) {
        score = compareTranscript(currentLine.text, heard);
        setLastFeedback({ heard, score });
      }
      lineStatsRef.current.push({ score, elapsed: lineElapsedRef.current });
    }
    stt.stopListening();
    processLine(currentIndexRef.current + 1);
  }, [stt, processLine]);

  const toggleOffBook = useCallback(() => setOffBook(prev => !prev), []);
  const toggleAutoAdvance = useCallback(() => setAutoAdvance(prev => !prev), []);
  const toggleCueMode = useCallback(() => setCueMode(prev => !prev), []);
  const toggleJustMyCues = useCallback((offBookVal: boolean, cueModeVal: boolean) => {
    const newVal = !(offBookVal && cueModeVal);
    setOffBook(newVal);
    setCueMode(newVal);
  }, []);
  const setLoopStart = useCallback(() => setLoopStartLine(currentIndex), [currentIndex]);
  const setLoopEnd = useCallback(() => setLoopEndLine(currentIndex), [currentIndex]);
  const clearLoop = useCallback(() => {
    setLoopStartLine(null);
    setLoopEndLine(null);
    setLoopIteration(0);
  }, []);

  const currentLine = lines[currentIndex] || null;
  const progress = {
    currentLineIndex: currentIndex,
    totalLines: lines.length,
    percentage: lines.length > 0 ? Math.round((currentIndex / lines.length) * 100) : 0,
  };

  const justMyCues = offBook && cueMode;

  // Compute run stats from accumulated per-line data
  const scoredStats = lineStatsRef.current.filter(s => s.score >= 0);
  const runStats = {
    accuracy: scoredStats.length > 0
      ? Math.round(scoredStats.reduce((a, s) => a + s.score, 0) / scoredStats.length)
      : 0,
    avgTime: lineStatsRef.current.length > 0
      ? Math.round(lineStatsRef.current.reduce((a, s) => a + s.elapsed, 0) / lineStatsRef.current.length)
      : 0,
    stumbles: scoredStats.filter(s => s.score < 70).length,
  };

  return {
    state,
    currentLine,
    currentIndex,
    lines,
    progress,
    offBook,
    autoAdvance,
    cueMode,
    justMyCues,
    runCount,
    lastFeedback,
    lineElapsed,
    runStats,
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
    toggleCueMode,
    toggleJustMyCues,
    loopStart,
    loopEnd,
    loopIteration,
    setLoopStart,
    setLoopEnd,
    clearLoop,
  };
}
