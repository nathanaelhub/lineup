import type { RehearsalState } from '../types';
import { vibrate } from '../utils/haptics';

interface TransportControlsProps {
  state: RehearsalState;
  speed: number;
  autoAdvance: boolean;
  offBook: boolean;
  cueMode: boolean;
  justMyCues: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  loopIteration: number;
  isPWAInstallable?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBack: () => void;
  onAdvance: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleAutoAdvance: () => void;
  onToggleOffBook: () => void;
  onToggleCueMode: () => void;
  onToggleJustMyCues: () => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  onOpenJumpMenu: () => void;
  onInstall?: () => void;
}

const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5];

export function TransportControls({
  state, speed, autoAdvance, offBook, cueMode, justMyCues,
  loopStart, loopEnd, loopIteration,
  isPWAInstallable, onInstall,
  onPlay, onPause, onSkip, onBack, onAdvance,
  onSpeedChange, onToggleAutoAdvance, onToggleOffBook, onToggleCueMode, onToggleJustMyCues,
  onSetLoopStart, onSetLoopEnd, onClearLoop,
  onOpenJumpMenu,
}: TransportControlsProps) {
  const isPlaying = state === 'PLAYING_OTHER' || state === 'WAITING_FOR_USER' || state === 'USER_SPEAKING';
  const isWaiting = state === 'WAITING_FOR_USER';

  const handlePlay = () => { vibrate([30, 20, 30]); onPlay(); };
  const handlePause = () => { onPause(); };
  const handleBack = () => { vibrate(20); onBack(); };
  const handleSkip = () => { vibrate(20); onSkip(); };
  const handleAdvance = () => { vibrate(20); onAdvance(); };

  return (
    <div className="space-y-4">
      {/* Main transport buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleBack}
          disabled={state === 'IDLE'}
          className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center
            text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80
            disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Previous line (← arrow)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {isPlaying ? (
          <button
            onClick={handlePause}
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center
              text-white hover:bg-accent-glow transition-all active:scale-95 shadow-lg shadow-accent/30"
            title="Pause (Space)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center
              text-white hover:bg-accent-glow transition-all active:scale-95 shadow-lg shadow-accent/30"
            title="Play (Space)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        <button
          onClick={isWaiting ? handleAdvance : handleSkip}
          disabled={state === 'IDLE'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            ${isWaiting
              ? 'bg-success/20 text-success hover:bg-success/30 ring-2 ring-success/50 animate-pulse'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
            }`}
          title="Next line (→ arrow or swipe right)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 18l8.5-6L5 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Loop controls */}
      {(() => {
        const hasLoop = loopStart !== null && loopEnd !== null && loopStart < loopEnd;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={onSetLoopStart}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                ${loopStart !== null
                  ? 'bg-accent/20 text-accent'
                  : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              title="Mark loop start at current line"
            >
              {loopStart !== null ? `A: ${loopStart + 1}` : 'Set A'}
            </button>

            {hasLoop ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-accent text-xs font-medium">
                  ↩{loopIteration > 0 ? ` ×${loopIteration}` : ''}
                </span>
                <button
                  onClick={onClearLoop}
                  className="w-5 h-5 rounded-full bg-bg-tertiary text-text-muted
                    hover:text-text-primary hover:bg-bg-tertiary/80 flex items-center justify-center
                    text-xs transition-all"
                  title="Clear loop"
                >×</button>
              </div>
            ) : (
              <div className="shrink-0 w-px h-3 bg-bg-tertiary" />
            )}

            <button
              onClick={onSetLoopEnd}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                ${loopEnd !== null
                  ? 'bg-accent/20 text-accent'
                  : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              title="Mark loop end at current line"
            >
              {loopEnd !== null ? `B: ${loopEnd + 1}` : 'Set B'}
            </button>
          </div>
        );
      })()}

      {/* Waiting hint */}
      {isWaiting && !autoAdvance && (
        <button
          onClick={handleAdvance}
          className="w-full py-3 text-center text-accent text-sm font-medium
            bg-accent/5 rounded-xl border border-accent/20 hover:bg-accent/10
            transition-all active:scale-[0.98]"
        >
          Tap · swipe right · or press Space
        </button>
      )}

      {/* Secondary controls */}
      <div className="flex items-center justify-between px-2">
        {/* Speed */}
        <div className="flex items-center gap-1">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                ${Math.abs(speed - s) < 0.01
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
                }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Mode toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleAutoAdvance}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${autoAdvance ? 'bg-success/20 text-success' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}`}
            title="Auto-advance with mic"
          >
            Auto
          </button>
          <button
            onClick={onToggleCueMode}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${cueMode ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}`}
            title="Show only last 3 words of other character's line"
          >
            Cue
          </button>
          <button
            onClick={onToggleOffBook}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${offBook ? 'bg-warning/20 text-warning' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}`}
            title="Hide your lines"
          >
            Off-book
          </button>
          <button
            onClick={onToggleJustMyCues}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${justMyCues ? 'bg-accent/30 text-accent ring-1 ring-accent/40' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}`}
            title="Cue mode + off-book combined"
          >
            Cues
          </button>
          <button
            onClick={onOpenJumpMenu}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all text-text-muted hover:text-text-secondary hover:bg-bg-tertiary"
            title="Jump to line"
          >
            ☰
          </button>
        </div>
      </div>

      {/* PWA install */}
      {isPWAInstallable && onInstall && (
        <button
          onClick={onInstall}
          className="w-full py-2 rounded-xl bg-bg-secondary border border-bg-tertiary
            text-text-muted text-xs font-medium hover:text-text-secondary hover:bg-bg-tertiary
            transition-all active:scale-[0.98]"
        >
          Install App
        </button>
      )}
    </div>
  );
}
