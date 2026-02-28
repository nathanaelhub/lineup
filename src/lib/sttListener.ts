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
  // Set to true in stopListening() so the resulting async onend event
  // doesn't fire onSpeechEnd (which would cause a spurious line advance).
  private suppressNextEnd: boolean = false;
  private hadSpeech: boolean = false;
  private speechEndTimer: ReturnType<typeof setTimeout> | null = null;
  private floorTimer: ReturnType<typeof setTimeout> | null = null;
  private listenStartTime: number = 0;

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
        this.listenStartTime = Date.now();
      };

      this.recognition.onspeechstart = () => {
        this.hadSpeech = true;
        this.callbacks.onSpeechStart?.();
      };

      // onspeechend fires when the user stops talking but BEFORE onresult
      // delivers the final transcript. We intentionally do NOT call onSpeechEnd
      // here — we wait for onend (which fires after onresult) so the transcript
      // is available before advancing.

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
        if (this.suppressNextEnd) {
          this.suppressNextEnd = false;
          this.hadSpeech = false;
          return;
        }
        if (!this.hadSpeech) {
          // No speech detected — wait until minimum listen floor has passed
          // to prevent lines from being skipped before user opens their mouth.
          const elapsed = Date.now() - this.listenStartTime;
          const remaining = Math.max(0, 2500 - elapsed);
          if (this.floorTimer) clearTimeout(this.floorTimer);
          this.floorTimer = setTimeout(() => {
            this.floorTimer = null;
            this.hadSpeech = false;
            this.callbacks.onSpeechEnd?.();
          }, remaining);
          return;
        }
        // Speech was detected — wait 1500ms grace period before advancing,
        // in case the user paused mid-sentence.
        if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
        this.speechEndTimer = setTimeout(() => {
          this.hadSpeech = false;
          this.speechEndTimer = null;
          this.callbacks.onSpeechEnd?.();
        }, 1500);
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
    // Suppress the onend that recognition.stop() will fire asynchronously,
    // so it doesn't trigger a spurious onSpeechEnd → advance.
    if (this.floorTimer) { clearTimeout(this.floorTimer); this.floorTimer = null; }
    if (this.speechEndTimer) { clearTimeout(this.speechEndTimer); this.speechEndTimer = null; }
    this.hadSpeech = false;
    this.suppressNextEnd = true;
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
