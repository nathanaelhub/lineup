import { useState } from 'react';
import type { ParsedScript, SessionConfig } from '../types';
import { CharacterSelect } from './CharacterSelect';
import { getCharacterColor } from '../utils/voiceMapper';

interface SetupScreenProps {
  script: ParsedScript;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
}

export function SetupScreen({ script, onStart, onBack }: SetupScreenProps) {
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [offBook, setOffBook] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [speed, setSpeed] = useState(1.0);

  const previewLines = script.lines.slice(0, 10);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary truncate">{script.title}</h2>
            <p className="text-xs text-text-muted">
              {script.characters.length} characters, {script.lines.filter(l => l.type === 'dialogue').length} lines
            </p>
          </div>
        </div>

        {/* Character selection */}
        <CharacterSelect
          script={script}
          selectedCharacter={myCharacter}
          onSelect={setMyCharacter}
        />

        {/* Script preview */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            Preview
          </h3>
          <div className="bg-bg-secondary rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
            {previewLines.map((line, i) => {
              if (line.type === 'direction') {
                return (
                  <p key={i} className="text-xs italic text-direction pl-4">
                    ({line.text})
                  </p>
                );
              }
              const color = line.character
                ? getCharacterColor(line.character, script.characters)
                : undefined;
              return (
                <div key={i} className="text-sm">
                  <span className="font-bold text-xs" style={{ color }}>
                    {line.character}
                  </span>
                  <p className="text-text-secondary pl-4 text-xs leading-relaxed">
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            Settings
          </h3>
          <div className="space-y-2">
            <ToggleOption
              label="Auto-advance"
              description="Mic detects when you finish speaking"
              checked={autoAdvance}
              onChange={setAutoAdvance}
            />
            <ToggleOption
              label="Off-book mode"
              description="Hides your lines for memory practice"
              checked={offBook}
              onChange={setOffBook}
            />
            <ToggleOption
              label="Show stage directions"
              description="Display and narrate stage directions"
              checked={showDirections}
              onChange={setShowDirections}
            />
          </div>

          {/* Speed */}
          <div className="flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3">
            <span className="text-sm text-text-primary">Speed</span>
            <div className="flex items-center gap-1">
              {[0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                    ${Math.abs(speed - s) < 0.01
                      ? 'bg-accent/20 text-accent'
                      : 'text-text-muted hover:text-text-secondary'
                    }
                  `}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => {
            if (myCharacter) {
              onStart({
                script,
                myCharacter,
                autoAdvance,
                offBook,
                showDirections,
                speed,
              });
            }
          }}
          disabled={!myCharacter}
          className="w-full py-4 rounded-2xl bg-accent text-white text-lg font-semibold
            hover:bg-accent-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-accent/20 active:scale-[0.98]"
        >
          {myCharacter ? `Start as ${myCharacter}` : 'Select a character'}
        </button>

        <div className="h-6" />
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3
        hover:bg-bg-tertiary transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <div className={`
        w-10 h-6 rounded-full relative transition-colors duration-200
        ${checked ? 'bg-accent' : 'bg-bg-tertiary'}
      `}>
        <div className={`
          absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-1'}
        `} />
      </div>
    </button>
  );
}
