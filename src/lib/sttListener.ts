export interface STTCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

class STTListener {
  private recognition: any = null;
  private isListening: boolean = false;
  private callbacks: STTCallbacks = {};

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onspeechstart = () => {
        this.callbacks.onSpeechStart?.();
      };

      this.recognition.onspeechend = () => {
        this.callbacks.onSpeechEnd?.();
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          this.callbacks.onTranscript?.(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          this.callbacks.onTranscript?.(interimTranscript.trim(), false);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onSpeechEnd?.();
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.callbacks.onError?.(event.error);
        }
        this.isListening = false;
      };
    }
  }

  get isSupported(): boolean {
    return this.recognition !== null;
  }

  get listening(): boolean {
    return this.isListening;
  }

  setCallbacks(callbacks: STTCallbacks): void {
    this.callbacks = callbacks;
  }

  startListening(): void {
    if (!this.recognition) return;
    if (this.isListening) return;
    try {
      this.recognition.start();
    } catch {
      // Already started
    }
  }

  stopListening(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      // Already stopped
    }
    this.isListening = false;
  }
}

// Singleton
export const sttListener = new STTListener();

// Utility: compare two strings for similarity (Levenshtein-based percentage)
export function compareTranscript(expected: string, actual: string): number {
  const a = expected.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const b = actual.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (a === b) return 100;
  if (!a || !b) return 0;

  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const setA = new Set(wordsA);
  const matches = wordsB.filter(w => setA.has(w)).length;

  return Math.round((matches / Math.max(wordsA.length, wordsB.length)) * 100);
}
