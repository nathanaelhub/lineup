export interface ScriptLine {
  type: 'dialogue' | 'direction' | 'scene_heading';
  character?: string;
  text: string;
  lineIndex: number;
}

export interface ParsedScript {
  title: string;
  characters: string[];
  lines: ScriptLine[];
  rawText: string;
}

export interface VoiceConfig {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface CharacterVoiceMap {
  [character: string]: VoiceConfig;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voices: ElevenLabsVoice[];
  characterVoiceMap: Record<string, string>; // character -> voice_id
}

export interface SessionConfig {
  script: ParsedScript;
  myCharacter: string;
  autoAdvance: boolean;
  offBook: boolean;
  showDirections: boolean;
  cueMode: boolean;
  speed: number;
  startIndex?: number;
  elevenLabs?: ElevenLabsConfig;
  characterPitchMap?: Record<string, number>;
}

export interface TranscriptFeedback {
  heard: string;
  score: number;
}

export interface SavedPosition {
  scriptTitle: string;
  lineIndex: number;
  character: string;
  savedAt: number;
}

export type RehearsalState =
  | 'IDLE'
  | 'PLAYING_OTHER'
  | 'WAITING_FOR_USER'
  | 'USER_SPEAKING'
  | 'PAUSED'
  | 'COMPLETE';

export interface RehearsalProgress {
  currentLineIndex: number;
  totalLines: number;
  percentage: number;
}

export type AppScreen = 'home' | 'setup' | 'rehearsal';

export interface SavedScript {
  id: string;
  title: string;
  rawText: string;
  parsedScript: ParsedScript;
  savedAt: number;
}
