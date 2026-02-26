interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Playback
  speed: number;
  onSpeedChange: (speed: number) => void;
  // Modes
  autoAdvance: boolean;
  offBook: boolean;
  cueMode: boolean;
  justMyCues: boolean;
  onToggleAutoAdvance: () => void;
  onToggleOffBook: () => void;
  onToggleCueMode: () => void;
  onToggleJustMyCues: () => void;
  // Loop
  loopStart: number | null;
  loopEnd: number | null;
  loopIteration: number;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  // Navigation
  onOpenJumpMenu: () => void;
  // Stats
  runStats: { accuracy: number; avgTime: number; stumbles: number };
  // PWA
  isPWAInstallable?: boolean;
  onInstall?: () => void;
}

export function SettingsDrawer({
  isOpen, onClose,
  speed, onSpeedChange,
  autoAdvance, offBook, cueMode, justMyCues,
  onToggleAutoAdvance, onToggleOffBook, onToggleCueMode, onToggleJustMyCues,
  loopStart, loopEnd, loopIteration,
  onSetLoopStart, onSetLoopEnd, onClearLoop,
  onOpenJumpMenu,
  runStats,
  isPWAInstallable, onInstall,
}: SettingsDrawerProps) {
  const hasStats = runStats.accuracy > 0 || runStats.avgTime > 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div className={`fixed top-0 right-0 h-full w-72 z-50 bg-bg-secondary shadow-2xl
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-bg-tertiary">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Modes */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Modes</p>
            <DrawerToggle label="Auto-advance" description="Mic detects when you finish" checked={autoAdvance} onChange={onToggleAutoAdvance} />
            <DrawerToggle label="Off-book" description="Hides your lines" checked={offBook} onChange={onToggleOffBook} />
            <DrawerToggle label="Cue mode" description="Last 3 words only" checked={cueMode} onChange={onToggleCueMode} />
            <DrawerToggle label="Just my cues" description="Off-book + cue mode" checked={justMyCues} onChange={onToggleJustMyCues} />
          </section>

          {/* Speed */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Speed</p>
            <div className="flex gap-1">
              {[0.75, 1.0, 1.25, 1.5].map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${Math.abs(speed - s) < 0.01 ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </section>

          {/* Loop */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">
              Loop {loopIteration > 0 ? `(×${loopIteration})` : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onSetLoopStart}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                  ${loopStart !== null ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              >
                {loopStart !== null ? `A: ${loopStart + 1}` : 'Set A'}
              </button>
              <button
                onClick={onSetLoopEnd}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                  ${loopEnd !== null ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              >
                {loopEnd !== null ? `B: ${loopEnd + 1}` : 'Set B'}
              </button>
              {(loopStart !== null || loopEnd !== null) && (
                <button
                  onClick={onClearLoop}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-bg-tertiary text-text-muted hover:text-error transition-all"
                >
                  ✕
                </button>
              )}
            </div>
          </section>

          {/* Navigation */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Navigation</p>
            <button
              onClick={() => { onOpenJumpMenu(); onClose(); }}
              className="w-full py-2.5 rounded-lg text-sm text-text-secondary bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors text-left px-3"
            >
              Jump to line…
            </button>
          </section>

          {/* Stats */}
          {hasStats && (
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">This run</p>
              <div className="flex gap-2">
                <StatPill label="Accuracy" value={`${runStats.accuracy}%`}
                  color={runStats.accuracy >= 80 ? 'text-success' : runStats.accuracy >= 50 ? 'text-warning' : 'text-error'} />
                <StatPill label="Avg/line" value={`${runStats.avgTime}s`} color="text-text-primary" />
                <StatPill label="Stumbles" value={`${runStats.stumbles}`} color="text-warning" />
              </div>
            </section>
          )}

          {/* PWA install */}
          {isPWAInstallable && onInstall && (
            <button
              onClick={onInstall}
              className="w-full py-2.5 rounded-lg text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              Add to Home Screen
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerToggle({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between bg-bg-tertiary rounded-xl px-3 py-2.5 hover:bg-bg-tertiary/80 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 ml-3 ${checked ? 'bg-accent' : 'bg-bg-secondary'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 bg-bg-tertiary rounded-lg p-2 flex flex-col items-center gap-0.5">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
