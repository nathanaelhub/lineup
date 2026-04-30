import { useEffect, useCallback, useState } from 'react';
import type { SessionConfig } from '../types';
import { useRehearsal } from '../hooks/useRehearsal';
import { useSwipe } from '../hooks/useSwipe';
import { LineDisplay } from './LineDisplay';
import { MicIndicator } from './MicIndicator';
import { LineTimer } from './LineTimer';
import { TranscriptFeedback } from './TranscriptFeedback';
import { ScriptJumpMenu } from './ScriptJumpMenu';
import { SettingsDrawer } from './SettingsDrawer';
import { ScriptView } from './ScriptView';

interface RehearsalScreenProps {
  config: SessionConfig;
  onExit: () => void;
  installPrompt?: boolean;
  onInstall?: () => void;
}

export function RehearsalScreen({ config, onExit, installPrompt, onInstall }: RehearsalScreenProps) {
  const rehearsal = useRehearsal(config);
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scriptViewOpen, setScriptViewOpen] = useState(false);

  const swipe = useSwipe(rehearsal.back, () => {
    if (rehearsal.state === 'WAITING_FOR_USER') {
      rehearsal.advance();
    } else {
      rehearsal.skip();
    }
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (jumpMenuOpen) return;
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
      if (e.code === 'ArrowRight' && rehearsal.state !== 'IDLE') {
        e.preventDefault();
        rehearsal.skip();
      }
      if (e.code === 'ArrowLeft' && rehearsal.state !== 'IDLE') {
        e.preventDefault();
        rehearsal.back();
      }
      if (e.code === 'Escape') {
        rehearsal.pause();
      }
    },
    [rehearsal, jumpMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const total = rehearsal.lines.length;
  const idx = rehearsal.progress.currentLineIndex;
  const isMyLine =
    rehearsal.currentLine?.type === 'dialogue' && rehearsal.currentLine?.character === config.myCharacter;
  const isLive = rehearsal.state === 'PLAYING_OTHER' || rehearsal.state === 'WAITING_FOR_USER' || rehearsal.state === 'USER_SPEAKING';
  const listening = isMyLine && (rehearsal.state === 'WAITING_FOR_USER' || rehearsal.state === 'USER_SPEAKING');
  const isComplete = rehearsal.state === 'COMPLETE';
  const titleHead = config.script.title.split('—')[0].trim() || config.script.title;

  return (
    <div
      className="h-full w-full flex flex-col fade-in"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      {jumpMenuOpen && (
        <ScriptJumpMenu
          lines={rehearsal.lines}
          characters={config.script.characters}
          onJump={(index) => rehearsal.goToLine(index)}
          onClose={() => setJumpMenuOpen(false)}
        />
      )}

      {/* Top bar */}
      <div
        className="shrink-0 grid items-center safe-top"
        style={{ paddingLeft: 18, paddingRight: 18, paddingBottom: 12, gridTemplateColumns: '48px 1fr auto', gap: 8 }}
      >
        <button
          onClick={() => {
            rehearsal.pause();
            onExit();
          }}
          aria-label="Exit"
          className="icon-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span
            className="ticket-no"
            style={{ color: isLive ? 'var(--scarlet)' : 'var(--ink-mute)' }}
          >
            {isLive ? '● Live' : isComplete ? '✓ Complete' : '○ Standby'}
          </span>
          <span
            className="display"
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {titleHead}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MicIndicator isListening={rehearsal.stt.isListening} isSpeaking={rehearsal.stt.isSpeaking} />
          <LineTimer elapsed={rehearsal.lineElapsed} isRunning={rehearsal.state === 'PLAYING_OTHER'} />
          <button onClick={() => setScriptViewOpen(true)} aria-label="View script" className="icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <button onClick={() => setDrawerOpen(true)} aria-label="Settings" className="icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Beat marquee */}
      {!isComplete && (
        <div
          style={{
            padding: '0 24px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span className="font-mono-tab" style={{ fontSize: 10, color: 'var(--ink-mute)' }}>
            {String(idx + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
          <Marquee total={total} idx={idx} loopStart={rehearsal.loopStart} loopEnd={rehearsal.loopEnd} />
          <span className="font-mono-tab" style={{ fontSize: 10, color: 'var(--ink-mute)' }}>
            {String(rehearsal.progress.percentage).padStart(2, '0')}%
            {rehearsal.runCount > 0 && (
              <span style={{ marginLeft: 6, color: 'var(--scarlet)' }}>· run {rehearsal.runCount}</span>
            )}
          </span>
        </div>
      )}

      {/* Main body — line card or completion view */}
      <div
        className="line-card"
        onClick={() => {
          if (rehearsal.state === 'WAITING_FOR_USER') rehearsal.advance();
        }}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        {isComplete ? (
          <CompleteView onRestart={rehearsal.restart} onExit={onExit} runStats={rehearsal.runStats} />
        ) : (
          <LineDisplay
            line={rehearsal.currentLine}
            characters={config.script.characters}
            myCharacter={config.myCharacter}
            offBook={rehearsal.offBook}
            cueMode={rehearsal.cueMode}
            isActive={rehearsal.state !== 'IDLE'}
          />
        )}
      </div>

      {/* Transcript feedback */}
      <div className="shrink-0">
        <TranscriptFeedback feedback={rehearsal.lastFeedback} />
      </div>

      {/* Transport & mic strip */}
      {!isComplete && (
        <div
          className="shrink-0 safe-bottom"
          style={{
            paddingTop: 10,
            paddingLeft: 18,
            paddingRight: 18,
            background: 'var(--paper)',
            borderTop: '1px solid var(--paper-line)',
          }}
        >
          {/* Mic / waveform strip — only on the user's line */}
          {isMyLine && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                marginBottom: 12,
                border: '1px solid var(--paper-line)',
                borderRadius: 12,
                background: listening ? 'oklch(98% 0.04 25 / 0.5)' : 'var(--paper-deep)',
              }}
            >
              <MicOrb active={listening} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="label"
                  style={{ color: listening ? 'var(--scarlet-deep)' : 'var(--ink-mute)' }}
                >
                  {listening
                    ? rehearsal.autoAdvance
                      ? 'Listening · auto-advance armed'
                      : 'Listening · tap next when done'
                    : "Tap begin · it's your line"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: listening ? 'var(--scarlet)' : 'var(--ink-faint)',
                  }}
                >
                  <Waveform live={listening} bars={28} height={20} />
                </div>
              </div>
            </div>
          )}

          {/* Transport */}
          <div className="transport">
            <button
              type="button"
              className="transport-side"
              onClick={rehearsal.back}
              disabled={rehearsal.state === 'IDLE'}
              aria-label="Previous line"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 6l-8 6 8 6V6zm9 0l-8 6 8 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              className="transport-side transport-side-jump"
              onClick={() => rehearsal.goToLine(Math.max(0, idx - 5))}
              disabled={rehearsal.state === 'IDLE'}
              aria-label="Back five"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
            <CenterButton state={rehearsal.state} onPlay={rehearsal.play} onPause={rehearsal.pause} onAdvance={rehearsal.advance} />
            <button
              type="button"
              className="transport-side transport-side-jump"
              onClick={() => rehearsal.goToLine(Math.min(total - 1, idx + 5))}
              disabled={rehearsal.state === 'IDLE'}
              aria-label="Forward five"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
            <button
              type="button"
              className="transport-side"
              onClick={rehearsal.skip}
              disabled={rehearsal.state === 'IDLE'}
              aria-label="Next line"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 6l8 6-8 6V6zm-9 0l8 6-8 6V6z" />
              </svg>
            </button>
          </div>

          {/* Hint row — desktop only */}
          <div
            className="kbd-hint"
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              flexWrap: 'wrap',
            }}
          >
            <span className="kbd">space</span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--ink-mute)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              play / pause
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-mute)' }}>·</span>
            <span className="kbd">→</span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--ink-mute)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              skip
            </span>
          </div>
        </div>
      )}

      <SettingsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        speed={rehearsal.tts.speed}
        onSpeedChange={rehearsal.tts.changeSpeed}
        autoAdvance={rehearsal.autoAdvance}
        offBook={rehearsal.offBook}
        cueMode={rehearsal.cueMode}
        justMyCues={rehearsal.justMyCues}
        onToggleAutoAdvance={rehearsal.toggleAutoAdvance}
        onToggleOffBook={rehearsal.toggleOffBook}
        onToggleCueMode={rehearsal.toggleCueMode}
        onToggleJustMyCues={() => rehearsal.toggleJustMyCues(rehearsal.offBook, rehearsal.cueMode)}
        loopStart={rehearsal.loopStart}
        loopEnd={rehearsal.loopEnd}
        loopIteration={rehearsal.loopIteration}
        onSetLoopStart={rehearsal.setLoopStart}
        onSetLoopEnd={rehearsal.setLoopEnd}
        onClearLoop={rehearsal.clearLoop}
        onOpenJumpMenu={() => setJumpMenuOpen(true)}
        runStats={rehearsal.runStats}
        isPWAInstallable={installPrompt}
        onInstall={onInstall}
      />

      {scriptViewOpen && (
        <ScriptView
          lines={config.script.lines}
          myCharacter={config.myCharacter}
          characters={config.script.characters}
          onClose={() => setScriptViewOpen(false)}
        />
      )}
    </div>
  );
}

function Marquee({
  total,
  idx,
  loopStart,
  loopEnd,
}: {
  total: number;
  idx: number;
  loopStart: number | null;
  loopEnd: number | null;
}) {
  const inLoop = loopStart !== null && loopEnd !== null && loopStart < loopEnd;
  // Compress to ~36 ticks if total is large to keep the row stable
  const ticks = Math.min(total, 60);
  const items = Array.from({ length: ticks });
  const ratio = total > 0 ? ticks / total : 0;
  const projected = Math.round(idx * ratio);
  const lsP = inLoop ? Math.round(loopStart! * ratio) : -1;
  const leP = inLoop ? Math.round(loopEnd! * ratio) : -1;
  return (
    <div className="marquee-row" style={{ flex: 1 }}>
      {items.map((_, i) => {
        const inLoopBand = inLoop && i >= lsP && i <= leP;
        const cls =
          i < projected ? 'marquee-tick done' : i === projected ? 'marquee-tick now' : 'marquee-tick';
        return (
          <div
            key={i}
            className={cls}
            style={inLoopBand && i !== projected ? { background: 'var(--amber)' } : undefined}
          />
        );
      })}
    </div>
  );
}

function CenterButton({
  state,
  onPlay,
  onPause,
  onAdvance,
}: {
  state: ReturnType<typeof useRehearsal>['state'];
  onPlay: () => void;
  onPause: () => void;
  onAdvance: () => void;
}) {
  const isIdle = state === 'IDLE';
  const showAdvance = state === 'WAITING_FOR_USER' || state === 'USER_SPEAKING';
  const showResume = state === 'PAUSED';
  const isPlaying = state === 'PLAYING_OTHER';

  let label = 'Begin';
  let action = onPlay;
  let live = false;
  let icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
  if (showAdvance) {
    label = 'Next';
    action = onAdvance;
    live = true;
    icon = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 6l8 6-8 6V6zm-9 0l8 6-8 6V6z" />
      </svg>
    );
  } else if (showResume) {
    label = 'Resume';
    action = onPlay;
  } else if (isPlaying) {
    label = 'Pause';
    action = onPause;
    live = true;
    icon = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    );
  } else if (isIdle) {
    label = 'Begin';
  }
  return (
    <button type="button" className={'transport-main' + (live ? ' live' : '')} onClick={action}>
      {icon}
      <span style={{ marginLeft: 10, fontStyle: 'italic' }}>{label}</span>
    </button>
  );
}

function MicOrb({ active }: { active: boolean }) {
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      {active && <div className="mic-ring" style={{ position: 'absolute', inset: 0 }} />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: active ? 'var(--scarlet)' : 'var(--paper-deep)',
          color: active ? 'var(--paper)' : 'var(--ink-mute)',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid ' + (active ? 'transparent' : 'var(--paper-line)'),
          transition: 'all 200ms',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 11a7 7 0 0 0 14 0"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
        </svg>
      </div>
    </div>
  );
}

function Waveform({
  live,
  bars = 22,
  height = 28,
}: {
  live: boolean;
  bars?: number;
  height?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height, color: 'currentColor' }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={live ? 'wave-bar' : ''}
          style={{
            width: 3,
            height: live ? '100%' : `${30 + ((i * 37) % 60)}%`,
            background: 'currentColor',
            borderRadius: 2,
            animationDelay: `${(i * 80) % 700}ms`,
            opacity: live ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

function CompleteView({
  onRestart,
  onExit,
  runStats,
}: {
  onRestart: () => void;
  onExit: () => void;
  runStats: { accuracy: number; avgTime: number; stumbles: number };
}) {
  const hasStats = runStats.accuracy > 0 || runStats.avgTime > 0;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <span className="stamp" style={{ color: 'var(--scarlet)' }}>Curtain</span>
      <div>
        <h2 className="display" style={{ fontSize: 36, lineHeight: 1.05 }}>
          Scene <span className="display-i">complete</span>
        </h2>
        <p
          className="font-serif"
          style={{ fontStyle: 'italic', color: 'var(--ink-mute)', marginTop: 6, fontSize: 15 }}
        >
          A fine performance. Take a bow.
        </p>
      </div>

      {hasStats && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Stat label="Accuracy" value={`${runStats.accuracy}%`} accent={runStats.accuracy >= 80} />
          <Stat label="Avg/line" value={`${runStats.avgTime}s`} />
          <Stat label="Stumbles" value={String(runStats.stumbles)} warn={runStats.stumbles > 0} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button
          type="button"
          onClick={onRestart}
          className="btn-primary"
          style={{ fontSize: 16, padding: '12px 20px' }}
        >
          Run again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="btn-ghost"
          style={{
            border: '1px solid var(--paper-line)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 16,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const color = accent ? 'var(--scarlet)' : warn ? 'var(--amber-deep)' : 'var(--ink)';
  return (
    <div
      style={{
        background: 'var(--paper-deep)',
        border: '1px solid var(--paper-line)',
        borderRadius: 6,
        padding: '12px 18px',
        minWidth: 84,
      }}
    >
      <div className="display" style={{ fontSize: 24, color }}>{value}</div>
      <div className="label" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}
