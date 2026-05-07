import { useMemo, useRef, useState } from 'react';
import type { ScriptLine } from '../types';
import type { LineCorrection } from '../utils/storage';
import { getCharacterColor } from '../utils/voiceMapper';

type Mode = 'blackout' | 'highlight' | 'solo';

interface ScriptViewProps {
  lines: ScriptLine[];
  myCharacter: string;
  characters: string[];
  onClose: () => void;
  onCorrect?: (lineIndex: number, correction: LineCorrection) => void;
  onJumpToLine?: (lineIndex: number) => void;
}

function getCueText(text: string, n = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text;
  return '… ' + words.slice(-n).join(' ');
}

export function ScriptView({
  lines,
  myCharacter,
  characters,
  onClose,
  onCorrect,
  onJumpToLine,
}: ScriptViewProps) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('lineup-preview-mode');
    return saved === 'highlight' || saved === 'solo' ? (saved as Mode) : 'blackout';
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setModeAndPersist = (m: Mode) => {
    localStorage.setItem('lineup-preview-mode', m);
    setMode(m);
  };

  const myLineCount = useMemo(
    () => lines.filter((l) => l.type === 'dialogue' && l.character === myCharacter).length,
    [lines, myCharacter]
  );
  const totalDialogue = useMemo(
    () => lines.filter((l) => l.type === 'dialogue').length,
    [lines]
  );

  const scenes = useMemo(() => {
    const out: { idx: number; text: string }[] = [];
    lines.forEach((l, i) => {
      if (l.type === 'scene_heading') out.push({ idx: i, text: l.text });
    });
    return out;
  }, [lines]);

  const filtered = useMemo(() => {
    if (!search.trim()) return lines.map((l, i) => ({ l, i }));
    const q = search.toLowerCase();
    return lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => {
        if (l.text.toLowerCase().includes(q)) return true;
        if (l.character && l.character.toLowerCase().includes(q)) return true;
        return false;
      });
  }, [lines, search]);

  const scrollToScene = (idx: number) => {
    const el = scrollRef.current?.querySelector(`[data-line-idx="${idx}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--paper)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 grid items-center safe-top"
        style={{
          paddingLeft: 18,
          paddingRight: 18,
          paddingBottom: 10,
          gridTemplateColumns: '48px 1fr 48px',
          gap: 8,
        }}
      >
        <button onClick={onClose} aria-label="Close" className="icon-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="ticket-no">
            Preview · {myLineCount}/{totalDialogue} are yours
          </span>
          <span
            className="display"
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {myCharacter}
          </span>
        </div>
        {onJumpToLine ? (
          <button onClick={() => onJumpToLine(0)} aria-label="Jump to start" className="icon-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
      </div>

      {/* Collapsible controls: hide when scrolled, reappear at top */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: controlsVisible ? 400 : 0,
          opacity: controlsVisible ? 1 : 0,
          transition: 'max-height 280ms ease, opacity 220ms ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
          flexShrink: 0,
        }}
      >
        {/* Mode segmented control */}
        <div style={{ padding: '0 18px 10px' }}>
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
              ['blackout', 'Blackout', 'Your lines redacted'],
              ['highlight', 'Highlight', 'Marked in amber'],
              ['solo', 'Solo', 'Only yours + cues'],
            ] as Array<[Mode, string, string]>).map(([m, label, sub], i) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeAndPersist(m)}
                  style={{
                    padding: '10px 6px',
                    background: active ? 'var(--ink)' : 'var(--paper)',
                    color: active ? 'var(--paper)' : 'var(--ink-soft)',
                    fontFamily: 'var(--serif)',
                    fontSize: 14,
                    fontStyle: active ? 'italic' : 'normal',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--paper-line)',
                    lineHeight: 1.1,
                    cursor: 'pointer',
                  }}
                >
                  <div>{label}</div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 8,
                      marginTop: 2,
                      opacity: active ? 0.7 : 0.55,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontStyle: 'normal',
                    }}
                  >
                    {sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 18px 8px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a line, cue, or character…"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--paper-deep)',
              border: '1px solid var(--paper-line)',
              borderRadius: 999,
              fontFamily: 'var(--serif)',
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* Scene rail */}
        {scenes.length > 0 && (
          <div
            style={{
              padding: '0 18px 8px',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            {scenes.map((s, i) => (
              <button
                key={s.idx}
                type="button"
                onClick={() => scrollToScene(s.idx)}
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--paper-line)',
                  background: 'var(--paper)',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                § {i + 1} · {s.text.slice(0, 24)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="scroll"
        style={{ flex: 1, padding: '8px 0 24px', background: 'var(--paper)' }}
        onScroll={(e) => {
          const top = (e.currentTarget as HTMLDivElement).scrollTop;
          setControlsVisible(top < 60);
        }}
      >
        {filtered.map(({ l, i }) => (
          <ScriptRow
            key={l.lineIndex ?? i}
            line={l}
            globalIdx={i}
            mode={mode}
            myCharacter={myCharacter}
            characters={characters}
            editing={editingIdx === i}
            canEdit={!!onCorrect}
            onTap={() => {
              if (!onCorrect) return;
              setEditingIdx((prev) => (prev === i ? null : i));
            }}
            onCorrect={onCorrect ? (correction) => onCorrect(l.lineIndex, correction) : undefined}
            onJumpToLine={onJumpToLine}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 safe-bottom"
        style={{
          paddingTop: 8,
          paddingLeft: 18,
          paddingRight: 18,
          borderTop: '1px solid var(--paper-line)',
          background: 'var(--paper-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
        }}
      >
        <span>{onCorrect ? 'Tap any line to reassign' : 'Read-only preview'}</span>
        <span>
          {filtered.length} of {lines.length}
        </span>
      </div>
    </div>
  );
}

function ScriptRow({
  line,
  globalIdx,
  mode,
  myCharacter,
  characters,
  editing,
  canEdit,
  onTap,
  onCorrect,
  onJumpToLine,
}: {
  line: ScriptLine;
  globalIdx: number;
  mode: Mode;
  myCharacter: string;
  characters: string[];
  editing: boolean;
  canEdit: boolean;
  onTap: () => void;
  onCorrect?: (correction: LineCorrection) => void;
  onJumpToLine?: (lineIndex: number) => void;
}) {
  const isMe = line.type === 'dialogue' && line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : 'var(--ink-soft)';

  // Solo mode skips direction rows; scene headings kept as invisible scroll anchors
  if (mode === 'solo' && line.type === 'direction') return null;

  return (
    <div
      data-line-idx={globalIdx}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        padding: '4px 18px',
        background: editing ? 'var(--paper-deep)' : 'transparent',
        transition: 'background 150ms',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--ink-mute)',
          paddingTop: 6,
          opacity: 0.6,
          borderRight: '1px solid var(--paper-line)',
          marginRight: 8,
        }}
      >
        {String(globalIdx + 1).padStart(3, '0')}
      </div>

      <button
        type="button"
        onClick={onTap}
        disabled={!canEdit}
        style={{
          textAlign: 'left',
          padding: '4px 0',
          background: 'none',
          border: 'none',
          cursor: canEdit ? 'pointer' : 'default',
          color: 'inherit',
          font: 'inherit',
          width: '100%',
        }}
      >
        {line.type === 'scene_heading' && (
          <div
            style={mode === 'solo' ? { height: 0, overflow: 'hidden' } : {
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              padding: '12px 0 4px',
              borderBottom: '1px solid var(--paper-line)',
            }}
          >
            {mode !== 'solo' && `§ ${line.text}`}
          </div>
        )}

        {line.type === 'direction' && (
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink-mute)',
              paddingLeft: 16,
              lineHeight: 1.4,
            }}
          >
            ({line.text})
          </p>
        )}

        {line.type === 'dialogue' && (
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.2em',
                color,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textTransform: 'uppercase',
              }}
            >
              {line.character}
              {isMe && (
                <span
                  className="stamp"
                  style={{
                    color: 'var(--scarlet)',
                    fontSize: 7,
                    padding: '1px 5px',
                    transform: 'rotate(0)',
                  }}
                >
                  YOU
                </span>
              )}
            </div>

            {isMe && mode === 'blackout' ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {line.text.split(/\s+/).map((w, j) => (
                    <span
                      key={j}
                      style={{
                        display: 'inline-block',
                        height: 14,
                        width: Math.max(18, w.length * 6),
                        background: 'var(--ink)',
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : isMe && (mode === 'highlight' || mode === 'solo') ? (
              <p style={{ marginTop: 2, lineHeight: 1.45 }}>
                <span
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 14,
                    background: 'color-mix(in oklch, var(--amber) 55%, transparent)',
                    padding: '2px 3px',
                    borderRadius: 2,
                    WebkitBoxDecorationBreak: 'clone',
                    boxDecorationBreak: 'clone',
                    color: 'var(--ink)',
                  }}
                >
                  {line.text}
                </span>
              </p>
            ) : !isMe && mode === 'solo' ? (
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: 'var(--ink-mute)',
                  marginTop: 2,
                }}
              >
                {getCueText(line.text)}
              </p>
            ) : (
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  lineHeight: 1.45,
                  marginTop: 2,
                  color: 'var(--ink)',
                  fontWeight: isMe ? 500 : 400,
                }}
              >
                {line.text}
              </p>
            )}
          </div>
        )}
      </button>

      {/* Inline edit sheet */}
      {editing && onCorrect && (
        <>
          <div />
          <div
            style={{
              margin: '6px 0 8px',
              padding: 10,
              border: '1px dashed var(--paper-line)',
              borderRadius: 6,
              background: 'var(--paper)',
            }}
          >
            <div className="label" style={{ marginBottom: 6 }}>Reassign · or change type</div>

            {/* Character picker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {characters.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    onCorrect({ type: 'dialogue', character: c })
                  }
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--paper-line)',
                    background: line.character === c ? 'var(--ink)' : 'var(--paper)',
                    color: line.character === c ? 'var(--paper)' : 'var(--ink-soft)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Type picker */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['dialogue', 'direction', 'scene_heading'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    onCorrect({
                      type: t,
                      character:
                        t === 'dialogue' ? (line.character ?? characters[0]) : undefined,
                    })
                  }
                  style={{
                    flex: 1,
                    padding: '5px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--paper-line)',
                    background: line.type === t ? 'var(--scarlet)' : 'var(--paper-deep)',
                    color: line.type === t ? 'var(--paper)' : 'var(--ink-mute)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'scene_heading' ? 'Scene' : t}
                </button>
              ))}
            </div>

            {onJumpToLine && line.type === 'dialogue' && (
              <button
                type="button"
                onClick={() => onJumpToLine(line.lineIndex)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '6px 8px',
                  borderRadius: 999,
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--serif)',
                  fontSize: 12,
                  fontStyle: 'italic',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Start rehearsal from line {globalIdx + 1} →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
