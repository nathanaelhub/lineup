import { useState, useEffect } from 'react';
import type { TranscriptFeedback as FeedbackData } from '../types';

interface Props {
  feedback: FeedbackData | null;
}

export function TranscriptFeedback({ feedback }: Props) {
  const [shown, setShown] = useState<FeedbackData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    setShown(feedback);
    setVisible(true);
    const fadeTimer = setTimeout(() => setVisible(false), 2800);
    const clearTimer = setTimeout(() => setShown(null), 3500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [feedback]);

  if (!shown) return null;

  const { score, heard } = shown;
  const scoreColor =
    score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error';
  const bgColor =
    score >= 80 ? 'bg-success/10' : score >= 50 ? 'bg-warning/10' : 'bg-error/10';
  const label =
    score >= 90 ? 'Perfect' : score >= 80 ? 'Close' : score >= 50 ? 'Okay' : 'Off';

  return (
    <div
      className={`px-4 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className={`${bgColor} rounded-xl px-4 py-2.5 flex items-center gap-3`}>
        <p className="flex-1 text-sm text-text-secondary truncate min-w-0">
          <span className="text-text-muted text-xs mr-1">heard:</span>
          "{heard}"
        </p>
        <div className="shrink-0 flex items-center gap-1.5">
          <span className={`text-xs font-medium ${scoreColor}`}>{label}</span>
          <span className={`text-sm font-bold ${scoreColor}`}>{score}%</span>
        </div>
      </div>
    </div>
  );
}
