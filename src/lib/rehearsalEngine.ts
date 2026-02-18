import type { ParsedScript, ScriptLine, RehearsalState } from '../types';

export interface RehearsalEngineState {
  state: RehearsalState;
  currentLineIndex: number;
  currentLine: ScriptLine | null;
}

export function getDialogueLines(script: ParsedScript, showDirections: boolean): ScriptLine[] {
  return script.lines.filter(line => {
    if (line.type === 'scene_heading') return false;
    if (line.type === 'direction' && !showDirections) return false;
    return true;
  });
}

export function isMyLine(line: ScriptLine, myCharacter: string): boolean {
  return line.type === 'dialogue' && line.character === myCharacter;
}

export function isOtherLine(line: ScriptLine, myCharacter: string): boolean {
  return line.type === 'dialogue' && line.character !== myCharacter;
}

export function isDirection(line: ScriptLine): boolean {
  return line.type === 'direction';
}
