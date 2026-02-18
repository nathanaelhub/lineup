interface MicIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export function MicIndicator({ isListening, isSpeaking }: MicIndicatorProps) {
  if (!isListening) return null;

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      transition-all duration-300
      ${isSpeaking
        ? 'bg-success/20 text-success'
        : 'bg-accent/20 text-accent-glow'
      }
    `}>
      <div className="relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {isSpeaking && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
        )}
      </div>
      <span>{isSpeaking ? 'Hearing you...' : 'Listening...'}</span>
    </div>
  );
}
