import { useState, useCallback, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}
import type { AppScreen, ParsedScript, SessionConfig, SavedScript } from './types';
import { parseScript } from './lib/scriptParser';
import { getSavedScripts, saveScript, deleteScript, archiveScript, restoreScript } from './utils/storage';
import { HomeScreen } from './components/HomeScreen';
import { SetupScreen } from './components/SetupScreen';
import { RehearsalScreen } from './components/RehearsalScreen';

function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>(() => getSavedScripts());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lineup-theme') === 'dark';
  });

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('lineup-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-ink', isDarkMode);
  }, [isDarkMode]);

  const handleUpload = useCallback((text: string, filename: string) => {
    const parsed = parseScript(text);
    if (parsed.characters.length === 0) {
      alert('No characters detected in this script. Make sure character names are in ALL CAPS.');
      return;
    }
    parsed.title = filename.replace(/\.\w+$/, '') || parsed.title;
    setParsedScript(parsed);
    // Save to localStorage
    saveScript(parsed.title, text, parsed);
    setSavedScripts(getSavedScripts());
    setScreen('setup');
  }, []);

  const handleLoadSaved = useCallback((saved: SavedScript) => {
    setParsedScript(saved.parsedScript);
    setScreen('setup');
  }, []);

  const handleDeleteSaved = useCallback((id: string) => {
    deleteScript(id);
    setSavedScripts(getSavedScripts());
  }, []);

  const handleArchiveSaved = useCallback((id: string) => {
    archiveScript(id);
    setSavedScripts(getSavedScripts());
  }, []);

  const handleRestoreSaved = useCallback((id: string) => {
    restoreScript(id);
    setSavedScripts(getSavedScripts());
  }, []);

  const handleStartRehearsal = useCallback((config: SessionConfig) => {
    setSessionConfig(config);
    setScreen('rehearsal');
  }, []);

  const handleExitRehearsal = useCallback(() => {
    setSessionConfig(null);
    setScreen('setup');
  }, []);

  const handleBackToHome = useCallback(() => {
    setParsedScript(null);
    setSessionConfig(null);
    setScreen('home');
  }, []);

  return (
    <div className="h-full w-full" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {screen === 'home' && (
        <HomeScreen
          savedScripts={savedScripts}
          onUpload={handleUpload}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={handleDeleteSaved}
          onArchiveSaved={handleArchiveSaved}
          onRestoreSaved={handleRestoreSaved}
          isDarkMode={isDarkMode}
          onToggleDark={toggleDarkMode}
        />
      )}
      {screen === 'setup' && parsedScript && (
        <SetupScreen
          script={parsedScript}
          onStart={handleStartRehearsal}
          onBack={handleBackToHome}
          isDarkMode={isDarkMode}
          onToggleDark={toggleDarkMode}
        />
      )}
      {screen === 'rehearsal' && sessionConfig && (
        <RehearsalScreen
          config={sessionConfig}
          onExit={handleExitRehearsal}
          installPrompt={!!installPrompt}
          onInstall={() => { installPrompt?.prompt(); setInstallPrompt(null); }}
        />
      )}
    </div>
  );
}

export default App;
