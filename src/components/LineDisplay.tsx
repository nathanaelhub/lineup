import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';

interface LineDisplayProps {
  line: ScriptLine | null;
  characters: string[];
  myCharacter: string;
  offBook: boolean;
  isActive: boolean;
}

export function LineDisplay({ line, characters, myCharacter, offBook, isActive }: LineDisplayProps) {
  if (!line) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-lg">
        Ready to rehearse
      </div>
    );
  }

  const isMyLine = line.type === 'dialogue' && line.character === myCharacter;
  const isDirection = line.type === 'direction';
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;

  if (isDirection) {
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

  return (
    <div className={`
      flex flex-col items-center justify-center gap-4 px-6 py-8
      transition-all duration-300
      ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
    `}>
      {/* Character name */}
      <span
        className="text-sm font-bold uppercase tracking-widest"
        style={{ color }}
      >
        {line.character}
        {isMyLine && (
          <span className="ml-2 text-xs font-normal opacity-70">(you)</span>
        )}
      </span>

      {/* Dialogue text */}
      {isMyLine && offBook ? (
        <div className="text-center space-y-3">
          <div className="w-full max-w-md mx-auto bg-bg-tertiary/50 rounded-xl px-6 py-8 border border-bg-tertiary">
            <p className="text-text-muted text-base italic">
              Your line — speak from memory
            </p>
          </div>
        </div>
      ) : (
        <p
          className="text-center text-2xl sm:text-3xl leading-relaxed font-light max-w-2xl"
          style={{ color: isMyLine ? color : 'var(--color-text-primary)' }}
        >
          {line.text}
        </p>
      )}
    </div>
  );
}
