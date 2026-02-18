import type { ParsedScript, ScriptLine } from '../types';

const SCENE_HEADING_PATTERN = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*.+/i;
const DIRECTION_PATTERN = /^\s*\(([^)]+)\)\s*$/;
const DIRECTION_BLOCK_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
// Character name: all caps, 2-40 chars, optional trailing parenthetical like (V.O.)
const CHARACTER_NAME_PATTERN = /^([A-Z][A-Z\s.''-]{1,40})(?:\s*\(([^)]*)\))?\s*$/;

// Common ALL-CAPS screenplay directions/transitions that are NOT character names
const NON_CHARACTER_PHRASES = new Set([
  'FADE IN', 'FADE OUT', 'FADE TO BLACK', 'FADE TO',
  'CUT TO', 'SMASH CUT TO', 'MATCH CUT TO', 'JUMP CUT TO', 'CUT BACK TO',
  'DISSOLVE TO', 'WIPE TO', 'IRIS OUT', 'IRIS IN',
  'TITLE CARD', 'SUPER', 'CHYRON', 'CAPTION',
  'INTERCUT WITH', 'INTERCUT',
  'BACK TO SCENE', 'BACK TO',
  'CONTINUOUS', 'LATER', 'MOMENTS LATER', 'THE NEXT DAY', 'SAME TIME',
  'BEGIN TITLE SEQUENCE', 'END TITLE SEQUENCE', 'TITLE SEQUENCE',
  'SERIES OF SHOTS', 'MONTAGE', 'BEGIN MONTAGE', 'END MONTAGE',
  'CLOSE ON', 'CLOSER', 'CLOSEUP', 'CLOSE UP',
  'INSERT', 'INSERT SHOT', 'BACK TO SCENE',
  'POV', 'POV SHOT', 'ANGLE ON', 'NEW ANGLE', 'ANOTHER ANGLE',
  'WIDE', 'WIDE ON', 'WIDE SHOT', 'OVERHEAD',
  'THE END', 'CONTINUED', 'OMITTED',
  'A BEAT', 'BEAT', 'PAUSE', 'SILENCE', 'MORE',
  'NOTE', 'NOTE TO', 'REVISED', 'REVISION',
]);

function isNonCharacterCaps(name: string): boolean {
  const upper = name.toUpperCase().trim();
  if (NON_CHARACTER_PHRASES.has(upper)) return true;
  // Also check if it starts with transition-like patterns
  if (/^(FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP|WIPE|IRIS|INTERCUT|BACK TO|CLOSE|INSERT|BEGIN|END|TITLE|SERIES|MONTAGE|ANGLE|ANOTHER|NEW ANGLE)/.test(upper)) return true;
  return false;
}

function isAllCapsOrCharacterName(line: string): boolean {
  const cleaned = line.replace(/[^A-Za-z\s]/g, '').trim();
  if (cleaned.length < 2) return false;
  const upperCount = (cleaned.match(/[A-Z]/g) || []).length;
  const letterCount = (cleaned.match(/[A-Za-z]/g) || []).length;
  return letterCount > 0 && upperCount / letterCount >= 0.8;
}

// Check if text looks like prose action (starts lowercase or looks like narrative)
function looksLikeAction(text: string): boolean {
  if (!text) return false;
  // Starts with lowercase letter
  if (/^[a-z]/.test(text)) return true;
  // Very long "character name" is probably action
  if (text.split(/\s+/).length > 5) return true;
  return false;
}

function cleanCharacterName(name: string): string {
  return name
    .replace(/\s*\(.*\)\s*$/, '') // Remove parenthetical like (V.O.) (CONT'D)
    .replace(/[:–—-]\s*$/, '')    // Remove trailing colon/dash
    .trim();
}

export function parseScript(rawText: string): ParsedScript {
  const lines = rawText.split(/\r?\n/);
  const scriptLines: ScriptLine[] = [];
  const characterSet = new Set<string>();
  let lineIndex = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { i++; continue; }

    // Scene headings
    if (SCENE_HEADING_PATTERN.test(line)) {
      scriptLines.push({ type: 'scene_heading', text: line, lineIndex: lineIndex++ });
      i++;
      continue;
    }

    // Parenthetical stage directions
    const dirMatch = line.match(DIRECTION_PATTERN) || line.match(DIRECTION_BLOCK_PATTERN);
    if (dirMatch) {
      scriptLines.push({ type: 'direction', text: dirMatch[1].trim(), lineIndex: lineIndex++ });
      i++;
      continue;
    }

    // Check for CHARACTER NAME (all caps line)
    const nameWithoutTrailing = line.replace(/[:–—-]\s*$/, '').trim();
    const potentialName = cleanCharacterName(nameWithoutTrailing);

    if (
      CHARACTER_NAME_PATTERN.test(nameWithoutTrailing) &&
      isAllCapsOrCharacterName(nameWithoutTrailing) &&
      !isNonCharacterCaps(potentialName) &&
      potentialName.length >= 2
    ) {
      // Check if inline colon dialogue: "CHARACTER: dialogue text"
      const colonMatch = line.match(/^([A-Z][A-Z\s.''-]+)[:–—]\s+(.+)$/);
      if (colonMatch && !isNonCharacterCaps(colonMatch[1].trim())) {
        const charName = cleanCharacterName(colonMatch[1]);
        characterSet.add(charName);
        scriptLines.push({
          type: 'dialogue', character: charName,
          text: colonMatch[2].trim(), lineIndex: lineIndex++,
        });
        i++;
        continue;
      }

      // Look ahead to collect dialogue — validate this is really a character
      const dialogueLines: string[] = [];
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) break;

        const nextNameClean = nextLine.replace(/[:–—-]\s*$/, '').trim();
        if (
          (CHARACTER_NAME_PATTERN.test(nextNameClean) && isAllCapsOrCharacterName(nextNameClean)) ||
          SCENE_HEADING_PATTERN.test(nextLine)
        ) break;

        const inlineDirMatch = nextLine.match(DIRECTION_PATTERN);
        if (inlineDirMatch) {
          if (dialogueLines.length > 0) {
            characterSet.add(potentialName);
            scriptLines.push({
              type: 'dialogue', character: potentialName,
              text: dialogueLines.join(' '), lineIndex: lineIndex++,
            });
            dialogueLines.length = 0;
          }
          scriptLines.push({ type: 'direction', text: inlineDirMatch[1].trim(), lineIndex: lineIndex++ });
          j++;
          continue;
        }

        dialogueLines.push(nextLine);
        j++;
      }

      if (dialogueLines.length > 0) {
        // Validate: if all "dialogue" lines look like action prose, treat as direction
        const allLookLikeAction = dialogueLines.every(l => looksLikeAction(l));
        if (allLookLikeAction) {
          // Treat the name line and following lines as a direction block
          scriptLines.push({
            type: 'direction',
            text: [line, ...dialogueLines].join(' '),
            lineIndex: lineIndex++,
          });
        } else {
          characterSet.add(potentialName);
          scriptLines.push({
            type: 'dialogue', character: potentialName,
            text: dialogueLines.join(' '), lineIndex: lineIndex++,
          });
        }
      } else {
        // Character name with no following dialogue = direction/transition
        scriptLines.push({ type: 'direction', text: line, lineIndex: lineIndex++ });
      }

      i = j;
      continue;
    }

    // Fallback: action/direction line
    scriptLines.push({ type: 'direction', text: line, lineIndex: lineIndex++ });
    i++;
  }

  const firstHeading = scriptLines.find(l => l.type === 'scene_heading');
  const title = firstHeading?.text || 'Untitled Script';

  // Filter out characters that appeared only once with no real dialogue
  // (likely misparses) — keep only chars with 2+ lines OR any char with 1+ substantial line
  const charLineCounts = new Map<string, number>();
  scriptLines.forEach(l => {
    if (l.type === 'dialogue' && l.character) {
      charLineCounts.set(l.character, (charLineCounts.get(l.character) || 0) + 1);
    }
  });

  // Characters that appear only once AND whose "dialogue" is short are suspect
  // Keep them but flag them — user can correct in setup
  const characters = Array.from(characterSet)
    .filter(c => charLineCounts.has(c))
    .sort();

  return { title, characters, lines: scriptLines, rawText };
}

// Allow toggling a line's type (for manual correction)
export function toggleLineType(script: ParsedScript, lineIndex: number): ParsedScript {
  const lines = script.lines.map(l => {
    if (l.lineIndex !== lineIndex) return l;
    if (l.type === 'dialogue') {
      return { ...l, type: 'direction' as const };
    }
    if (l.type === 'direction') {
      return { ...l, type: 'dialogue' as const };
    }
    return l;
  });

  // Recompute characters
  const characters = Array.from(
    new Set(lines.filter(l => l.type === 'dialogue' && l.character).map(l => l.character!))
  ).sort();

  return { ...script, lines, characters };
}
