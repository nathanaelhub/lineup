interface LineTimerProps {
  elapsed: number; // seconds
  isRunning: boolean;
}

export function LineTimer({ elapsed, isRunning }: LineTimerProps) {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = `${mins > 0 ? `${mins}:` : ''}${secs.toString().padStart(mins > 0 ? 2 : 1, '0')}s`;

  if (!isRunning && elapsed === 0) return null;

  return (
    <div className={`
      flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium
      transition-all duration-300
      ${isRunning
        ? 'bg-warning/15 text-warning'
        : 'bg-bg-tertiary text-text-muted'
      }
    `}>
      <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-warning animate-pulse' : 'bg-text-muted'}`} />
      {display}
    </div>
  );
}
