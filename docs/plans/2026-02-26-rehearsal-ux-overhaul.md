# Rehearsal UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix TTS and mic timing bugs, strip the rehearsal screen to its essentials, move all advanced controls into a slide-in settings drawer, and add a blackout script view.

**Architecture:** Bug fixes go directly in the engine/listener singletons. The rehearsal screen is restructured to a 3-button transport + two icon buttons (settings, script view). A new `SettingsDrawer` component receives the same callbacks already threaded through `TransportControls`. A new `ScriptView` component renders `ScriptLine[]` with the user's lines replaced by black bars.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite, Web Speech API, `pdfjs-dist`

**Verification:** No test framework — use `npm run build` for type checking and `npm run dev` for manual browser verification after each task.

---

### Task 1: Fix TTS cutting off early (Chrome cancel/speak race condition)

**Files:**
- Modify: `src/lib/ttsEngine.ts`

**Context:** `ttsEngine.speak()` calls `this.synth.cancel()` then immediately `this.synth.speak()`. Chrome fires `onerror('interrupted')` on the new utterance, which the current code resolves as success — advancing the line without speaking.

**Step 1: Locate the speak method**

Open `src/lib/ttsEngine.ts`. Find the `speak()` method (~line 59). It currently looks like:

```typescript
speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    // ...config setup...
    utterance.onend = () => { resolve(); };
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve();
      } else {
        reject(e);
      }
    };

    this.synth.speak(utterance);
  });
}
```

**Step 2: Apply the fix — wrap speak in a 50ms setTimeout**

Replace the entire `speak()` method with:

```typescript
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
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve();
      } else {
        reject(e);
      }
    };

    // Chrome race condition: cancel() then immediate speak() causes the new
    // utterance to receive an 'interrupted' error instantly. A short delay
    // lets Chrome finish processing the cancel before accepting new speech.
    setTimeout(() => {
      this.synth.speak(utterance);
    }, 50);
  });
}
```

Also update `stop()` to call `this.synth.cancel()` directly (remove `this.stop()` call from inside `speak()` since we now do `this.synth.cancel()` directly):

```typescript
stop(): void {
  this.synth.cancel();
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors, build completes successfully.

**Step 4: Manual test**

```bash
npm run dev
```

Load a script, pick a character, start rehearsal. The other character's lines should now speak fully before advancing.

**Step 5: Commit**

```bash
git add src/lib/ttsEngine.ts
git commit -m "Fix TTS cutting off early: add 50ms delay between cancel and speak"
```

---

### Task 2: Fix mic advancing too early (grace period before onSpeechEnd)

**Files:**
- Modify: `src/lib/sttListener.ts`

**Context:** `onend` fires after any pause in speech, including mid-sentence. The app then immediately advances. Fix: wait 1500ms after `onend` before calling `onSpeechEnd`. If speech is detected (`onspeechstart` fired), apply the delay. If no speech was detected at all, advance immediately.

**Step 1: Add state fields to STTListener class**

In `sttListener.ts`, add two new private fields to the `STTListener` class (after `suppressNextEnd`):

```typescript
private hadSpeech: boolean = false;
private speechEndTimer: ReturnType<typeof setTimeout> | null = null;
```

**Step 2: Set hadSpeech in onspeechstart**

Find the `onspeechstart` handler and update it:

```typescript
this.recognition.onspeechstart = () => {
  this.hadSpeech = true;
  this.callbacks.onSpeechStart?.();
};
```

**Step 3: Update onend to use grace period**

Replace the current `onend` handler:

```typescript
this.recognition.onend = () => {
  this.isListening = false;
  if (this.suppressNextEnd) {
    this.suppressNextEnd = false;
    this.hadSpeech = false;
    return;
  }
  if (!this.hadSpeech) {
    // No speech detected — advance immediately (no point waiting)
    this.hadSpeech = false;
    this.callbacks.onSpeechEnd?.();
    return;
  }
  // Speech was detected — wait 1500ms grace period before advancing,
  // in case the user paused mid-sentence.
  this.hadSpeech = false;
  if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
  this.speechEndTimer = setTimeout(() => {
    this.speechEndTimer = null;
    this.callbacks.onSpeechEnd?.();
  }, 1500);
};
```

**Step 4: Clear timer in stopListening**

Update `stopListening()` to also clear the grace period timer:

```typescript
stopListening(): void {
  if (!this.recognition) return;
  if (this.speechEndTimer) {
    clearTimeout(this.speechEndTimer);
    this.speechEndTimer = null;
  }
  this.suppressNextEnd = true;
  this.hadSpeech = false;
  try {
    this.recognition.stop();
  } catch {
    // Already stopped
  }
  this.isListening = false;
}
```

**Step 5: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 6: Manual test**

Start rehearsal with auto-advance on. Speak your line with a natural pause in the middle. The app should wait until ~1.5s after you finish before advancing.

**Step 7: Commit**

```bash
git add src/lib/sttListener.ts
git commit -m "Add 1500ms grace period before mic auto-advance to prevent mid-sentence skip"
```

---

### Task 3: Build SettingsDrawer component

**Files:**
- Create: `src/components/SettingsDrawer.tsx`

**Context:** This component replaces all the advanced controls currently in `TransportControls`. It slides in from the right. It receives the same callbacks and state already threaded through the rehearsal screen.

**Step 1: Check what props TransportControls currently accepts**

Open `src/components/TransportControls.tsx` and note all the props passed in from `RehearsalScreen`. These are the props that will move to `SettingsDrawer`.

**Step 2: Create SettingsDrawer.tsx**

```typescript
import type { RehearsalState } from '../types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Playback
  speed: number;
  onSpeedChange: (speed: number) => void;
  // Modes
  autoAdvance: boolean;
  offBook: boolean;
  cueMode: boolean;
  justMyCues: boolean;
  onToggleAutoAdvance: () => void;
  onToggleOffBook: () => void;
  onToggleCueMode: () => void;
  onToggleJustMyCues: () => void;
  // Loop
  loopStart: number | null;
  loopEnd: number | null;
  loopIteration: number;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  // Navigation
  onOpenJumpMenu: () => void;
  // Stats
  runStats: { accuracy: number; avgTime: number; stumbles: number };
  state: RehearsalState;
  // PWA
  isPWAInstallable?: boolean;
  onInstall?: () => void;
}

export function SettingsDrawer({
  isOpen, onClose,
  speed, onSpeedChange,
  autoAdvance, offBook, cueMode, justMyCues,
  onToggleAutoAdvance, onToggleOffBook, onToggleCueMode, onToggleJustMyCues,
  loopStart, loopEnd, loopIteration,
  onSetLoopStart, onSetLoopEnd, onClearLoop,
  onOpenJumpMenu,
  runStats, state,
  isPWAInstallable, onInstall,
}: SettingsDrawerProps) {
  const hasStats = runStats.accuracy > 0 || runStats.avgTime > 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div className={`fixed top-0 right-0 h-full w-72 z-50 bg-bg-secondary shadow-2xl
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-bg-tertiary">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Modes */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Modes</p>
            <DrawerToggle label="Auto-advance" description="Mic detects when you finish" checked={autoAdvance} onChange={onToggleAutoAdvance} />
            <DrawerToggle label="Off-book" description="Hides your lines" checked={offBook} onChange={onToggleOffBook} />
            <DrawerToggle label="Cue mode" description="Last 3 words only" checked={cueMode} onChange={onToggleCueMode} />
            <DrawerToggle label="Just my cues" description="Off-book + cue mode" checked={justMyCues} onChange={onToggleJustMyCues} />
          </section>

          {/* Speed */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Speed</p>
            <div className="flex gap-1">
              {[0.75, 1.0, 1.25, 1.5].map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${Math.abs(speed - s) < 0.01 ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </section>

          {/* Loop */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">
              Loop {loopIteration > 0 ? `(×${loopIteration})` : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onSetLoopStart}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                  ${loopStart !== null ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              >
                {loopStart !== null ? `A: ${loopStart + 1}` : 'Set A'}
              </button>
              <button
                onClick={onSetLoopEnd}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                  ${loopEnd !== null ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'}`}
              >
                {loopEnd !== null ? `B: ${loopEnd + 1}` : 'Set B'}
              </button>
              {(loopStart !== null || loopEnd !== null) && (
                <button
                  onClick={onClearLoop}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-bg-tertiary text-text-muted hover:text-error transition-all"
                >
                  ✕
                </button>
              )}
            </div>
          </section>

          {/* Navigation */}
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">Navigation</p>
            <button
              onClick={() => { onOpenJumpMenu(); onClose(); }}
              className="w-full py-2.5 rounded-lg text-sm text-text-secondary bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors text-left px-3"
            >
              Jump to line…
            </button>
          </section>

          {/* Stats */}
          {hasStats && (
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">This run</p>
              <div className="flex gap-2">
                <StatPill label="Accuracy" value={`${runStats.accuracy}%`}
                  color={runStats.accuracy >= 80 ? 'text-success' : runStats.accuracy >= 50 ? 'text-warning' : 'text-error'} />
                <StatPill label="Avg/line" value={`${runStats.avgTime}s`} color="text-text-primary" />
                <StatPill label="Stumbles" value={`${runStats.stumbles}`} color="text-warning" />
              </div>
            </section>
          )}

          {/* PWA install */}
          {isPWAInstallable && onInstall && (
            <button
              onClick={onInstall}
              className="w-full py-2.5 rounded-lg text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              Add to Home Screen
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerToggle({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between bg-bg-tertiary rounded-xl px-3 py-2.5 hover:bg-bg-tertiary/80 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 ml-3 ${checked ? 'bg-accent' : 'bg-bg-secondary'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 bg-bg-tertiary rounded-lg p-2 flex flex-col items-center gap-0.5">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: clean build (component isn't wired in yet, but must type-check).

**Step 4: Commit**

```bash
git add src/components/SettingsDrawer.tsx
git commit -m "Add SettingsDrawer component with all advanced rehearsal controls"
```

---

### Task 4: Build ScriptView component (blackout mode)

**Files:**
- Create: `src/components/ScriptView.tsx`

**Context:** Renders `ScriptLine[]` as a screenplay-formatted scroll view. The user's own dialogue lines are replaced with a solid black bar (sized to text length). Uses data already available in `SessionConfig`.

**Step 1: Check ScriptLine type**

Open `src/types/index.ts`. Confirm `ScriptLine` has: `type: 'dialogue' | 'direction' | 'scene_heading'`, `text: string`, `character?: string`, `lineIndex: number`.

**Step 2: Create ScriptView.tsx**

```typescript
import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';

interface ScriptViewProps {
  lines: ScriptLine[];
  myCharacter: string;
  characters: string[];
  onClose: () => void;
}

export function ScriptView({ lines, myCharacter, characters, onClose }: ScriptViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-bg-tertiary">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Script</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Blacking out: <span className="font-medium text-text-secondary">{myCharacter}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Script scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-mono text-sm">
        {lines.map(line => (
          <ScriptLineRow
            key={line.lineIndex}
            line={line}
            myCharacter={myCharacter}
            characters={characters}
          />
        ))}
        <div className="h-12" />
      </div>
    </div>
  );
}

function ScriptLineRow({
  line, myCharacter, characters,
}: {
  line: ScriptLine;
  myCharacter: string;
  characters: string[];
}) {
  if (line.type === 'scene_heading') {
    return (
      <p className="text-xs font-bold uppercase tracking-widest text-text-muted/50 pt-4 pb-1">
        {line.text}
      </p>
    );
  }

  if (line.type === 'direction') {
    return (
      <p className="text-text-muted italic text-xs px-4">
        ({line.text})
      </p>
    );
  }

  // Dialogue
  const isMe = line.character === myCharacter;
  const color = line.character ? getCharacterColor(line.character, characters) : undefined;

  // Black bar width: roughly proportional to text length, capped at full width
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-bold tracking-wider" style={{ color }}>
        {line.character}
      </p>
      {isMe ? (
        <div
          className="h-5 rounded-sm bg-text-primary/90"
          style={{ width: `${barWidth}%` }}
          aria-label="[your line]"
        />
      ) : (
        <p className="text-text-secondary leading-relaxed">{line.text}</p>
      )}
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

**Step 4: Commit**

```bash
git add src/components/ScriptView.tsx
git commit -m "Add ScriptView component with blackout mode for user's lines"
```

---

### Task 5: Simplify TransportControls to 3-button row

**Files:**
- Modify: `src/components/TransportControls.tsx`

**Context:** All advanced controls are now in `SettingsDrawer`. `TransportControls` should only contain Back, Play/Pause/Advance, and Skip.

**Step 1: Read the current TransportControls**

Open `src/components/TransportControls.tsx`. Note all the props it currently accepts — you'll be removing most of them.

**Step 2: Replace TransportControls entirely**

Replace the entire file with a minimal 3-button component:

```typescript
import type { RehearsalState } from '../types';

interface TransportControlsProps {
  state: RehearsalState;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onBack: () => void;
  onAdvance: () => void;
}

export function TransportControls({
  state, onPlay, onPause, onSkip, onBack, onAdvance,
}: TransportControlsProps) {
  const isWaiting = state === 'WAITING_FOR_USER' || state === 'USER_SPEAKING';
  const isIdle = state === 'IDLE';
  const isPaused = state === 'PAUSED';

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={isIdle}
        className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center
          text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all
          disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
          <polyline points="9 18 3 12 9 6" />
        </svg>
      </button>

      {/* Centre: Play / Pause / Advance */}
      {isWaiting ? (
        <button
          onClick={onAdvance}
          className="flex-1 h-14 rounded-2xl bg-accent text-white font-semibold text-sm
            hover:bg-accent-glow transition-all active:scale-[0.98] shadow-lg shadow-accent/20"
        >
          Next →
        </button>
      ) : isIdle || isPaused ? (
        <button
          onClick={onPlay}
          className="flex-1 h-14 rounded-2xl bg-accent text-white font-semibold text-sm
            hover:bg-accent-glow transition-all active:scale-[0.98] shadow-lg shadow-accent/20"
        >
          {isPaused ? 'Resume' : 'Start'}
        </button>
      ) : (
        <button
          onClick={onPause}
          className="flex-1 h-14 rounded-2xl bg-bg-secondary text-text-primary font-semibold text-sm
            hover:bg-bg-tertiary transition-all active:scale-[0.98]"
        >
          Pause
        </button>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        disabled={isIdle}
        className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center
          text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all
          disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
          <polyline points="15 18 21 12 15 6" />
        </svg>
      </button>
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: TypeScript errors because `RehearsalScreen` still passes old props. That's expected — fix in next task.

**Step 4: Commit**

```bash
git add src/components/TransportControls.tsx
git commit -m "Simplify TransportControls to 3-button row (back, play/pause/advance, skip)"
```

---

### Task 6: Wire everything into RehearsalScreen

**Files:**
- Modify: `src/components/RehearsalScreen.tsx`

**Context:** Wire in `SettingsDrawer` and `ScriptView`, update `TransportControls` call to the new minimal props, add ⚙ and 📄 icon buttons to the top bar.

**Step 1: Add imports**

At the top of `RehearsalScreen.tsx`, add:

```typescript
import { SettingsDrawer } from './SettingsDrawer';
import { ScriptView } from './ScriptView';
```

**Step 2: Add drawer and script view state**

Inside the `RehearsalScreen` function, after the existing `useState` calls, add:

```typescript
const [drawerOpen, setDrawerOpen] = useState(false);
const [scriptViewOpen, setScriptViewOpen] = useState(false);
```

**Step 3: Add ScriptView and SettingsDrawer to JSX**

Inside the returned JSX, just before the closing `</div>`, add:

```tsx
{/* Settings drawer */}
<SettingsDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  speed={rehearsal.tts.speed}
  onSpeedChange={rehearsal.tts.changeSpeed}
  autoAdvance={rehearsal.autoAdvance}
  offBook={rehearsal.offBook}
  cueMode={rehearsal.cueMode}
  justMyCues={rehearsal.justMyCues}
  onToggleAutoAdvance={rehearsal.toggleAutoAdvance}
  onToggleOffBook={rehearsal.toggleOffBook}
  onToggleCueMode={rehearsal.toggleCueMode}
  onToggleJustMyCues={() => rehearsal.toggleJustMyCues(rehearsal.offBook, rehearsal.cueMode)}
  loopStart={rehearsal.loopStart}
  loopEnd={rehearsal.loopEnd}
  loopIteration={rehearsal.loopIteration}
  onSetLoopStart={rehearsal.setLoopStart}
  onSetLoopEnd={rehearsal.setLoopEnd}
  onClearLoop={rehearsal.clearLoop}
  onOpenJumpMenu={() => setJumpMenuOpen(true)}
  runStats={rehearsal.runStats}
  state={rehearsal.state}
  isPWAInstallable={installPrompt}
  onInstall={onInstall}
/>

{/* Script view (blackout mode) */}
{scriptViewOpen && (
  <ScriptView
    lines={config.script.lines}
    myCharacter={config.myCharacter}
    characters={config.script.characters}
    onClose={() => setScriptViewOpen(false)}
  />
)}
```

**Step 4: Update the top bar**

Replace the existing top bar `<div className="flex items-center justify-between">` content with:

```tsx
<div className="flex items-center justify-between">
  {/* Exit */}
  <button
    onClick={() => { rehearsal.pause(); onExit(); }}
    className="p-2 -ml-2 rounded-xl text-text-muted hover:text-text-primary
      hover:bg-bg-tertiary transition-colors"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>

  {/* Centre: mic + run count */}
  <div className="flex items-center gap-3">
    <MicIndicator
      isListening={rehearsal.stt.isListening}
      isSpeaking={rehearsal.stt.isSpeaking}
    />
    {rehearsal.runCount > 0 && (
      <span className="text-xs text-text-muted font-medium tabular-nums">
        Run {rehearsal.runCount}
      </span>
    )}
  </div>

  {/* Right: script view + settings */}
  <div className="flex items-center gap-1">
    <LineTimer
      elapsed={rehearsal.lineElapsed}
      isRunning={rehearsal.state === 'PLAYING_OTHER'}
    />
    <button
      onClick={() => setScriptViewOpen(true)}
      className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      title="Script view"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    </button>
    <button
      onClick={() => setDrawerOpen(true)}
      className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      title="Settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  </div>
</div>
```

**Step 5: Update TransportControls call**

Find the `<TransportControls` usage in the bottom section. Replace it with the minimal new props:

```tsx
<TransportControls
  state={rehearsal.state}
  onPlay={rehearsal.play}
  onPause={rehearsal.pause}
  onSkip={rehearsal.skip}
  onBack={rehearsal.back}
  onAdvance={rehearsal.advance}
/>
```

**Step 6: Verify build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

**Step 7: Manual test**

```bash
npm run dev
```

Check:
- Main rehearsal screen is clean (3 buttons only)
- ⚙ icon opens drawer from right, backdrop closes it
- 📄 icon opens script view fullscreen, × closes it
- Your lines in script view show black bars
- Other characters' lines show normally

**Step 8: Commit**

```bash
git add src/components/RehearsalScreen.tsx
git commit -m "Wire SettingsDrawer and ScriptView into RehearsalScreen, simplify top bar"
```

---

### Task 7: Deploy and verify

**Step 1: Final build check**

```bash
npm run build
```

Expected: clean build, no warnings except the known chunk size warning for pdfjs.

**Step 2: Deploy**

```bash
npm run deploy
```

Expected: "Published" confirmation.

**Step 3: Smoke test on device**

On a phone or desktop browser, open https://nathanaelhub.github.io/lineup/ and verify:
- Load Eternal Sunshine, pick JOEL
- Clementine's lines play fully without cutting off (TTS fix)
- Speaking a line with a mid-sentence pause doesn't advance early (grace period fix)
- Settings drawer opens/closes cleanly
- Script view shows JOEL's lines blacked out, Clementine's lines visible

**Step 4: Commit & push**

```bash
git add -A
git commit -m "Deploy rehearsal UX overhaul"
git push origin main
```
