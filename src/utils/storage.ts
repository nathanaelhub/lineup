import type { SavedScript, ParsedScript, SavedPosition } from '../types';

const SCRIPTS_KEY = 'lineup_scripts';
const POSITIONS_KEY = 'lineup_positions';

// ── Scripts ───────────────────────────────────────────────────────────────────

export function getSavedScripts(): SavedScript[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
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
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  return saved;
}

export function deleteScript(id: string): void {
  const scripts = getSavedScripts().filter(s => s.id !== id);
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

// ── Positions ─────────────────────────────────────────────────────────────────

function getPositions(): Record<string, SavedPosition> {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePosition(scriptTitle: string, lineIndex: number, character: string): void {
  if (lineIndex <= 0) return; // don't save from the very start
  const positions = getPositions();
  positions[scriptTitle] = { scriptTitle, lineIndex, character, savedAt: Date.now() };
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

export function getPosition(scriptTitle: string): SavedPosition | null {
  return getPositions()[scriptTitle] || null;
}

export function clearPosition(scriptTitle: string): void {
  const positions = getPositions();
  delete positions[scriptTitle];
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}
