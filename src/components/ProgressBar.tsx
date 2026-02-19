interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
  loopStart?: number | null;
  loopEnd?: number | null;
}

export function ProgressBar({ current, total, percentage, loopStart, loopEnd }: ProgressBarProps) {
  const hasLoop = loopStart !== null && loopStart !== undefined &&
                  loopEnd !== null && loopEnd !== undefined &&
                  loopStart < loopEnd;
  const loopLeft = hasLoop ? (loopStart! / total) * 100 : 0;
  const loopWidth = hasLoop ? ((loopEnd! - loopStart! + 1) / total) * 100 : 0;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-text-muted px-1">
        <span>Line {current + 1} of {total}</span>
        {hasLoop
          ? <span className="text-accent">↩ {loopStart! + 1}–{loopEnd! + 1}</span>
          : <span>{percentage}%</span>
        }
      </div>
      <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden relative">
        {hasLoop && (
          <div
            className="absolute h-full bg-accent/25 rounded-full"
            style={{ left: `${loopLeft}%`, width: `${loopWidth}%` }}
          />
        )}
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
