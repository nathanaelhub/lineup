import type { SavedScript, ParsedScript } from '../types';

const STORAGE_KEY = 'lineup_scripts';

export function getSavedScripts(): SavedScript[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScript(title: string, rawText: string, parsedScript: ParsedScript): SavedScript {
  const scripts = getSavedScripts();
  const saved: SavedScript = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    rawText,
    parsedScript,
    savedAt: Date.now(),
  };
  scripts.unshift(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
  return saved;
}

export function deleteScript(id: string): void {
  const scripts = getSavedScripts().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}
