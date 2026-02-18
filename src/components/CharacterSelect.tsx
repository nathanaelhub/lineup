import type { ParsedScript } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';

interface CharacterSelectProps {
  script: ParsedScript;
  selectedCharacter: string | null;
  onSelect: (character: string) => void;
}

export function CharacterSelect({ script, selectedCharacter, onSelect }: CharacterSelectProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
        Select your character
      </h3>
      <div className="grid gap-2">
        {script.characters.map((character) => {
          const isSelected = selectedCharacter === character;
          const color = getCharacterColor(character, script.characters);
          const lineCount = script.lines.filter(
            l => l.type === 'dialogue' && l.character === character
          ).length;

          return (
            <button
              key={character}
              onClick={() => onSelect(character)}
              className={`
                flex items-center justify-between px-4 py-3 rounded-xl
                transition-all duration-200 text-left
                ${isSelected
                  ? 'ring-2 bg-bg-tertiary'
                  : 'bg-bg-secondary hover:bg-bg-tertiary'
                }
              `}
              style={{
                borderColor: isSelected ? color : 'transparent',
                boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium" style={{ color: isSelected ? color : undefined }}>
                  {character}
                </span>
              </div>
              <span className="text-xs text-text-muted">
                {lineCount} line{lineCount !== 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
