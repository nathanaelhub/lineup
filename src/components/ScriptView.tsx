import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';

interface ScriptViewProps {
  lines: ScriptLine[];
  myCharacter: string;
  characters: string[];
  onClose: () => void;
}

export function ScriptView({ lines, myCharacter, characters, onClose }: ScriptViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-bg-tertiary">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Script</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Blacking out: <span className="font-medium text-text-secondary">{myCharacter}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Script scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-mono text-sm">
        {lines.map(line => (
          <ScriptLineRow
            key={line.lineIndex}
            line={line}
            myCharacter={myCharacter}
            characters={characters}
          />
        ))}
        <div className="h-12" />
      </div>
    </div>
  );
}

function ScriptLineRow({
  line, myCharacter, characters,
}: {
  line: ScriptLine;
  myCharacter: string;
  characters: string[];
}) {
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

  // Dialogue
  const isMe = line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;

  // Black bar width: roughly proportional to text length, capped at full width
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-bold tracking-wider" style={{ color }}>
        {line.character}
      </p>
      {isMe ? (
        <div
          className="h-5 rounded-sm bg-text-primary/90"
          style={{ width: `${barWidth}%` }}
          aria-label="[your line]"
        />
      ) : (
        <p className="text-text-secondary leading-relaxed">{line.text}</p>
      )}
    </div>
  );
}
