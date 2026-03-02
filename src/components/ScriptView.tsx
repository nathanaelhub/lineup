import { useState } from 'react';
import type { ScriptLine } from '../types';
import type { LineCorrection } from '../utils/storage';
import { getCharacterColor } from '../utils/voiceMapper';

interface ScriptViewProps {
  lines: ScriptLine[];
  myCharacter: string;
  characters: string[];
  onClose: () => void;
  onCorrect?: (lineIndex: number, correction: LineCorrection) => void;
}

export function ScriptView({ lines, myCharacter, characters, onClose, onCorrect }: ScriptViewProps) {
  const [previewMode, setPreviewMode] = useState<'blackout' | 'highlight'>(() => {
    return (localStorage.getItem('lineup-preview-mode') as 'blackout' | 'highlight') || 'blackout';
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const togglePreviewMode = () => {
    const next = previewMode === 'blackout' ? 'highlight' : 'blackout';
    localStorage.setItem('lineup-preview-mode', next);
    setPreviewMode(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-bg-tertiary">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Script</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {previewMode === 'blackout' ? 'Blacking out' : 'Highlighting'}:{' '}
            <span className="font-medium text-text-secondary">{myCharacter}</span>
            {onCorrect && <span className="ml-2 text-accent/80">· tap a line to correct it</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePreviewMode}
            className="text-xs px-2.5 py-1 rounded-lg border border-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
          >
            {previewMode === 'blackout' ? '⬛ Blackout' : '🟡 Highlight'}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Script scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 font-mono text-sm">
        {lines.map(line => (
          <ScriptLineRow
            key={line.lineIndex}
            line={line}
            myCharacter={myCharacter}
            characters={characters}
            previewMode={previewMode}
            isEditing={editingIndex === line.lineIndex}
            canEdit={!!onCorrect}
            onTap={() => {
              if (!onCorrect) return;
              setEditingIndex(prev => prev === line.lineIndex ? null : line.lineIndex);
            }}
            onCorrect={onCorrect ? (correction) => {
              onCorrect(line.lineIndex, correction);
            } : undefined}
          />
        ))}
        <div className="h-16" />
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: ScriptLine['type'] }) {
  const label = type === 'scene_heading' ? 'HDG' : type === 'direction' ? 'DIR' : 'DLG';
  const color = type === 'scene_heading'
    ? 'text-purple-400 bg-purple-400/10'
    : type === 'direction'
    ? 'text-yellow-400 bg-yellow-400/10'
    : 'text-blue-400 bg-blue-400/10';
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color} shrink-0 mt-0.5`}>
      {label}
    </span>
  );
}

function ScriptLineRow({
  line, myCharacter, characters, previewMode, isEditing, canEdit, onTap, onCorrect,
}: {
  line: ScriptLine;
  myCharacter: string;
  characters: string[];
  previewMode: 'blackout' | 'highlight';
  isEditing: boolean;
  canEdit: boolean;
  onTap: () => void;
  onCorrect?: (correction: LineCorrection) => void;
}) {
  const isMe = line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  const lineBody = () => {
    if (line.type === 'scene_heading') {
      return (
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted/50 pt-2 pb-0.5 flex-1">
          {line.text}
        </p>
      );
    }
    if (line.type === 'direction') {
      return (
        <p className="text-text-muted italic text-xs px-4 flex-1">
          ({line.text})
        </p>
      );
    }
    return (
      <div className="space-y-0.5 flex-1">
        <p className="text-[11px] font-bold tracking-wider" style={{ color }}>
          {line.character}
        </p>
        {isMe ? (
          previewMode === 'blackout' ? (
            <div
              className="h-5 rounded-sm bg-text-primary/90"
              style={{ width: `${barWidth}%` }}
              aria-label="[your line]"
            />
          ) : (
            <p className="text-text-primary leading-relaxed bg-yellow-400/20 rounded px-1">
              {line.text}
            </p>
          )
        ) : (
          <p className="text-text-secondary leading-relaxed">{line.text}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-xl transition-colors ${isEditing ? 'bg-bg-secondary' : canEdit ? 'hover:bg-bg-secondary/50 active:bg-bg-secondary' : ''}`}>
      {/* Row — tappable */}
      <button
        onClick={onTap}
        disabled={!canEdit}
        className="w-full text-left px-3 py-2 flex items-start gap-2"
      >
        {canEdit && <TypeBadge type={line.type} />}
        {lineBody()}
        {canEdit && (
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`shrink-0 mt-0.5 transition-transform ${isEditing ? 'rotate-180 text-accent' : 'text-text-muted/40'}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </button>

      {/* Edit panel */}
      {isEditing && onCorrect && (
        <div className="px-3 pb-3 space-y-3">
          {/* Type picker */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Change type to</p>
            <div className="grid grid-cols-3 gap-2">
              {(['dialogue', 'direction', 'scene_heading'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onCorrect({
                    type: t,
                    character: t === 'dialogue' ? (line.character ?? characters[0]) : undefined,
                  })}
                  className={`py-2.5 rounded-xl text-xs font-semibold transition-colors
                    ${line.type === t
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-muted hover:text-text-primary active:bg-bg-tertiary/80'
                    }`}
                >
                  {t === 'scene_heading' ? 'Heading' : t === 'direction' ? 'Direction' : 'Dialogue'}
                </button>
              ))}
            </div>
          </div>

          {/* Character picker — only for dialogue */}
          {line.type === 'dialogue' && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Assign to character</p>
              <div className="flex flex-wrap gap-2">
                {characters.map(char => (
                  <button
                    key={char}
                    onClick={() => onCorrect({ type: 'dialogue', character: char })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors
                      ${line.character === char
                        ? 'bg-accent text-white'
                        : 'bg-bg-tertiary text-text-muted hover:text-text-primary active:bg-bg-tertiary/80'
                      }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
