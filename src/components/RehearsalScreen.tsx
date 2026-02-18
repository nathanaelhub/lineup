import { useEffect, useCallback } from 'react';
import type { SessionConfig } from '../types';
import { useRehearsal } from '../hooks/useRehearsal';
import { LineDisplay } from './LineDisplay';
import { ProgressBar } from './ProgressBar';
import { TransportControls } from './TransportControls';
import { MicIndicator } from './MicIndicator';
import { LineTimer } from './LineTimer';

interface RehearsalScreenProps {
  config: SessionConfig;
  onExit: () => void;
}

export function RehearsalScreen({ config, onExit }: RehearsalScreenProps) {
  const rehearsal = useRehearsal(config);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      rehearsal.skip();
    }
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      rehearsal.back();
    }
    if (e.code === 'Escape') {
      rehearsal.pause();
    }
  }, [rehearsal]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
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

          <MicIndicator
            isListening={rehearsal.stt.isListening}
            isSpeaking={rehearsal.stt.isSpeaking}
          />

          <LineTimer
            elapsed={rehearsal.lineElapsed}
            isRunning={rehearsal.state === 'PLAYING_OTHER'}
          />
        </div>

        <ProgressBar
          current={rehearsal.progress.currentLineIndex}
          total={rehearsal.progress.totalLines}
          percentage={rehearsal.progress.percentage}
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
      >
        {rehearsal.state === 'COMPLETE' ? (
          <CompleteView onRestart={rehearsal.restart} onExit={onExit} />
        ) : (
          <LineDisplay
            line={rehearsal.currentLine}
            characters={config.script.characters}
            myCharacter={config.myCharacter}
            offBook={rehearsal.offBook}
            isActive={rehearsal.state !== 'IDLE'}
          />
        )}
      </div>

      {/* Transport controls */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        <TransportControls
          state={rehearsal.state}
          speed={rehearsal.tts.speed}
          autoAdvance={rehearsal.autoAdvance}
          offBook={rehearsal.offBook}
          onPlay={rehearsal.play}
          onPause={rehearsal.pause}
          onSkip={rehearsal.skip}
          onBack={rehearsal.back}
          onAdvance={rehearsal.advance}
          onSpeedChange={rehearsal.tts.changeSpeed}
          onToggleAutoAdvance={rehearsal.toggleAutoAdvance}
          onToggleOffBook={rehearsal.toggleOffBook}
        />
      </div>
    </div>
  );
}

function CompleteView({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
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
