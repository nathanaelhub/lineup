import type { VoiceConfig } from '../types';

class TTSEngine {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private _rate: number = 1.0;
  private _volume: number = 1.0;
  private voicesLoaded: boolean = false;
  private voicesLoadedPromise: Promise<void>;

  constructor() {
    this.synth = window.speechSynthesis;
    this.voicesLoadedPromise = new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = this.synth.getVoices();
        if (this.voices.length > 0) {
          this.voicesLoaded = true;
          resolve();
        }
      };
      loadVoices();
      if (!this.voicesLoaded) {
        this.synth.addEventListener('voiceschanged', loadVoices);
      }
    });
  }

  async waitForVoices(): Promise<void> {
    await this.voicesLoadedPromise;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getEnglishVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  assignVoicesToCharacters(characters: string[], pitchOverrides?: Record<string, number>): Record<string, VoiceConfig> {
    const englishVoices = this.getEnglishVoices();
    const map: Record<string, VoiceConfig> = {};

    characters.forEach((char, i) => {
      const voice = englishVoices.length > 0
        ? englishVoices[i % englishVoices.length]
        : null;
      map[char] = {
        voice,
        rate: this._rate,
        pitch: pitchOverrides?.[char] ?? (0.9 + (i * 0.15) % 0.6),
        volume: this._volume,
      };
    });

    return map;
  }

  speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (config?.voice) utterance.voice = config.voice;
      utterance.rate = config?.rate ?? this._rate;
      utterance.pitch = config?.pitch ?? 1.0;
      utterance.volume = config?.volume ?? this._volume;
      utterance.onend = () => { resolve(); };
      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') { resolve(); }
        else { reject(e); }
      };
      // Chrome race condition: cancel() then immediate speak() causes the new
      // utterance to receive an 'interrupted' error instantly. A short delay
      // lets Chrome finish processing the cancel before accepting new speech.
      setTimeout(() => { this.synth.speak(utterance); }, 50);
    });
  }

  stop(): void {
    this.synth.cancel();
      }

  pause(): void {
    this.synth.pause();
  }

  resume(): void {
    this.synth.resume();
  }

  get isSpeaking(): boolean {
    return this.synth.speaking;
  }

  get isPaused(): boolean {
    return this.synth.paused;
  }

  setRate(rate: number): void {
    this._rate = Math.max(0.5, Math.min(2.0, rate));
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
  }

  get rate(): number {
    return this._rate;
  }

  get volume(): number {
    return this._volume;
  }
}

// Singleton
export const ttsEngine = new TTSEngine();
