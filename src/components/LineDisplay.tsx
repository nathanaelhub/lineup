import { useEffect } from 'react';
import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';
import { vibrate } from '../utils/haptics';

function getCueText(text: string, wordCount = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) return text;
  return '…' + words.slice(-wordCount).join(' ');
}

interface LineDisplayProps {
  line: ScriptLine | null;
  characters: string[];
  myCharacter: string;
  offBook: boolean;
  cueMode: boolean;
  isActive: boolean;
}

export function LineDisplay({ line, characters, myCharacter, offBook, cueMode, isActive }: LineDisplayProps) {
  const isMyLine = line?.type === 'dialogue' && line?.character === myCharacter;

  useEffect(() => {
    if (isMyLine && isActive) vibrate(50);
  }, [line?.lineIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!line) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center px-8">
        <p className="text-text-muted text-lg">Ready to rehearse</p>
        <p className="text-text-muted/50 text-sm">Press play or tap ▶</p>
      </div>
    );
  }

  const isDir = line.type === 'direction';
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;

  if (isDir) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-8">
        <span className="text-xs uppercase tracking-widest text-direction font-medium">
          Stage Direction
        </span>
        <p className="text-center text-lg italic text-direction leading-relaxed">
          ({line.text})
        </p>
      </div>
    );
  }

  // Cue mode for other character's lines: show only last 3 words
  const displayText = (!isMyLine && cueMode)
    ? getCueText(line.text)
    : line.text;

  return (
    <div className={`
      flex flex-col items-center justify-center gap-4 px-6 py-8
      transition-all duration-300
      ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
    `}>
      {/* Character name */}
      <span className="text-sm font-bold uppercase tracking-widest" style={{ color }}>
        {line.character}
        {isMyLine && <span className="ml-2 text-xs font-normal opacity-70">(you)</span>}
        {!isMyLine && cueMode && (
          <span className="ml-2 text-xs font-normal opacity-50">cue</span>
        )}
      </span>

      {/* Dialogue text */}
      {isMyLine && offBook ? (
        <div className="w-full max-w-md mx-auto bg-bg-tertiary/50 rounded-xl px-6 py-8 border border-bg-tertiary text-center">
          <p className="text-text-muted text-base italic">Your line — speak from memory</p>
        </div>
      ) : (
        <p
          className={`
            text-center leading-relaxed font-light max-w-2xl
            ${!isMyLine && cueMode
              ? 'text-3xl sm:text-4xl font-medium tracking-wide'
              : 'text-2xl sm:text-3xl'
            }
          `}
          style={{ color: isMyLine ? color : 'var(--color-text-primary)' }}
        >
          {displayText}
        </p>
      )}
    </div>
  );
}
