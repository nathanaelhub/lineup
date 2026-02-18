import type { ParsedScript, ScriptLine } from '../types';

const SCENE_HEADING_PATTERN = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*.+/i;
const DIRECTION_PATTERN = /^\s*\(([^)]+)\)\s*$/;
const DIRECTION_BLOCK_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const CHARACTER_NAME_PATTERN = /^([A-Z][A-Z\s.''-]{1,40})(?:\s*\(([^)]*)\))?\s*$/;

function isAllCapsOrCharacterName(line: string): boolean {
  const cleaned = line.replace(/[^A-Za-z\s]/g, '').trim();
  if (cleaned.length < 2) return false;
  // Must be mostly uppercase letters
  const upperCount = (cleaned.match(/[A-Z]/g) || []).length;
  const letterCount = (cleaned.match(/[A-Za-z]/g) || []).length;
  return letterCount > 0 && upperCount / letterCount >= 0.8;
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

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Check for scene headings
    if (SCENE_HEADING_PATTERN.test(line)) {
      scriptLines.push({
        type: 'scene_heading',
        text: line,
        lineIndex: lineIndex++,
      });
      i++;
      continue;
    }

    // Check for parenthetical stage directions
    const dirMatch = line.match(DIRECTION_PATTERN) || line.match(DIRECTION_BLOCK_PATTERN);
    if (dirMatch) {
      scriptLines.push({
        type: 'direction',
        text: dirMatch[1].trim(),
        lineIndex: lineIndex++,
      });
      i++;
      continue;
    }

    // Check for CHARACTER NAME format (all caps, possibly with colon)
    const nameWithColon = line.replace(/[:–—-]\s*$/, '').trim();
    if (CHARACTER_NAME_PATTERN.test(nameWithColon) && isAllCapsOrCharacterName(nameWithColon)) {
      const charName = cleanCharacterName(nameWithColon);

      // Check if there's inline dialogue after a colon (CHARACTER: dialogue)
      const colonMatch = line.match(/^[A-Z][A-Z\s.''-]+[:–—-]\s+(.+)$/);
      if (colonMatch) {
        characterSet.add(charName);
        scriptLines.push({
          type: 'dialogue',
          character: charName,
          text: colonMatch[1].trim(),
          lineIndex: lineIndex++,
        });
        i++;
        continue;
      }

      // Collect dialogue lines that follow the character name
      const dialogueLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) break; // blank line ends the dialogue block

        // Check if next line is itself a character name or scene heading
        const nextNameClean = nextLine.replace(/[:–—-]\s*$/, '').trim();
        if (
          (CHARACTER_NAME_PATTERN.test(nextNameClean) && isAllCapsOrCharacterName(nextNameClean)) ||
          SCENE_HEADING_PATTERN.test(nextLine)
        ) {
          break;
        }

        // Inline parenthetical direction within dialogue
        const inlineDirMatch = nextLine.match(DIRECTION_PATTERN);
        if (inlineDirMatch) {
          // If we have dialogue collected, emit it first
          if (dialogueLines.length > 0) {
            characterSet.add(charName);
            scriptLines.push({
              type: 'dialogue',
              character: charName,
              text: dialogueLines.join(' '),
              lineIndex: lineIndex++,
            });
            dialogueLines.length = 0;
          }
          scriptLines.push({
            type: 'direction',
            text: inlineDirMatch[1].trim(),
            lineIndex: lineIndex++,
          });
          j++;
          continue;
        }

        dialogueLines.push(nextLine);
        j++;
      }

      if (dialogueLines.length > 0) {
        characterSet.add(charName);
        scriptLines.push({
          type: 'dialogue',
          character: charName,
          text: dialogueLines.join(' '),
          lineIndex: lineIndex++,
        });
      }

      i = j;
      continue;
    }

    // Fallback: treat as direction/action line if it doesn't match anything
    scriptLines.push({
      type: 'direction',
      text: line,
      lineIndex: lineIndex++,
    });
    i++;
  }

  // Derive title from first scene heading or first line
  const firstHeading = scriptLines.find(l => l.type === 'scene_heading');
  const title = firstHeading?.text || 'Untitled Script';

  return {
    title,
    characters: Array.from(characterSet).sort(),
    lines: scriptLines,
    rawText,
  };
}
