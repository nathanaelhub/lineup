import { useState, useMemo, useCallback } from 'react';
import type { ParsedScript, SessionConfig, ElevenLabsConfig } from '../types';
import { ElevenLabsSettings } from './ElevenLabsSettings';
import { getCharacterColor } from '../utils/voiceMapper';
import { getPosition, getCorrections, saveCorrections, type LineCorrection } from '../utils/storage';
import { ScriptView } from './ScriptView';

interface SetupScreenProps {
  script: ParsedScript;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDark: () => void;
}

export function SetupScreen({ script, onStart, onBack, isDarkMode, onToggleDark }: SetupScreenProps) {
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [offBook, setOffBook] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [cueMode, setCueMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [elevenLabs, setElevenLabs] = useState<ElevenLabsConfig | undefined>();
  const [characterPitchMap, setCharacterPitchMap] = useState<Record<string, number>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scriptViewOpen, setScriptViewOpen] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, LineCorrection>>(
    () => getCorrections(script.title)
  );

  const correctedLines = useMemo(() =>
    script.lines.map(line => {
      const c = corrections[line.lineIndex];
      if (!c) return line;
      return { ...line, type: c.type, character: c.type === 'dialogue' ? (c.character ?? line.character) : undefined };
    }),
    [script.lines, corrections]
  );

  const handleCorrect = useCallback((lineIndex: number, correction: LineCorrection) => {
    setCorrections(prev => {
      const next = { ...prev, [lineIndex]: correction };
      saveCorrections(script.title, next);
      return next;
    });
  }, [script.title]);

  const justMyCues = cueMode && offBook;
  const handleJustMyCues = (val: boolean) => {
    setCueMode(val);
    setOffBook(val);
  };

  const savedPosition = myCharacter ? getPosition(script.title) : null;
  const resumeAvailable = savedPosition && savedPosition.character === myCharacter && savedPosition.lineIndex > 0;

  const startConfig = (startIndex?: number): SessionConfig => ({
    script: { ...script, lines: correctedLines },
    myCharacter: myCharacter!,
    autoAdvance,
    offBook,
    showDirections,
    cueMode,
    speed,
    ttsEnabled,
    elevenLabs,
    characterPitchMap,
    ...(startIndex !== undefined ? { startIndex } : {}),
  });

  const dialogueCount = useMemo(
    () => script.lines.filter((l) => l.type === 'dialogue').length,
    [script.lines]
  );

  // Mode tri-state
  type Mode = 'open' | 'off-book' | 'cues';
  const currentMode: Mode = offBook ? (cueMode ? 'cues' : 'off-book') : 'open';
  const setMode = (m: Mode) => {
    if (m === 'open') { setOffBook(false); setCueMode(false); }
    else if (m === 'off-book') { setOffBook(true); setCueMode(false); }
    else { setOffBook(true); setCueMode(true); }
  };

  return (
    <div
      className="h-full w-full flex flex-col fade-in"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* Top bar */}
      <div
        className="shrink-0 grid items-center"
        style={{ padding: '32px 18px 12px', gridTemplateColumns: '48px 1fr 48px', gap: 8 }}
      >
        <button onClick={onBack} aria-label="Back" className="icon-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <span className="ticket-no" style={{ justifySelf: 'center' }}>Setup</span>
        <button onClick={onToggleDark} aria-label="Toggle theme" className="icon-btn">
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
              <line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, padding: '8px 24px 24px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 22 }}>
          <span className="ticket-no" style={{ color: 'var(--scarlet)' }}>Today's piece</span>
          <h2 className="display" style={{ fontSize: 30, lineHeight: 1.04, marginTop: 6 }}>{script.title}</h2>
          <p className="font-serif" style={{ fontStyle: 'italic', color: 'var(--ink-mute)', marginTop: 4, fontSize: 14 }}>
            {script.characters.length} in cast · {dialogueCount} lines
          </p>
        </div>

        <div className="curtain" style={{ margin: '0 -8px 18px' }} />

        {/* Cast list */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3 className="display" style={{ fontSize: 20 }}>Cast list</h3>
            <span className="label">Choose your role</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {script.characters.map((char, i) => {
              const sel = myCharacter === char;
              const color = getCharacterColor(char, script.characters);
              const lineCount = script.lines.filter(
                (l) => l.type === 'dialogue' && l.character === char
              ).length;
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => setMyCharacter(char)}
                  className={'cast-card' + (sel ? ' selected' : '')}
                >
                  <div className="chno">№ {String(i + 1).padStart(2, '0')}</div>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: color,
                      marginBottom: 8,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--paper)',
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {char[0]}
                  </div>
                  <div className="display" style={{ fontSize: 17, lineHeight: 1.05 }}>
                    {char}
                  </div>
                  <div className="label" style={{ marginTop: 4 }}>
                    {lineCount} line{lineCount === 1 ? '' : 's'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Script preview link — once a character is picked */}
        {myCharacter && (
          <button
            onClick={() => setScriptViewOpen(true)}
            type="button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--paper-deep)',
              border: '1px solid var(--paper-line)',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'inherit',
              textAlign: 'left',
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--ink-mute)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div className="font-serif" style={{ fontSize: 14 }}>Preview script</div>
              <div className="label" style={{ marginTop: 2 }}>See full text · your lines blacked out</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--ink-mute)' }}>
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          </button>
        )}

        {/* Mode chips */}
        <div style={{ marginBottom: 20 }}>
          <h3 className="display" style={{ fontSize: 20, marginBottom: 10 }}>Mode</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              border: '1px solid var(--paper-line)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {([
              ['Open', 'open'],
              ['Off-book', 'off-book'],
              ['Just cues', 'cues'],
            ] as Array<[string, Mode]>).map(([label, m], i) => {
              const active = currentMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    padding: '12px 8px',
                    background: active ? 'var(--ink)' : 'var(--paper)',
                    color: active ? 'var(--paper)' : 'var(--ink-soft)',
                    fontFamily: 'var(--serif)',
                    fontSize: 15,
                    fontStyle: active ? 'italic' : 'normal',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--paper-line)',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p
            className="font-serif"
            style={{
              fontStyle: 'italic',
              fontSize: 12,
              color: 'var(--ink-mute)',
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
            {currentMode === 'cues' && 'Memory check. Your lines hidden, others trimmed to last 3 words.'}
            {currentMode === 'off-book' && 'Your lines hidden. Other dialogue read in full.'}
            {currentMode === 'open' && 'Full script visible. Best for first reads & blocking.'}
          </p>
        </div>

        {/* Voice + auto-advance + tempo */}
        <div style={{ marginBottom: 20 }}>
          <h3 className="display" style={{ fontSize: 20, marginBottom: 10 }}>Options</h3>
          <div
            style={{
              background: 'var(--paper-deep)',
              borderRadius: 6,
              border: '1px solid var(--paper-line)',
            }}
          >
            <ToggleRow
              label="Auto-advance"
              caption="Mic detects when you're done"
              on={autoAdvance}
              onChange={setAutoAdvance}
            />
            <div className="div-rule" />
            <ToggleRow
              label="Read other parts"
              caption="Scene partners speak aloud"
              on={ttsEnabled}
              onChange={setTtsEnabled}
            />
            <div className="div-rule" />
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="font-serif" style={{ fontSize: 15 }}>Tempo</div>
                <div className="label" style={{ marginTop: 2 }}>Reading speed</div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  background: 'var(--paper)',
                  borderRadius: 999,
                  padding: 3,
                  border: '1px solid var(--paper-line)',
                }}
              >
                {[0.75, 1.0, 1.25, 1.5].map((s) => {
                  const active = Math.abs(speed - s) < 0.01;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        background: active ? 'var(--ink)' : 'transparent',
                        color: active ? 'var(--paper)' : 'var(--ink-mute)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      {s}×
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced settings */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="a-link"
          style={{
            width: '100%',
            padding: '8px 0',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-mute)',
          }}
        >
          {advancedOpen ? '▾ Advanced settings' : '▸ Advanced settings'}
        </button>

        {advancedOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
            <div
              style={{
                background: 'var(--paper-deep)',
                borderRadius: 6,
                border: '1px solid var(--paper-line)',
              }}
            >
              <ToggleRow
                label="Just my cues"
                caption="Cue mode + off-book together"
                on={justMyCues}
                onChange={handleJustMyCues}
              />
              <div className="div-rule" />
              <ToggleRow
                label="Show stage directions"
                caption="Pause briefly at directions"
                on={showDirections}
                onChange={setShowDirections}
              />
            </div>

            {/* Per-character pitch */}
            {ttsEnabled && !elevenLabs?.apiKey && myCharacter && script.characters.filter((c) => c !== myCharacter).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
                  <span className="font-serif" style={{ fontSize: 14 }}>Voice pitch</span>
                  <span className="label">per character</span>
                </div>
                {script.characters
                  .filter((c) => c !== myCharacter)
                  .map((char) => (
                    <div
                      key={char}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'var(--paper-deep)',
                        border: '1px solid var(--paper-line)',
                        borderRadius: 6,
                        padding: '10px 14px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          letterSpacing: '0.12em',
                          color: 'var(--ink-soft)',
                          minWidth: 0,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {char}
                      </span>
                      <input
                        type="range"
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        value={characterPitchMap[char] ?? 1.0}
                        onChange={(e) =>
                          setCharacterPitchMap((prev) => ({ ...prev, [char]: parseFloat(e.target.value) }))
                        }
                        style={{ width: 112, accentColor: 'var(--scarlet)' }}
                      />
                      <span
                        className="font-mono-tab"
                        style={{ fontSize: 11, color: 'var(--ink-mute)', width: 28, textAlign: 'right' }}
                      >
                        {(characterPitchMap[char] ?? 1.0).toFixed(1)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* ElevenLabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label" style={{ paddingLeft: 4 }}>AI voices</span>
              <ElevenLabsSettings
                characters={script.characters.filter((c) => c !== myCharacter)}
                config={elevenLabs}
                onChange={setElevenLabs}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA bar */}
      <div
        className="shrink-0"
        style={{
          padding: '12px 24px 28px',
          borderTop: '1px solid var(--paper-line)',
          background: 'var(--paper)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {resumeAvailable && (
          <button
            type="button"
            onClick={() => onStart(startConfig(savedPosition!.lineIndex))}
            className="a-link"
            style={{
              width: '100%',
              padding: '10px',
              textAlign: 'center',
              background: 'transparent',
              border: '1px dashed var(--scarlet)',
              borderRadius: 999,
              color: 'var(--scarlet)',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Resume from line {savedPosition!.lineIndex + 1} →
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={!myCharacter}
          onClick={() => myCharacter && onStart(startConfig())}
          style={{ width: '100%' }}
        >
          {myCharacter ? (
            <>
              Take the stage as
              <em className="display-i" style={{ marginLeft: 6 }}>{myCharacter}</em>
            </>
          ) : (
            'Choose your role'
          )}
          {myCharacter && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          )}
        </button>
      </div>

      {scriptViewOpen && myCharacter && (
        <ScriptView
          lines={correctedLines}
          myCharacter={myCharacter}
          characters={script.characters}
          onClose={() => setScriptViewOpen(false)}
          onCorrect={handleCorrect}
        />
      )}
    </div>
  );
}

function ToggleRow({
  label,
  caption,
  on,
  onChange,
}: {
  label: string;
  caption: string;
  on: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: '100%',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      <div>
        <div className="font-serif" style={{ fontSize: 15 }}>{label}</div>
        <div className="label" style={{ marginTop: 2 }}>{caption}</div>
      </div>
      <div className={'switch' + (on ? ' on' : '')} />
    </button>
  );
}

// (Helper preserved for ScriptView consumers — not exported anymore.)
