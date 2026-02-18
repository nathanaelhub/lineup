import { useState } from 'react';
import { ScriptUpload } from './ScriptUpload';
import type { SavedScript } from '../types';

interface HomeScreenProps {
  savedScripts: SavedScript[];
  onUpload: (text: string, filename: string) => void;
  onLoadSaved: (script: SavedScript) => void;
  onDeleteSaved: (id: string) => void;
}

export function HomeScreen({ savedScripts, onUpload, onLoadSaved, onDeleteSaved }: HomeScreenProps) {
  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-start px-6 py-10 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-accent">Line</span>
            <span className="text-text-primary">Up</span>
          </h1>
          <p className="mt-2 text-text-muted text-sm">
            Your personal rehearsal partner
          </p>
        </div>

        {/* Upload area */}
        <div className="w-full mb-8">
          <ScriptUpload onUpload={onUpload} />
        </div>

        {/* Saved scripts */}
        {savedScripts.length > 0 && (
          <div className="w-full">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3 px-1">
              Recent Scripts
            </h2>
            <div className="space-y-2">
              {savedScripts.map((script) => (
                <div
                  key={script.id}
                  className="flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3
                    hover:bg-bg-tertiary transition-colors group"
                >
                  <button
                    onClick={() => onLoadSaved(script)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-text-primary text-sm truncate">
                      {script.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
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
                    className="p-2 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100
                      transition-all rounded-lg hover:bg-danger/10"
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
          <PasteArea onUpload={onUpload} />
        </div>
      </div>
    </div>
  );
}

function PasteArea({ onUpload }: { onUpload: (text: string, filename: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 text-center text-text-muted text-sm
          hover:text-text-secondary transition-colors rounded-xl
          border border-dashed border-bg-tertiary hover:border-text-muted"
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
        className="w-full h-48 bg-bg-secondary border border-bg-tertiary rounded-xl p-4
          text-sm text-text-primary placeholder:text-text-muted/50 resize-none
          focus:outline-none focus:border-accent/50 transition-colors"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setIsOpen(false); setText(''); }}
          className="flex-1 py-2.5 rounded-xl bg-bg-tertiary text-text-secondary text-sm
            hover:bg-bg-tertiary/80 transition-colors"
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
