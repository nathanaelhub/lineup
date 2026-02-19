import { useEffect, useCallback, useState } from 'react';
import type { SessionConfig } from '../types';
import { useRehearsal } from '../hooks/useRehearsal';
import { useSwipe } from '../hooks/useSwipe';
import { LineDisplay } from './LineDisplay';
import { ProgressBar } from './ProgressBar';
import { TransportControls } from './TransportControls';
import { MicIndicator } from './MicIndicator';
import { LineTimer } from './LineTimer';
import { TranscriptFeedback } from './TranscriptFeedback';
import { ScriptJumpMenu } from './ScriptJumpMenu';

interface RehearsalScreenProps {
  config: SessionConfig;
  onExit: () => void;
  installPrompt?: any;
  onInstall?: () => void;
}

export function RehearsalScreen({ config, onExit, installPrompt, onInstall }: RehearsalScreenProps) {
  const rehearsal = useRehearsal(config);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);

  const swipe = useSwipe(rehearsal.back, () => {
    if (rehearsal.state === 'WAITING_FOR_USER') {
      rehearsal.advance();
    } else {
      rehearsal.skip();
    }
  });

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (jumpMenuOpen) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (rehearsal.state === 'WAITING_FOR_USER') {
        rehearsal.advance();
      } else if (rehearsal.state === 'IDLE' || rehearsal.state === 'PAUSED') {
        rehearsal.play();
      } else {
        rehearsal.pause();
      }
    }
    if (e.code === 'ArrowRight' && rehearsal.state !== 'IDLE') {
      e.preventDefault();
      rehearsal.skip();
    }
    if (e.code === 'ArrowLeft' && rehearsal.state !== 'IDLE') {
      e.preventDefault();
      rehearsal.back();
    }
    if (e.code === 'Escape') {
      rehearsal.pause();
    }
  }, [rehearsal, jumpMenuOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Jump menu overlay */}
      {jumpMenuOpen && (
        <ScriptJumpMenu
          lines={rehearsal.lines}
          characters={config.script.characters}
          onJump={(index) => rehearsal.goToLine(index)}
          onClose={() => setJumpMenuOpen(false)}
        />
      )}

      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              rehearsal.pause();
              onExit();
            }}
            className="p-2 -ml-2 rounded-xl text-text-muted hover:text-text-primary
              hover:bg-bg-tertiary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <MicIndicator
              isListening={rehearsal.stt.isListening}
              isSpeaking={rehearsal.stt.isSpeaking}
            />
            {rehearsal.runCount > 0 && (
              <span className="text-xs text-text-muted font-medium tabular-nums">
                Run {rehearsal.runCount}
              </span>
            )}
          </div>

          <LineTimer
            elapsed={rehearsal.lineElapsed}
            isRunning={rehearsal.state === 'PLAYING_OTHER'}
          />
        </div>

        <ProgressBar
          current={rehearsal.progress.currentLineIndex}
          total={rehearsal.progress.totalLines}
          percentage={rehearsal.progress.percentage}
          loopStart={rehearsal.loopStart}
          loopEnd={rehearsal.loopEnd}
        />
      </div>

      {/* Main content: line display */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden px-4"
        onClick={() => {
          if (rehearsal.state === 'WAITING_FOR_USER') {
            rehearsal.advance();
          }
        }}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        {rehearsal.state === 'COMPLETE' ? (
          <CompleteView
            onRestart={rehearsal.restart}
            onExit={onExit}
            runStats={rehearsal.runStats}
          />
        ) : (
          <LineDisplay
            line={rehearsal.currentLine}
            characters={config.script.characters}
            myCharacter={config.myCharacter}
            offBook={rehearsal.offBook}
            cueMode={rehearsal.cueMode}
            isActive={rehearsal.state !== 'IDLE'}
          />
        )}
      </div>

      {/* Transcript feedback */}
      <div className="shrink-0">
        <TranscriptFeedback feedback={rehearsal.lastFeedback} />
      </div>

      {/* Transport controls */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        <TransportControls
          state={rehearsal.state}
          speed={rehearsal.tts.speed}
          autoAdvance={rehearsal.autoAdvance}
          offBook={rehearsal.offBook}
          cueMode={rehearsal.cueMode}
          justMyCues={rehearsal.justMyCues}
          loopStart={rehearsal.loopStart}
          loopEnd={rehearsal.loopEnd}
          loopIteration={rehearsal.loopIteration}
          isPWAInstallable={!!installPrompt}
          onPlay={rehearsal.play}
          onPause={rehearsal.pause}
          onSkip={rehearsal.skip}
          onBack={rehearsal.back}
          onAdvance={rehearsal.advance}
          onSpeedChange={rehearsal.tts.changeSpeed}
          onToggleAutoAdvance={rehearsal.toggleAutoAdvance}
          onToggleOffBook={rehearsal.toggleOffBook}
          onToggleCueMode={rehearsal.toggleCueMode}
          onToggleJustMyCues={() => rehearsal.toggleJustMyCues(rehearsal.offBook, rehearsal.cueMode)}
          onSetLoopStart={rehearsal.setLoopStart}
          onSetLoopEnd={rehearsal.setLoopEnd}
          onClearLoop={rehearsal.clearLoop}
          onOpenJumpMenu={() => setJumpMenuOpen(true)}
          onInstall={onInstall}
        />
      </div>
    </div>
  );
}

function CompleteView({
  onRestart,
  onExit,
  runStats,
}: {
  onRestart: () => void;
  onExit: () => void;
  runStats: { accuracy: number; avgTime: number; stumbles: number };
}) {
  const hasStats = runStats.accuracy > 0 || runStats.avgTime > 0;
  const accuracyColor =
    runStats.accuracy >= 80 ? 'text-success' :
    runStats.accuracy >= 50 ? 'text-warning' :
    'text-error';

  return (
    <div className="text-center space-y-6 px-6">
      <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Scene Complete</h2>
        <p className="mt-2 text-text-muted">Great rehearsal! Keep it up.</p>
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="flex gap-3 justify-center">
          <div className="bg-bg-secondary rounded-xl p-4 flex flex-col items-center gap-1 min-w-16">
            <span className={`text-2xl font-bold ${accuracyColor}`}>{runStats.accuracy}%</span>
            <span className="text-xs text-text-muted">Accuracy</span>
          </div>
          <div className="bg-bg-secondary rounded-xl p-4 flex flex-col items-center gap-1 min-w-16">
            <span className="text-2xl font-bold text-text-primary">{runStats.avgTime}s</span>
            <span className="text-xs text-text-muted">Avg/line</span>
          </div>
          <div className="bg-bg-secondary rounded-xl p-4 flex flex-col items-center gap-1 min-w-16">
            <span className="text-2xl font-bold text-warning">{runStats.stumbles}</span>
            <span className="text-xs text-text-muted">Stumbles</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 max-w-xs mx-auto">
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-medium
            hover:bg-accent-glow transition-all active:scale-[0.98]"
        >
          Run Again
        </button>
        <button
          onClick={onExit}
          className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-secondary font-medium
            hover:bg-bg-tertiary/80 transition-all active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
