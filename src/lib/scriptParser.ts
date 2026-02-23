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
  'INSERT', 'INSERT SHOT',
  'POV', 'POV SHOT', 'ANGLE ON', 'NEW ANGLE', 'ANOTHER ANGLE',
  'WIDE', 'WIDE ON', 'WIDE SHOT', 'OVERHEAD',
  'THE END', 'CONTINUED', 'OMITTED',
  'A BEAT', 'BEAT', 'PAUSE', 'SILENCE', 'MORE',
  'NOTE', 'NOTE TO', 'REVISED', 'REVISION',
  // Page continuation artifacts
  'CONTINUED:', 'CONT\'D', '(CONTINUED)', '(MORE)',
]);

function isNonCharacterCaps(name: string): boolean {
  const upper = name.toUpperCase().trim();
  if (NON_CHARACTER_PHRASES.has(upper)) return true;
  // Also matches if starts with transition-like words
  if (/^(FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP|WIPE|IRIS|INTERCUT|BACK TO|CLOSE|INSERT|BEGIN|END|TITLE|SERIES|MONTAGE|ANGLE|ANOTHER|NEW ANGLE)/.test(upper)) return true;
  // Pure numbers (page numbers in margins)
  if (/^\d+\.?$/.test(upper)) return true;
  return false;
}

function isAllCapsOrCharacterName(line: string): boolean {
  const cleaned = line.replace(/[^A-Za-z\s]/g, '').trim();
  if (cleaned.length < 2) return false;
  const upperCount = (cleaned.match(/[A-Z]/g) || []).length;
  const letterCount = (cleaned.match(/[A-Za-z]/g) || []).length;
  return letterCount > 0 && upperCount / letterCount >= 0.8;
}

// Check if text looks like prose action rather than dialogue
function looksLikeAction(text: string): boolean {
  if (!text) return false;
  // Starts with lowercase letter → definitely action/continuation prose
  if (/^[a-z]/.test(text)) return true;
  // Very long line is probably action (8+ words)
  if (text.split(/\s+/).length > 8) return true;
  return false;
}

function cleanCharacterName(name: string): string {
  return name
    .replace(/\s*\(.*\)\s*$/, '') // Remove parenthetical like (V.O.) (CONT'D)
    .replace(/[:–—-]\s*$/, '')    // Remove trailing colon/dash
    .trim();
}

// Returns leading space count (indentation) of a raw line
function getIndent(rawLine: string): number {
  return rawLine.match(/^(\s*)/)?.[1].length ?? 0;
}

// Detect if the input was produced by a PDF extractor that preserves indentation.
// We consider it indented mode if >15% of non-empty lines have ≥8 leading spaces.
function detectIndentedMode(rawLines: string[]): boolean {
  const nonEmpty = rawLines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 10) return false;
  const indented = nonEmpty.filter(l => getIndent(l) >= 8).length;
  return indented / nonEmpty.length > 0.15;
}

// In indented (PDF) mode, classify a line by its indent level.
// Standard screenplay indentation (in points, converted to spaces at ~7pt/space):
//   Action:       ~0 spaces   (leftmost, ~108pt)
//   Dialogue:     ~10 spaces  (~180pt)
//   Parenthetical:~16 spaces  (~223pt)
//   Character:    ~22 spaces  (~266pt)
type IndentClass = 'action' | 'dialogue' | 'character' | 'unknown';

function classifyByIndent(indent: number): IndentClass {
  if (indent >= 18) return 'character';  // most indented = character name or parenthetical
  if (indent >= 8) return 'dialogue';    // moderate = dialogue
  if (indent < 5) return 'action';       // leftmost = stage direction / action
  return 'unknown';
}

export function parseScript(rawText: string): ParsedScript {
  const rawLines = rawText.split(/\r?\n/);
  const isIndented = detectIndentedMode(rawLines);

  const scriptLines: ScriptLine[] = [];
  const characterSet = new Set<string>();
  let lineIndex = 0;

  let i = 0;
  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const indent = getIndent(rawLine);
    const line = rawLine.trim();

    if (!line) { i++; continue; }

    // Scene headings
    if (SCENE_HEADING_PATTERN.test(line)) {
      scriptLines.push({ type: 'scene_heading', text: line, lineIndex: lineIndex++ });
      i++;
      continue;
    }

    // Parenthetical stage directions (full-line)
    const dirMatch = line.match(DIRECTION_PATTERN) || line.match(DIRECTION_BLOCK_PATTERN);
    if (dirMatch) {
      scriptLines.push({ type: 'direction', text: dirMatch[1].trim(), lineIndex: lineIndex++ });
      i++;
      continue;
    }

    // In indented (PDF) mode: action-level lines are never character names
    if (isIndented && classifyByIndent(indent) === 'action') {
      scriptLines.push({ type: 'direction', text: line, lineIndex: lineIndex++ });
      i++;
      continue;
    }

    // Check for CHARACTER NAME (all caps line)
    const nameWithoutTrailing = line.replace(/[:–—-]\s*$/, '').trim();
    const potentialName = cleanCharacterName(nameWithoutTrailing);

    // In indented mode, high-indent lines are character names even without strict caps check
    // In plain text mode, require the usual ALL-CAPS pattern
    const isCharacterCandidate = isIndented
      ? (classifyByIndent(indent) === 'character' &&
         potentialName.length >= 2 &&
         !isNonCharacterCaps(potentialName) &&
         !looksLikeAction(line))
      : (CHARACTER_NAME_PATTERN.test(nameWithoutTrailing) &&
         isAllCapsOrCharacterName(nameWithoutTrailing) &&
         !isNonCharacterCaps(potentialName) &&
         potentialName.length >= 2);

    if (isCharacterCandidate) {
      // Check for inline colon dialogue: "CHARACTER: dialogue text"
      const colonMatch = line.match(/^([A-Z][A-Z\s.''-]+)[:–—]\s+(.+)$/);
      if (colonMatch && !isNonCharacterCaps(colonMatch[1].trim())) {
        const charName = cleanCharacterName(colonMatch[1]);
        characterSet.add(charName);
        scriptLines.push({
          type: 'dialogue', character: charName,
          text: colonMatch[2].trim().replace(/\s*\([^)]*\)\s*$/, '').trim(), lineIndex: lineIndex++,
        });
        i++;
        continue;
      }

      // Look ahead to collect dialogue lines
      const dialogueLines: string[] = [];
      let j = i + 1;

      while (j < rawLines.length) {
        const nextRaw = rawLines[j];
        const nextIndent = getIndent(nextRaw);
        const nextLine = nextRaw.trim();

        if (!nextLine) break;

        // In indented mode: action-level line ends the dialogue block
        if (isIndented && classifyByIndent(nextIndent) === 'action') break;

        // Another character name or scene heading ends the block
        const nextNameClean = nextLine.replace(/[:–—-]\s*$/, '').trim();
        const nextIsCharacter = isIndented
          ? (classifyByIndent(nextIndent) === 'character' &&
             !isNonCharacterCaps(cleanCharacterName(nextNameClean)) &&
             !looksLikeAction(nextLine))
          : (CHARACTER_NAME_PATTERN.test(nextNameClean) && isAllCapsOrCharacterName(nextNameClean));

        if (nextIsCharacter || SCENE_HEADING_PATTERN.test(nextLine)) break;

        // Full-line parenthetical (direction) inside dialogue block
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

        // In plain text mode: stop collecting if a line looks like action prose
        // (long line starting uppercase – likely a narrative sentence, not dialogue)
        if (!isIndented && looksLikeAction(nextLine) && dialogueLines.length > 0) break;

        // Strip any leading parenthetical stage direction from the start of a dialogue line.
        // Handles page-continuation markers like (CONT'D), (MORE), and inline acting notes
        // like (embarrassed), (singing), (pissy) that PDF layouts attach to the start of text.
        const cleanedNext = nextLine.replace(/^\([^)]+\)\s*/, '').trim();
        if (cleanedNext) dialogueLines.push(cleanedNext);
        j++;
      }

      if (dialogueLines.length > 0) {
        // In indented mode the indent level already confirms these are dialogue lines —
        // skip the action heuristic which incorrectly drops long single-line speeches.
        // Only apply it in plain-text mode where we might accidentally grab action prose.
        const allLookLikeAction = !isIndented && dialogueLines.every(l => looksLikeAction(l));
        if (allLookLikeAction) {
          scriptLines.push({
            type: 'direction',
            text: [line, ...dialogueLines].join(' '),
            lineIndex: lineIndex++,
          });
        } else {
          characterSet.add(potentialName);
          scriptLines.push({
            type: 'dialogue', character: potentialName,
            text: dialogueLines.join(' ').replace(/\s*\([^)]*\)\s*$/, '').trim(), lineIndex: lineIndex++,
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

  const charLineCounts = new Map<string, number>();
  scriptLines.forEach(l => {
    if (l.type === 'dialogue' && l.character) {
      charLineCounts.set(l.character, (charLineCounts.get(l.character) || 0) + 1);
    }
  });

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

  const characters = Array.from(
    new Set(lines.filter(l => l.type === 'dialogue' && l.character).map(l => l.character!))
  ).sort();

  return { ...script, lines, characters };
}
