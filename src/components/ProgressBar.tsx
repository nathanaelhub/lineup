interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
}

export function ProgressBar({ current, total, percentage }: ProgressBarProps) {
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-text-muted px-1">
        <span>Line {current + 1} of {total}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
