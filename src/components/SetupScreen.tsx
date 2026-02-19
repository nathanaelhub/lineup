import { useState, useCallback } from 'react';
import type { ParsedScript, SessionConfig, ElevenLabsConfig, ScriptLine } from '../types';
import { CharacterSelect } from './CharacterSelect';
import { ElevenLabsSettings } from './ElevenLabsSettings';
import { getCharacterColor } from '../utils/voiceMapper';
import { toggleLineType } from '../lib/scriptParser';
import { getPosition } from '../utils/storage';

interface SetupScreenProps {
  script: ParsedScript;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
}

export function SetupScreen({ script: initialScript, onStart, onBack }: SetupScreenProps) {
  const [script, setScript] = useState(initialScript);
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [offBook, setOffBook] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [cueMode, setCueMode] = useState(false);
  const [elevenLabs, setElevenLabs] = useState<ElevenLabsConfig | undefined>();
  const [showCorrection, setShowCorrection] = useState(false);
  const [characterPitchMap, setCharacterPitchMap] = useState<Record<string, number>>({});

  const justMyCues = cueMode && offBook;
  const handleJustMyCues = (val: boolean) => {
    setCueMode(val);
    setOffBook(val);
  };

  const savedPosition = myCharacter ? getPosition(script.title) : null;
  const resumeAvailable = savedPosition && savedPosition.character === myCharacter && savedPosition.lineIndex > 0;

  const previewLines = script.lines.filter(l => l.type !== 'scene_heading').slice(0, 12);

  const handleToggleLine = useCallback((lineIndex: number) => {
    setScript(prev => toggleLineType(prev, lineIndex));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-7">

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
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">{script.title}</h2>
            <p className="text-xs text-text-muted">
              {script.characters.length} characters · {script.lines.filter(l => l.type === 'dialogue').length} dialogue lines
            </p>
          </div>
        </div>

        {/* Character selection */}
        <CharacterSelect script={script} selectedCharacter={myCharacter} onSelect={setMyCharacter} />

        {/* Script preview + correction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Preview</h3>
            <button
              onClick={() => setShowCorrection(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors
                ${showCorrection ? 'bg-warning/20 text-warning' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}`}
            >
              {showCorrection ? '✓ Correcting' : 'Fix misparses'}
            </button>
          </div>

          <div className="bg-bg-secondary rounded-xl p-4 space-y-1.5 max-h-56 overflow-y-auto">
            {previewLines.map((line) => (
              <ParsedLineRow
                key={line.lineIndex}
                line={line}
                characters={script.characters}
                editable={showCorrection}
                onToggle={handleToggleLine}
              />
            ))}
            {script.lines.filter(l => l.type !== 'scene_heading').length > 12 && (
              <p className="text-xs text-text-muted italic pt-1">
                +{script.lines.filter(l => l.type !== 'scene_heading').length - 12} more lines...
              </p>
            )}
          </div>

          {showCorrection && (
            <p className="text-xs text-text-muted px-1">
              Tap any line to toggle it between dialogue and stage direction.
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Settings</h3>
          <div className="space-y-2">
            <ToggleOption label="Auto-advance" description="Mic detects when you finish speaking" checked={autoAdvance} onChange={setAutoAdvance} />
            <ToggleOption label="Off-book mode" description="Hides your lines for memory practice" checked={offBook} onChange={setOffBook} />
            <ToggleOption label="Cue mode" description="Shows only last 3 words of other character's line" checked={cueMode} onChange={setCueMode} />
            <ToggleOption label="Just my cues" description="Cue mode + off-book together in one tap" checked={justMyCues} onChange={handleJustMyCues} />
            <ToggleOption label="Show stage directions" description="Pause briefly at stage directions" checked={showDirections} onChange={setShowDirections} />
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
                    ${Math.abs(speed - s) < 0.01 ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Voice Pitch — browser TTS only, not ElevenLabs */}
          {!elevenLabs?.apiKey && myCharacter && script.characters.filter(c => c !== myCharacter).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-text-primary">Voice Pitch</span>
                <span className="text-xs text-text-muted">per character</span>
              </div>
              {script.characters.filter(c => c !== myCharacter).map(char => (
                <div key={char} className="flex items-center gap-3 bg-bg-secondary rounded-xl px-4 py-2.5">
                  <span className="text-xs font-medium text-text-secondary min-w-0 flex-1 truncate">{char}</span>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={characterPitchMap[char] ?? 1.0}
                    onChange={(e) => setCharacterPitchMap(prev => ({ ...prev, [char]: parseFloat(e.target.value) }))}
                    className="w-28 accent-accent"
                  />
                  <span className="text-xs text-text-muted w-7 text-right tabular-nums">
                    {(characterPitchMap[char] ?? 1.0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ElevenLabs AI Voices */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">AI Voices</h3>
          <ElevenLabsSettings
            characters={script.characters.filter(c => c !== myCharacter)}
            config={elevenLabs}
            onChange={setElevenLabs}
          />
        </div>

        {/* Resume position prompt */}
        {resumeAvailable && (
          <button
            onClick={() => {
              onStart({ script, myCharacter: myCharacter!, autoAdvance, offBook, showDirections, cueMode, speed, startIndex: savedPosition!.lineIndex, elevenLabs, characterPitchMap });
            }}
            className="w-full py-3 rounded-2xl border border-accent/40 text-accent text-sm font-medium
              hover:bg-accent/10 transition-all active:scale-[0.98] text-center"
          >
            Resume from line {savedPosition!.lineIndex + 1} →
          </button>
        )}

        {/* Start */}
        <button
          onClick={() => {
            if (myCharacter) {
              onStart({ script, myCharacter, autoAdvance, offBook, showDirections, cueMode, speed, elevenLabs, characterPitchMap });
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

function ParsedLineRow({
  line,
  characters,
  editable,
  onToggle,
}: {
  line: ScriptLine;
  characters: string[];
  editable: boolean;
  onToggle: (idx: number) => void;
}) {
  const isDir = line.type === 'direction';
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;

  const content = (
    <div className={`flex gap-2 items-start text-xs ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}>
      {editable && (
        <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center
          ${isDir ? 'border-direction/50 text-direction' : 'border-accent/50 text-accent'}`}
        >
          {isDir ? 'D' : 'L'}
        </div>
      )}
      {isDir ? (
        <p className="italic text-direction leading-relaxed">({line.text.slice(0, 80)}{line.text.length > 80 ? '…' : ''})</p>
      ) : (
        <div>
          <span className="font-bold text-[10px] tracking-wider" style={{ color }}>{line.character}</span>
          <p className="text-text-secondary leading-relaxed mt-0.5">
            {line.text.slice(0, 100)}{line.text.length > 100 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  );

  if (editable) {
    return (
      <button className="w-full text-left" onClick={() => onToggle(line.lineIndex)}>
        {content}
      </button>
    );
  }
  return <div>{content}</div>;
}

function ToggleOption({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3 hover:bg-bg-tertiary transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
    </button>
  );
}
