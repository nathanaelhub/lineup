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
            {onCorrect && (
              <span className="ml-2 text-accent">· tap ✏ to fix line types</span>
            )}
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 font-mono text-sm">
        {lines.map(line => (
          <ScriptLineRow
            key={line.lineIndex}
            line={line}
            myCharacter={myCharacter}
            characters={characters}
            previewMode={previewMode}
            isEditing={editingIndex === line.lineIndex}
            onToggleEdit={() => setEditingIndex(prev => prev === line.lineIndex ? null : line.lineIndex)}
            onCorrect={onCorrect ? (correction) => {
              onCorrect(line.lineIndex, correction);
              setEditingIndex(null);
            } : undefined}
          />
        ))}
        <div className="h-12" />
      </div>
    </div>
  );
}

function ScriptLineRow({
  line, myCharacter, characters, previewMode, isEditing, onToggleEdit, onCorrect,
}: {
  line: ScriptLine;
  myCharacter: string;
  characters: string[];
  previewMode: 'blackout' | 'highlight';
  isEditing: boolean;
  onToggleEdit: () => void;
  onCorrect?: (correction: LineCorrection) => void;
}) {
  const isMe = line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  const lineContent = () => {
    if (line.type === 'scene_heading') {
      return (
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted/50 pt-4 pb-1">
          {line.text}
        </p>
      );
    }
    if (line.type === 'direction') {
      return (
        <p className="text-text-muted italic text-xs px-4">
          ({line.text})
        </p>
      );
    }
    // dialogue
    return (
      <div className="space-y-0.5">
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

  const typeLabel = line.type === 'scene_heading' ? 'Scene Heading' : line.type === 'direction' ? 'Direction' : 'Dialogue';

  return (
    <div className={`group relative ${isEditing ? 'bg-bg-secondary rounded-xl px-3 py-2 -mx-3' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 py-0.5">
          {lineContent()}
        </div>
        {onCorrect && (
          <button
            onClick={onToggleEdit}
            className={`shrink-0 mt-1 p-1 rounded-lg transition-colors
              ${isEditing
                ? 'bg-accent/20 text-accent'
                : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            aria-label="Edit line type"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Inline edit panel */}
      {isEditing && onCorrect && (
        <div className="mt-2 space-y-2 pb-1">
          {/* Type picker */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Line type</p>
            <div className="flex gap-1.5">
              {(['dialogue', 'direction', 'scene_heading'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onCorrect({
                    type: t,
                    character: t === 'dialogue' ? (line.character ?? characters[0]) : undefined,
                  })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${line.type === t
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-muted hover:text-text-primary'
                    }`}
                >
                  {t === 'scene_heading' ? 'Heading' : t === 'direction' ? 'Direction' : 'Dialogue'}
                </button>
              ))}
            </div>
          </div>

          {/* Character picker — only for dialogue */}
          {line.type === 'dialogue' && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Character</p>
              <div className="flex flex-wrap gap-1.5">
                {characters.map(char => (
                  <button
                    key={char}
                    onClick={() => onCorrect({ type: 'dialogue', character: char })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                      ${line.character === char
                        ? 'bg-accent text-white'
                        : 'bg-bg-tertiary text-text-muted hover:text-text-primary'
                      }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-text-muted/60 italic">Current: {typeLabel}{line.character ? ` · ${line.character}` : ''}</p>
        </div>
      )}
    </div>
  );
}
