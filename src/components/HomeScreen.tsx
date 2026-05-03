import { useMemo, useRef, useState } from 'react';
import { ScriptUpload } from './ScriptUpload';
import type { SavedScript } from '../types';

interface HomeScreenProps {
  savedScripts: SavedScript[];
  onUpload: (text: string, filename: string) => void;
  onLoadSaved: (script: SavedScript) => void;
  onDeleteSaved: (id: string) => void;
  onArchiveSaved: (id: string) => void;
  onRestoreSaved: (id: string) => void;
  isDarkMode: boolean;
  onToggleDark: () => void;
}

export function HomeScreen({
  savedScripts,
  onUpload,
  onLoadSaved,
  onDeleteSaved,
  onArchiveSaved,
  onRestoreSaved,
  isDarkMode,
  onToggleDark,
}: HomeScreenProps) {
  const { today, issue } = useMemo(() => {
    const now = new Date();
    return {
      today: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      issue: String(Math.floor((now.getTime() / 86_400_000) % 9999)).padStart(4, '0'),
    };
  }, []);

  const [showArchived, setShowArchived] = useState(false);

  const activeScripts = savedScripts.filter(s => !s.archived);
  const archivedScripts = savedScripts.filter(s => s.archived);

  return (
    <div className="h-full w-full flex flex-col paper-grain fade-in" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Top bar */}
      <div
        className="shrink-0 grid items-center safe-top"
        style={{ paddingLeft: 18, paddingRight: 18, paddingBottom: 12, gridTemplateColumns: '48px 1fr 48px', gap: 8 }}
      >
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
        <span className="ticket-no" style={{ justifySelf: 'center', textAlign: 'center' }}>
          № {issue} · {today}
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* Masthead */}
      <div className="shrink-0" style={{ padding: '8px 28px 22px', position: 'relative' }}>
        <div className="label" style={{ marginBottom: 6 }}>The rehearsal partner</div>
        <h1 className="display" style={{ fontSize: 64, lineHeight: 0.92 }}>
          Line<span className="display-i" style={{ fontWeight: 300 }}>Up</span>
        </h1>
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--paper-line)',
            paddingTop: 10,
            gap: 12,
          }}
        >
          <p
            className="font-serif"
            style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-soft)', maxWidth: 240, lineHeight: 1.35 }}
          >
            Run lines anywhere. Hear your scene partners. Know your cues cold.
          </p>
          <span className="stamp" style={{ color: 'var(--scarlet)' }}>v 2.0</span>
        </div>
      </div>

      {/* Body */}
      <div className="scroll safe-bottom" style={{ flex: 1, paddingLeft: 20, paddingRight: 20, paddingBottom: 28 }}>
        <ScriptUpload onUpload={onUpload} />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginTop: 28,
            marginBottom: 10,
          }}
        >
          <h2 className="display" style={{ fontSize: 22 }}>The Repertoire</h2>
          <span className="ticket-no">
            {activeScripts.length === 0 ? 'no entries' : `${activeScripts.length} piece${activeScripts.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {activeScripts.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--paper-line)',
              borderRadius: 6,
              padding: '22px 16px',
              textAlign: 'center',
              color: 'var(--ink-mute)',
            }}
          >
            <p className="font-serif" style={{ fontStyle: 'italic', fontSize: 14 }}>
              Your saved scripts appear here.
            </p>
            <p className="label" style={{ marginTop: 8 }}>Upload above to begin</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeScripts.map((script, idx) => (
              <RepertoireCard
                key={script.id}
                script={script}
                index={idx}
                isArchived={false}
                onLoad={() => onLoadSaved(script)}
                onDelete={() => onDeleteSaved(script.id)}
                onArchive={() => onArchiveSaved(script.id)}
              />
            ))}
          </div>
        )}

        {/* Archived section */}
        {archivedScripts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setShowArchived(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-mute)',
                padding: '4px 0',
                width: '100%',
              }}
            >
              <span className="ticket-no">Archived · {archivedScripts.length}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: showArchived ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showArchived && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {archivedScripts.map((script, idx) => (
                  <RepertoireCard
                    key={script.id}
                    script={script}
                    index={idx}
                    isArchived
                    onLoad={() => onLoadSaved(script)}
                    onDelete={() => onDeleteSaved(script.id)}
                    onArchive={() => {}}
                    onRestore={() => onRestoreSaved(script.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <PasteArea onUpload={onUpload} />
        </div>
      </div>
    </div>
  );
}

function RepertoireCard({
  script,
  index,
  isArchived,
  onLoad,
  onDelete,
  onArchive,
  onRestore,
}: {
  script: SavedScript;
  index: number;
  isArchived: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onRestore?: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const THRESHOLD = 80;

  const triggerExit = (dir: 'left' | 'right', action: () => void) => {
    setExiting(dir);
    setTimeout(action, 220);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    startXRef.current = e.clientX;
    hasDraggedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null || exiting) return;
    const dx = e.clientX - startXRef.current;
    if (!hasDraggedRef.current) {
      if (Math.abs(dx) < 6) return;
      hasDraggedRef.current = true;
      setIsDragging(true);
    }
    let clamped = dx;
    if (dx > THRESHOLD) clamped = THRESHOLD + (dx - THRESHOLD) * 0.2;
    if (dx < -THRESHOLD) clamped = -THRESHOLD + (dx + THRESHOLD) * 0.2;
    setDragX(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const didDrag = hasDraggedRef.current;
    startXRef.current = null;
    hasDraggedRef.current = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!didDrag) {
      onLoad();
      return;
    }

    if (dragX > THRESHOLD * 0.6) {
      if (!isArchived) triggerExit('right', onArchive);
      else if (onRestore) triggerExit('right', onRestore);
      else setDragX(0);
    } else if (dragX < -THRESHOLD * 0.6) {
      if (!isArchived) triggerExit('left', onDelete);
      else triggerExit('left', onDelete);
    } else {
      setDragX(0);
    }
  };

  const rightReveal = Math.max(0, Math.min(dragX / THRESHOLD, 1));
  const leftReveal = Math.max(0, Math.min(-dragX / THRESHOLD, 1));

  const dialogue = script.parsedScript.lines.filter(l => l.type === 'dialogue').length;
  const cast = script.parsedScript.characters;
  const date = new Date(script.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const cardTransform =
    exiting === 'right' ? 'translateX(110%)' :
    exiting === 'left' ? 'translateX(-110%)' :
    `translateX(${dragX}px)`;
  const cardTransition = isDragging
    ? 'none'
    : exiting
    ? 'transform 210ms ease-in'
    : 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)';

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      {/* Swipe-right reveals this (left side): ARCHIVE for active, RESTORE for archived */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: isArchived ? 'var(--amber)' : 'var(--paper-deep)',
          border: isArchived ? 'none' : '1px solid var(--paper-line)',
          display: 'flex', alignItems: 'center', paddingLeft: 20, gap: 8,
          opacity: rightReveal,
        }}
      >
        {isArchived ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        )}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: isArchived ? 'var(--ink)' : 'var(--ink-soft)' }}>
          {isArchived ? 'Restore' : 'Archive'}
        </span>
      </div>

      {/* Swipe-left reveals this (right side): DELETE for active, DELETE for archived */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--scarlet)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, gap: 8,
          opacity: leftReveal,
        }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paper)' }}>
          Delete
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </div>

      {/* Sliding card face */}
      <div
        style={{
          transform: cardTransform,
          transition: cardTransition,
          background: 'var(--paper)',
          border: '1px solid var(--paper-line)',
          borderRadius: 8,
          padding: '14px 16px',
          opacity: isArchived ? 0.72 : 1,
          touchAction: 'pan-y',
          userSelect: 'none',
          cursor: 'pointer',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDragX(0);
          setIsDragging(false);
          startXRef.current = null;
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="ticket-no">№ {String(index + 1).padStart(2, '0')}</span>
          <span className="ticket-no" style={{ color: isArchived ? 'var(--ink-mute)' : 'var(--scarlet)' }}>
            {isArchived ? 'Archived' : 'Saved'} · {date}
          </span>
        </div>
        <h3 className="display" style={{ fontSize: 22, marginTop: 4, marginBottom: 2, lineHeight: 1.1 }}>
          {script.title}
        </h3>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {cast.slice(0, 3).map(c => (
            <span
              key={c}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                padding: '3px 7px',
                borderRadius: 999,
                background: 'var(--paper-deep)',
                color: 'var(--ink-soft)',
                letterSpacing: '0.1em',
              }}
            >
              {c}
            </span>
          ))}
          {cast.length > 3 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-mute)' }}>
              +{cast.length - 3}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span className="ticket-no">{dialogue} lines</span>
        </div>
      </div>
    </div>
  );
}

function PasteArea({ onUpload }: { onUpload: (text: string, filename: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="a-link"
        style={{
          width: '100%',
          padding: '12px',
          textAlign: 'center',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Or paste script text directly
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Paste your script here...\n\nCHARACTER NAME\nTheir dialogue goes here.\n\nANOTHER CHARACTER\nTheir response...'}
        autoFocus
        style={{
          width: '100%',
          height: 192,
          background: 'var(--paper-deep)',
          border: '1px solid var(--paper-line)',
          borderRadius: 6,
          padding: 16,
          fontSize: 13,
          fontFamily: 'var(--mono)',
          color: 'var(--ink)',
          resize: 'none',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { setIsOpen(false); setText(''); }}
          className="btn-ghost"
          style={{ flex: 1, border: '1px solid var(--paper-line)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => { if (text.trim()) onUpload(text, 'Pasted Script'); }}
          disabled={!text.trim()}
          className="btn-primary"
          style={{ flex: 1, fontSize: 15, padding: '12px 16px' }}
        >
          Parse Script
        </button>
      </div>
    </div>
  );
}
