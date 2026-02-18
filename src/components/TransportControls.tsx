import type { RehearsalState } from '../types';

interface TransportControlsProps {
  state: RehearsalState;
  speed: number;
  autoAdvance: boolean;
  offBook: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBack: () => void;
  onAdvance: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleAutoAdvance: () => void;
  onToggleOffBook: () => void;
}

const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5];

export function TransportControls({
  state,
  speed,
  autoAdvance,
  offBook,
  onPlay,
  onPause,
  onSkip,
  onBack,
  onAdvance,
  onSpeedChange,
  onToggleAutoAdvance,
  onToggleOffBook,
}: TransportControlsProps) {
  const isPlaying = state === 'PLAYING_OTHER' || state === 'WAITING_FOR_USER' || state === 'USER_SPEAKING';
  const isWaiting = state === 'WAITING_FOR_USER';

  return (
    <div className="space-y-4">
      {/* Main transport buttons */}
      <div className="flex items-center justify-center gap-3">
        {/* Back */}
        <button
          onClick={onBack}
          disabled={state === 'IDLE'}
          className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center
            text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80
            disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        {isPlaying ? (
          <button
            onClick={onPause}
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center
              text-white hover:bg-accent-glow transition-all active:scale-95 shadow-lg shadow-accent/30"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center
              text-white hover:bg-accent-glow transition-all active:scale-95 shadow-lg shadow-accent/30"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Skip / Advance */}
        <button
          onClick={isWaiting ? onAdvance : onSkip}
          disabled={state === 'IDLE'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            ${isWaiting
              ? 'bg-success/20 text-success hover:bg-success/30 ring-2 ring-success/50 animate-pulse'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 18l8.5-6L5 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Tap to advance hint */}
      {isWaiting && !autoAdvance && (
        <button
          onClick={onAdvance}
          className="w-full py-3 text-center text-accent text-sm font-medium
            bg-accent/5 rounded-xl border border-accent/20 hover:bg-accent/10
            transition-all active:scale-[0.98]"
        >
          Tap anywhere or press Space to continue
        </button>
      )}

      {/* Secondary controls */}
      <div className="flex items-center justify-between px-2">
        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                ${Math.abs(speed - s) < 0.01
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
                }
              `}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Mode toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoAdvance}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${autoAdvance
                ? 'bg-success/20 text-success'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }
            `}
            title="Auto-advance with voice detection"
          >
            Auto
          </button>
          <button
            onClick={onToggleOffBook}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
              ${offBook
                ? 'bg-warning/20 text-warning'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }
            `}
            title="Hide your lines for off-book practice"
          >
            Off-book
          </button>
        </div>
      </div>
    </div>
  );
}
