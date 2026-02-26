import type { RehearsalState } from '../types';

interface TransportControlsProps {
  state: RehearsalState;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBack: () => void;
  onAdvance: () => void;
}

export function TransportControls({
  state,
  onPlay,
  onPause,
  onSkip,
  onBack,
  onAdvance,
}: TransportControlsProps) {
  const isIdle = state === 'IDLE';
  const showAdvance = state === 'WAITING_FOR_USER' || state === 'USER_SPEAKING';
  const showResume = state === 'PAUSED';

  let centreLabel: string;
  let centreAction: () => void;
  let centreClass: string;

  if (showAdvance) {
    centreLabel = 'Next →';
    centreAction = onAdvance;
    centreClass = 'bg-accent text-accent-foreground';
  } else if (isIdle) {
    centreLabel = 'Start';
    centreAction = onPlay;
    centreClass = 'bg-accent text-accent-foreground';
  } else if (showResume) {
    centreLabel = 'Resume';
    centreAction = onPlay;
    centreClass = 'bg-accent text-accent-foreground';
  } else {
    centreLabel = 'Pause';
    centreAction = onPause;
    centreClass = 'bg-bg-secondary text-text-primary';
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        disabled={isIdle}
        className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center
          text-text-secondary hover:text-text-primary disabled:opacity-30
          disabled:cursor-not-allowed transition-all active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 6l-8 6 8 6V6zm9 0l-8 6 8 6V6z" />
        </svg>
      </button>

      <button
        onClick={centreAction}
        className={`flex-1 h-14 rounded-2xl font-semibold text-base transition-all active:scale-95 ${centreClass}`}
      >
        {centreLabel}
      </button>

      <button
        onClick={onSkip}
        disabled={isIdle}
        className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center
          text-text-secondary hover:text-text-primary disabled:opacity-30
          disabled:cursor-not-allowed transition-all active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 6l8 6-8 6V6zm-9 0l8 6-8 6V6z" />
        </svg>
      </button>
    </div>
  );
}
