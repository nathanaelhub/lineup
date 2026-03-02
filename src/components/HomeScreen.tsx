import { useState } from 'react';
import { ScriptUpload } from './ScriptUpload';
import type { SavedScript } from '../types';

interface HomeScreenProps {
  savedScripts: SavedScript[];
  onUpload: (text: string, filename: string) => void;
  onLoadSaved: (script: SavedScript) => void;
  onDeleteSaved: (id: string) => void;
  isDarkMode: boolean;
  onToggleDark: () => void;
}

export function HomeScreen({ savedScripts, onUpload, onLoadSaved, onDeleteSaved, isDarkMode, onToggleDark }: HomeScreenProps) {
  const bg = isDarkMode ? 'bg-bg-primary' : 'bg-white';
  const surface = isDarkMode ? 'bg-bg-secondary' : 'bg-gray-50';
  const border = isDarkMode ? 'border-bg-tertiary' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-text-muted' : 'text-gray-400';
  const textSecondary = isDarkMode ? 'text-text-secondary' : 'text-gray-600';
  const hoverBg = isDarkMode ? 'hover:bg-bg-tertiary' : 'hover:bg-gray-100';

  return (
    <div className={`h-full flex flex-col overflow-y-auto ${bg}`}>
      <div className="flex-1 flex flex-col items-center justify-start px-6 py-10 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-10">
          <div className="w-8" /> {/* spacer to balance the toggle button */}
          <div className="text-center">
            <h1 className={`text-4xl font-bold tracking-tight ${textPrimary}`}>
              <span className="text-accent">Line</span>
              <span>Up</span>
            </h1>
            <p className={`mt-2 text-sm ${textMuted}`}>Your personal rehearsal partner</p>
          </div>
          <button
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
            className={`p-2 rounded-xl transition-colors ${textMuted} ${hoverBg}`}
          >
            {isDarkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Upload area */}
        <div className="w-full mb-8">
          <ScriptUpload onUpload={onUpload} />
        </div>

        {/* Saved scripts */}
        {savedScripts.length > 0 && (
          <div className="w-full">
            <h2 className={`text-xs font-medium uppercase tracking-wider ${textMuted} mb-3 px-1`}>
              Recent Scripts
            </h2>
            <div className="space-y-2">
              {savedScripts.map((script) => (
                <div
                  key={script.id}
                  className={`flex items-center justify-between ${surface} border ${border} rounded-xl px-4 py-3
                    ${hoverBg} transition-colors group`}
                >
                  <button
                    onClick={() => onLoadSaved(script)}
                    className="flex-1 text-left"
                  >
                    <p className={`font-medium ${textPrimary} text-sm truncate`}>
                      {script.title}
                    </p>
                    <p className={`text-xs ${textSecondary} mt-0.5`}>
                      {script.parsedScript.characters.length} characters
                      {' \u00B7 '}
                      {script.parsedScript.lines.filter(l => l.type === 'dialogue').length} lines
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSaved(script.id);
                    }}
                    className="p-2 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-error/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paste option */}
        <div className="w-full mt-6">
          <PasteArea onUpload={onUpload} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}

function PasteArea({ onUpload, isDarkMode }: { onUpload: (text: string, filename: string) => void; isDarkMode: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const textMuted = isDarkMode ? 'text-text-muted' : 'text-gray-400';
  const textSecondary = isDarkMode ? 'text-text-secondary' : 'text-gray-600';
  const textPrimary = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const borderTertiary = isDarkMode ? 'border-bg-tertiary' : 'border-gray-200';
  const surface = isDarkMode ? 'bg-bg-secondary' : 'bg-gray-50';
  const surfaceTertiary = isDarkMode ? 'bg-bg-tertiary' : 'bg-gray-100';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full py-3 text-center ${textMuted} text-sm
          hover:${textSecondary} transition-colors rounded-xl
          border border-dashed ${borderTertiary} hover:border-text-muted`}
      >
        Or paste script text directly
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your script here...

CHARACTER NAME
Their dialogue goes here.

ANOTHER CHARACTER
Their response..."
        className={`w-full h-48 ${surface} border ${borderTertiary} rounded-xl p-4
          text-sm ${textPrimary} placeholder:${textMuted}/50 resize-none
          focus:outline-none focus:border-accent/50 transition-colors`}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setIsOpen(false); setText(''); }}
          className={`flex-1 py-2.5 rounded-xl ${surfaceTertiary} ${textSecondary} text-sm
            hover:${surfaceTertiary}/80 transition-colors`}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (text.trim()) {
              onUpload(text, 'Pasted Script');
            }
          }}
          disabled={!text.trim()}
          className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium
            hover:bg-accent-glow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Parse Script
        </button>
      </div>
    </div>
  );
}
