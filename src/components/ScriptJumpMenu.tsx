import { useState, useEffect, useRef } from 'react';
import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';

interface ScriptJumpMenuProps {
  lines: ScriptLine[];
  characters: string[];
  onJump: (index: number) => void;
  onClose: () => void;
}

export function ScriptJumpMenu({ lines, characters, onJump, onClose }: ScriptJumpMenuProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const query = search.trim().toLowerCase();
  const filtered = lines
    .map((line, arrayIndex) => ({ line, arrayIndex }))
    .filter(({ line }) =>
      line.type === 'dialogue' &&
      (!query ||
        line.character?.toLowerCase().includes(query) ||
        line.text.toLowerCase().includes(query))
    );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-text-primary">Jump to Line</h2>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by character or text…"
          className="w-full bg-bg-secondary rounded-xl px-4 py-3 text-text-primary
            placeholder-text-muted text-sm outline-none border border-bg-tertiary
            focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Line list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
        {filtered.map(({ line, arrayIndex }) => {
          const color = line.character ? getCharacterColor(line.character, characters) : undefined;
          const preview = line.text.length > 60 ? line.text.slice(0, 60) + '…' : line.text;
          return (
            <button
              key={line.lineIndex}
              onClick={() => { onJump(arrayIndex); onClose(); }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-bg-secondary transition-colors active:scale-[0.98]"
            >
              <div className="flex items-baseline gap-3">
                <span
                  className="text-xs font-bold uppercase tracking-wider shrink-0"
                  style={{ color }}
                >
                  {line.character}
                </span>
                <span className="text-sm text-text-secondary truncate flex-1">{preview}</span>
                <span className="text-xs text-text-muted tabular-nums shrink-0">
                  #{arrayIndex + 1}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-text-muted text-sm py-8">No lines found</p>
        )}
      </div>
    </div>
  );
}
