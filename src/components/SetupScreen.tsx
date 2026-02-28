import { useState } from 'react';
import type { ParsedScript, SessionConfig, ElevenLabsConfig, ScriptLine } from '../types';
import { ElevenLabsSettings } from './ElevenLabsSettings';
import { getCharacterColor } from '../utils/voiceMapper';
import { getPosition } from '../utils/storage';

interface SetupScreenProps {
  script: ParsedScript;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDark: () => void;
}

export function SetupScreen({ script, onStart, onBack, isDarkMode, onToggleDark }: SetupScreenProps) {
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [offBook, setOffBook] = useState(false);
  const [showDirections, setShowDirections] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [cueMode, setCueMode] = useState(false);
  const [elevenLabs, setElevenLabs] = useState<ElevenLabsConfig | undefined>();
  const [characterPitchMap, setCharacterPitchMap] = useState<Record<string, number>>({});
  const [previewMode, setPreviewMode] = useState<'blackout' | 'highlight'>(() => {
    return (localStorage.getItem('lineup-preview-mode') as 'blackout' | 'highlight') || 'blackout';
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const justMyCues = cueMode && offBook;
  const handleJustMyCues = (val: boolean) => {
    setCueMode(val);
    setOffBook(val);
  };

  const savedPosition = myCharacter ? getPosition(script.title) : null;
  const resumeAvailable = savedPosition && savedPosition.character === myCharacter && savedPosition.lineIndex > 0;

  // Theme helpers
  const bg = isDarkMode ? 'bg-bg-primary' : 'bg-white';
  const surface = isDarkMode ? 'bg-bg-secondary' : 'bg-gray-50';
  const border = isDarkMode ? 'border-bg-tertiary' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-text-muted' : 'text-gray-500';
  const textSecondary = isDarkMode ? 'text-text-secondary' : 'text-gray-600';
  const hoverBg = isDarkMode ? 'hover:bg-bg-tertiary' : 'hover:bg-gray-100';
  const pill = isDarkMode ? 'bg-bg-secondary border-bg-tertiary text-text-secondary' : 'bg-gray-100 border-gray-200 text-gray-700';
  const pillActive = isDarkMode ? 'bg-accent text-white border-accent' : 'bg-gray-900 text-white border-gray-900';

  return (
    <div className={`h-full flex flex-col overflow-y-auto ${bg}`}>
      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`p-2 -ml-2 rounded-xl transition-colors ${textMuted} ${hoverBg}`}
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className={`text-sm font-semibold truncate px-2 max-w-[60%] ${textPrimary}`}>{script.title}</h2>
          <button
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
            className={`p-2 rounded-xl transition-colors ${textMuted} ${hoverBg}`}
          >
            {isDarkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Character picker */}
        <div className="space-y-2">
          <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Who are you playing?</p>
          <div className="flex flex-wrap gap-2">
            {script.characters.map(char => (
              <button
                key={char}
                onClick={() => setMyCharacter(char)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95
                  ${myCharacter === char ? pillActive : pill}`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        {/* Script preview — only show after character is selected */}
        {myCharacter && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>Script</p>
              <button
                onClick={() => {
                  const next = previewMode === 'blackout' ? 'highlight' : 'blackout';
                  localStorage.setItem('lineup-preview-mode', next);
                  setPreviewMode(next);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${border} ${textMuted} ${hoverBg}`}
              >
                {previewMode === 'blackout' ? '⬛ Blackout' : '🟡 Highlight'}
              </button>
            </div>
            <div className={`rounded-2xl border ${border} ${surface} overflow-y-auto max-h-[42vh] px-5 py-4 space-y-3`}>
              {script.lines.map(line => (
                <ScreenplayLine
                  key={line.lineIndex}
                  line={line}
                  myCharacter={myCharacter}
                  characters={script.characters}
                  previewMode={previewMode}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resume button */}
        {resumeAvailable && (
          <button
            onClick={() => onStart({ script, myCharacter: myCharacter!, autoAdvance, offBook, showDirections, cueMode, speed, startIndex: savedPosition!.lineIndex, elevenLabs, characterPitchMap })}
            className="w-full py-3 rounded-2xl border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10 transition-all active:scale-[0.98] text-center"
          >
            Resume from line {savedPosition!.lineIndex + 1} →
          </button>
        )}

        {/* Start button */}
        <button
          onClick={() => { if (myCharacter) onStart({ script, myCharacter, autoAdvance, offBook, showDirections, cueMode, speed, elevenLabs, characterPitchMap }); }}
          disabled={!myCharacter}
          className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed
            ${isDarkMode
              ? 'bg-accent text-white hover:bg-accent-glow shadow-lg shadow-accent/20'
              : 'bg-gray-900 text-white hover:bg-gray-700 shadow-lg shadow-gray-900/20'
            }`}
        >
          {myCharacter ? `Start as ${myCharacter}` : 'Select a character above'}
        </button>

        {/* Advanced settings accordion */}
        <div>
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${textMuted} ${hoverBg} rounded-xl`}
          >
            Advanced settings {advancedOpen ? '▲' : '▾'}
          </button>
          {advancedOpen && (
            <div className="space-y-4 pt-4">

              {/* Toggles */}
              <div className="space-y-2">
                <ToggleOption label="Auto-advance" description="Mic detects when you finish speaking" checked={autoAdvance} onChange={setAutoAdvance} isDarkMode={isDarkMode} />
                <ToggleOption label="Off-book mode" description="Hides your lines for memory practice" checked={offBook} onChange={setOffBook} isDarkMode={isDarkMode} />
                <ToggleOption label="Cue mode" description="Shows only last 3 words of other character's line" checked={cueMode} onChange={setCueMode} isDarkMode={isDarkMode} />
                <ToggleOption label="Just my cues" description="Cue mode + off-book together" checked={justMyCues} onChange={handleJustMyCues} isDarkMode={isDarkMode} />
                <ToggleOption label="Show stage directions" description="Pause briefly at stage directions" checked={showDirections} onChange={setShowDirections} isDarkMode={isDarkMode} />
              </div>

              {/* Speed */}
              <div className={`flex items-center justify-between ${surface} rounded-xl px-4 py-3`}>
                <span className={`text-sm ${textPrimary}`}>Speed</span>
                <div className="flex items-center gap-1">
                  {[0.75, 1.0, 1.25, 1.5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                        ${Math.abs(speed - s) < 0.01 ? 'bg-accent/20 text-accent' : `${textMuted} ${hoverBg}`}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Pitch */}
              {!elevenLabs?.apiKey && myCharacter && script.characters.filter(c => c !== myCharacter).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-sm ${textPrimary}`}>Voice Pitch</span>
                    <span className={`text-xs ${textMuted}`}>per character</span>
                  </div>
                  {script.characters.filter(c => c !== myCharacter).map(char => (
                    <div key={char} className={`flex items-center gap-3 ${surface} rounded-xl px-4 py-2.5`}>
                      <span className={`text-xs font-medium ${textSecondary} min-w-0 flex-1 truncate`}>{char}</span>
                      <input
                        type="range" min={0.5} max={2.0} step={0.1}
                        value={characterPitchMap[char] ?? 1.0}
                        onChange={(e) => setCharacterPitchMap(prev => ({ ...prev, [char]: parseFloat(e.target.value) }))}
                        className="w-28 accent-accent"
                      />
                      <span className={`text-xs ${textMuted} w-7 text-right tabular-nums`}>
                        {(characterPitchMap[char] ?? 1.0).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ElevenLabs */}
              <div className="space-y-2">
                <h3 className={`text-sm font-medium uppercase tracking-wider ${textMuted}`}>AI Voices</h3>
                <ElevenLabsSettings
                  characters={script.characters.filter(c => c !== myCharacter)}
                  config={elevenLabs}
                  onChange={setElevenLabs}
                />
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ScreenplayLine({
  line, myCharacter, characters, previewMode, isDarkMode,
}: {
  line: ScriptLine;
  myCharacter: string;
  characters: string[];
  previewMode: 'blackout' | 'highlight';
  isDarkMode: boolean;
}) {
  const textPrimary = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-text-muted' : 'text-gray-400';

  if (line.type === 'scene_heading') {
    return (
      <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted} pt-3 pb-1`}>
        {line.text}
      </p>
    );
  }

  if (line.type === 'direction') {
    return (
      <p className={`italic text-xs ${textMuted} pl-8`}>
        ({line.text})
      </p>
    );
  }

  const isMe = line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-bold tracking-wider uppercase pl-16" style={{ color }}>
        {line.character}
      </p>
      <div className="pl-8 font-mono">
        {isMe ? (
          previewMode === 'blackout' ? (
            <div
              className="h-[1.1em] rounded-sm bg-gray-900 mt-1"
              style={{ width: `${barWidth}%` }}
              aria-label="[your line]"
            />
          ) : (
            <p className={`text-sm leading-relaxed bg-yellow-200 text-gray-900 rounded px-1 inline-block`}>
              {line.text}
            </p>
          )
        ) : (
          <p className={`text-sm leading-relaxed ${textPrimary}`}>{line.text}</p>
        )}
      </div>
    </div>
  );
}

function ToggleOption({ label, description, checked, onChange, isDarkMode }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  isDarkMode: boolean;
}) {
  const textPrimary = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-text-muted' : 'text-gray-500';
  const surface = isDarkMode ? 'bg-bg-secondary' : 'bg-gray-50';
  const hoverBg = isDarkMode ? 'hover:bg-bg-tertiary' : 'hover:bg-gray-100';

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${surface} ${hoverBg} transition-colors`}
    >
      <div className="text-left">
        <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
        <p className={`text-xs ${textMuted} mt-0.5`}>{description}</p>
      </div>
      <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
    </button>
  );
}
