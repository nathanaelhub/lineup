# Mic Reliability & UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three Web Speech API timing bugs that cause lines to skip before/during speech, then redesign the setup screen with a white paper aesthetic, screenplay-format preview, and blackout/highlight toggle.

**Architecture:** Mic fixes go in `sttListener.ts` (floor delay + hadSpeech persistence) and `useRehearsal.ts` (200ms settle delay). Theme is a boolean prop passed from `App.tsx` down to `HomeScreen` and `SetupScreen` — no Tailwind config changes needed, just conditional class strings. `SetupScreen` is fully rewritten with a new screenplay preview component, advanced accordion, and blackout/highlight toggle. `ScriptView` gains the same toggle reading from localStorage.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Web Speech API, Vite, gh-pages deploy

---

### Task 1: Fix `sttListener.ts` — three mic reliability bugs

**Files:**
- Modify: `src/lib/sttListener.ts`

**What to change and why:**

The three bugs and their fixes:

**Bug 1 — jumps before user opens mouth:**
When `onend` fires with `hadSpeech = false`, code calls `onSpeechEnd()` immediately. The browser sometimes fires `onend` before `onspeechstart` during recognition startup. Fix: track `listenStartTime`, and when advancing with no speech detected, wait at minimum `2500ms` from when listening started.

**Bug 2 — jumps mid-sentence on recognition restart:**
`this.hadSpeech = false` is set at line 77 (right before starting the grace period timer). If the browser restarts recognition mid-sentence and fires another `onend`, `hadSpeech` is already false, bypassing the grace period. Fix: move `this.hadSpeech = false` to *inside* the timer callback, after `onSpeechEnd` is called.

**Bug 3 — suppressNextEnd clears hadSpeech:**
In `stopListening()`, `this.hadSpeech = false` is cleared (line 121). This is fine. But in the `onend` handler at line 67, `this.hadSpeech = false` inside the `suppressNextEnd` block is also fine. Leave those as-is.

**Step 1: Edit `sttListener.ts`**

Add `private listenStartTime: number = 0;` field after the `speechEndTimer` field (line 16).

In `startListening()`, set `this.listenStartTime = Date.now();` before `this.recognition.start()`.

In the `onend` handler, replace the `!this.hadSpeech` block (lines 70-74) with:
```typescript
if (!this.hadSpeech) {
  // No speech detected — wait until minimum listen floor has passed
  // to prevent lines from being skipped before user opens their mouth.
  const elapsed = Date.now() - this.listenStartTime;
  const remaining = Math.max(0, 2500 - elapsed);
  setTimeout(() => {
    this.callbacks.onSpeechEnd?.();
  }, remaining);
  return;
}
```

In the `hadSpeech` grace period block, move `this.hadSpeech = false` from line 77 (before the timer) to inside the timer callback. The block should become:
```typescript
// Speech was detected — wait 1500ms grace period before advancing,
// in case the user paused mid-sentence. hadSpeech stays true until
// after the callback fires so recognition restarts don't reset it.
if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
this.speechEndTimer = setTimeout(() => {
  this.hadSpeech = false;
  this.speechEndTimer = null;
  this.callbacks.onSpeechEnd?.();
}, 1500);
```

**Step 2: Build check**
```bash
cd /Users/nathanaeljohnson/opt/program/FP/lineup && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...` with no TypeScript errors.

**Step 3: Commit**
```bash
git add src/lib/sttListener.ts
git commit -m "fix: mic reliability — floor delay, hadSpeech persists through restarts"
```

---

### Task 2: Fix `useRehearsal.ts` — 200ms settle delay before mic activates

**Files:**
- Modify: `src/hooks/useRehearsal.ts`

**What to change:**
In the `isMyLine` block (around line 148), `stt.startListening(...)` is called immediately after TTS finishes. Add a 200ms delay so the recognition engine doesn't fire a spurious `onend` from its own startup.

**Step 1: Find the startListening call**

The relevant block looks like:
```typescript
if (autoAdvanceRef.current && stt.isSupported) {
  stt.startListening(() => {
    ...
  });
}
```

Wrap it in a `setTimeout(..., 200)`:
```typescript
if (autoAdvanceRef.current && stt.isSupported) {
  setTimeout(() => {
    if (stateRef.current !== 'WAITING_FOR_USER') return; // guard: paused or skipped during delay
    stt.startListening(() => {
      const heard = stt.transcriptRef.current;
      let score = -1;
      if (heard) {
        const expected = linesRef.current[currentIndexRef.current]?.text || '';
        score = compareTranscript(expected, heard);
        setLastFeedback({ heard, score });
      }
      lineStatsRef.current.push({ score, elapsed: lineElapsedRef.current });
      if (stateRef.current === 'WAITING_FOR_USER' || stateRef.current === 'USER_SPEAKING') {
        processLine(currentIndexRef.current + 1);
      }
    });
  }, 200);
}
```

The guard `if (stateRef.current !== 'WAITING_FOR_USER') return;` prevents the mic from activating if the user manually skipped or paused during the 200ms window.

**Step 2: Build check**
```bash
npm run build 2>&1 | tail -5
```
Expected: clean build.

**Step 3: Commit**
```bash
git add src/hooks/useRehearsal.ts
git commit -m "fix: add 200ms settle delay before mic activates after TTS"
```

---

### Task 3: Theme state — dark mode toggle in `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/HomeScreen.tsx` (add `isDarkMode` + `onToggleDark` props)
- Modify: `src/components/SetupScreen.tsx` (add `isDarkMode` + `onToggleDark` props, used in Task 4)

**What to change:**

Add `isDarkMode` state to `App.tsx`, loaded from `localStorage`:
```typescript
const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
  return localStorage.getItem('lineup-theme') === 'dark';
});

const toggleDarkMode = useCallback(() => {
  setIsDarkMode(prev => {
    const next = !prev;
    localStorage.setItem('lineup-theme', next ? 'dark' : 'light');
    return next;
  });
}, []);
```

Pass `isDarkMode` and `onToggleDark={toggleDarkMode}` to `HomeScreen` and `SetupScreen`.

Update `HomeScreen` and `SetupScreen` prop interfaces to accept:
```typescript
isDarkMode: boolean;
onToggleDark: () => void;
```

**Step 1: Edit `App.tsx`** — add state + callbacks, pass props to HomeScreen and SetupScreen.

**Step 2: Update `HomeScreen.tsx` prop interface** — add `isDarkMode: boolean` and `onToggleDark: () => void`.

**Step 3: Update `SetupScreen.tsx` prop interface** — same additions (implementation in Task 4).

**Step 4: Build check**
```bash
npm run build 2>&1 | tail -5
```
Expected: clean build (HomeScreen and SetupScreen may have unused props warnings, not errors).

**Step 5: Commit**
```bash
git add src/App.tsx src/components/HomeScreen.tsx src/components/SetupScreen.tsx
git commit -m "feat: add dark mode toggle state and localStorage persistence"
```

---

### Task 4: Redesign `HomeScreen.tsx` — white paper theme

**Files:**
- Modify: `src/components/HomeScreen.tsx`

**What to change:**

When `isDarkMode = false` (default), the home screen uses white/light classes. When `isDarkMode = true`, use the existing dark tokens.

Helper at top of component:
```typescript
const bg = isDarkMode ? 'bg-bg-primary' : 'bg-white';
const text = isDarkMode ? 'text-text-primary' : 'text-gray-900';
const muted = isDarkMode ? 'text-text-muted' : 'text-gray-400';
const card = isDarkMode ? 'bg-bg-secondary border-bg-tertiary' : 'bg-gray-50 border-gray-200';
const border = isDarkMode ? 'border-bg-tertiary' : 'border-gray-200';
```

Root div: replace `className="h-full flex flex-col overflow-y-auto"` with:
```tsx
className={`h-full flex flex-col overflow-y-auto ${bg}`}
```

**Header section:** Add sun/moon toggle button to the right of the "LineUp" title row:
```tsx
<div className="flex items-center justify-between w-full mb-10">
  <div className="text-center flex-1">
    <h1 className={`text-4xl font-bold tracking-tight ${text}`}>
      <span className="text-accent">Line</span>
      <span>Up</span>
    </h1>
    <p className={`mt-2 text-sm ${muted}`}>Your personal rehearsal partner</p>
  </div>
  <button
    onClick={onToggleDark}
    aria-label="Toggle dark mode"
    className={`p-2 rounded-xl transition-colors ${muted} hover:${text}`}
  >
    {isDarkMode ? (
      /* sun icon */
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ) : (
      /* moon icon */
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    )}
  </button>
</div>
```

Apply `bg`, `text`, `card`, `border` variables to all child elements (upload area, saved scripts list) replacing hardcoded dark tokens.

**Step 1: Rewrite HomeScreen.tsx** with the above approach.

**Step 2: Build check**
```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**
```bash
git add src/components/HomeScreen.tsx
git commit -m "feat: HomeScreen white paper theme with dark mode toggle"
```

---

### Task 5: Redesign `SetupScreen.tsx` — screenplay preview + advanced accordion

**Files:**
- Modify: `src/components/SetupScreen.tsx`

This is the largest task. The new layout (top to bottom):
1. Header: back button (left), script title (center), dark mode toggle (right)
2. Character picker: horizontal pills
3. Script preview: screenplay-format, scrollable, blackout/highlight toggle at top-right
4. Start button (+ Resume button if applicable)
5. Advanced accordion (collapsed by default)

**Step 1: Add preview mode state**

```typescript
const [previewMode, setPreviewMode] = useState<'blackout' | 'highlight'>(() => {
  return (localStorage.getItem('lineup-preview-mode') as 'blackout' | 'highlight') || 'blackout';
});
const [advancedOpen, setAdvancedOpen] = useState(false);

const togglePreviewMode = () => {
  const next = previewMode === 'blackout' ? 'highlight' : 'blackout';
  localStorage.setItem('lineup-preview-mode', next);
  setPreviewMode(next);
};
```

**Step 2: Theme helper variables** (same pattern as HomeScreen):
```typescript
const bg = isDarkMode ? 'bg-bg-primary' : 'bg-white';
const text = isDarkMode ? 'text-text-primary' : 'text-gray-900';
const muted = isDarkMode ? 'text-text-muted' : 'text-gray-500';
const subtle = isDarkMode ? 'text-text-secondary' : 'text-gray-600';
const card = isDarkMode ? 'bg-bg-secondary' : 'bg-gray-50';
const cardBorder = isDarkMode ? 'border-bg-tertiary' : 'border-gray-200';
const pill = isDarkMode ? 'bg-bg-secondary border-bg-tertiary' : 'bg-gray-100 border-gray-200';
const pillActive = isDarkMode ? 'bg-accent text-white border-accent' : 'bg-gray-900 text-white border-gray-900';
```

**Step 3: New layout skeleton**

```tsx
<div className={`h-full flex flex-col overflow-y-auto ${bg}`}>
  <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-6">

    {/* Header */}
    <div className="flex items-center justify-between">
      <button onClick={onBack} className={`p-2 -ml-2 rounded-xl transition-colors ${muted} hover:${text}`}>
        {/* chevron-left svg */}
      </button>
      <h2 className={`text-sm font-semibold truncate px-2 ${text}`}>{script.title}</h2>
      <button onClick={onToggleDark} aria-label="Toggle dark mode" className={`p-2 rounded-xl transition-colors ${muted}`}>
        {/* sun/moon svg */}
      </button>
    </div>

    {/* Character picker */}
    <div className="space-y-2">
      <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>Who are you?</p>
      <div className="flex flex-wrap gap-2">
        {script.characters.map(char => (
          <button
            key={char}
            onClick={() => setMyCharacter(char)}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
              ${myCharacter === char ? pillActive : pill}`}
          >
            {char}
          </button>
        ))}
      </div>
    </div>

    {/* Script preview */}
    {myCharacter && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>Script</p>
          <button
            onClick={togglePreviewMode}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${cardBorder} ${muted} hover:${text}`}
          >
            {previewMode === 'blackout' ? '⬛ Blackout' : '🟡 Highlight'}
          </button>
        </div>
        <div className={`rounded-2xl border ${cardBorder} ${card} overflow-y-auto max-h-[45vh] px-5 py-4 space-y-3 font-mono text-sm`}>
          {script.lines.map(line => (
            <ScreenplayLine
              key={line.lineIndex}
              line={line}
              myCharacter={myCharacter}
              previewMode={previewMode}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    )}

    {/* Resume button */}
    {resumeAvailable && (
      <button
        onClick={() => onStart({ script, myCharacter: myCharacter!, autoAdvance, offBook, showDirections, cueMode, speed, startIndex: savedPosition!.lineIndex, elevenLabs, characterPitchMap })}
        className={`w-full py-3 rounded-2xl border text-sm font-medium transition-all text-accent border-accent/40 hover:bg-accent/10 active:scale-[0.98] text-center`}
      >
        Resume from line {savedPosition!.lineIndex + 1} →
      </button>
    )}

    {/* Start button */}
    <button
      onClick={() => { if (myCharacter) onStart({ script, myCharacter, autoAdvance, offBook, showDirections, cueMode, speed, elevenLabs, characterPitchMap }); }}
      disabled={!myCharacter}
      className={`w-full py-4 rounded-2xl text-lg font-semibold transition-all active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isDarkMode ? 'bg-accent text-white hover:bg-accent-glow shadow-lg shadow-accent/20' : 'bg-gray-900 text-white hover:bg-gray-700 shadow-lg shadow-gray-900/20'}`}
    >
      {myCharacter ? `Start as ${myCharacter}` : 'Select a character'}
    </button>

    {/* Advanced accordion */}
    <div>
      <button
        onClick={() => setAdvancedOpen(v => !v)}
        className={`w-full flex items-center justify-center gap-1 py-2 text-xs ${muted} hover:${subtle} transition-colors`}
      >
        Advanced settings {advancedOpen ? '▲' : '▾'}
      </button>
      {advancedOpen && (
        <div className="space-y-3 pt-3">
          {/* All the existing toggles + speed + voice pitch + ElevenLabs */}
          {/* Copy the existing Settings section from the old SetupScreen here */}
        </div>
      )}
    </div>

  </div>
</div>
```

**Step 4: Implement `ScreenplayLine` component** (replaces `ParsedLineRow`):

```tsx
function ScreenplayLine({
  line, myCharacter, previewMode, isDarkMode,
}: {
  line: ScriptLine;
  myCharacter: string;
  previewMode: 'blackout' | 'highlight';
  isDarkMode: boolean;
}) {
  const text = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const muted = isDarkMode ? 'text-text-muted' : 'text-gray-400';

  if (line.type === 'scene_heading') {
    return (
      <p className={`text-[10px] font-bold uppercase tracking-widest ${muted} pt-3 pb-1`}>
        {line.text}
      </p>
    );
  }

  if (line.type === 'direction') {
    return (
      <p className={`italic text-xs ${muted} pl-8`}>
        ({line.text})
      </p>
    );
  }

  // Dialogue
  const isMe = line.character === myCharacter;
  const barWidth = Math.min(100, Math.max(30, Math.round(line.text.length / 80 * 100)));

  return (
    <div className="space-y-0.5">
      <p className={`text-[11px] font-bold tracking-wider uppercase pl-16 ${isMe ? 'text-accent' : muted}`}>
        {line.character}
      </p>
      <div className="pl-8">
        {isMe ? (
          previewMode === 'blackout' ? (
            <div
              className="h-[1.1em] rounded-sm bg-gray-900 mt-1"
              style={{ width: `${barWidth}%` }}
              aria-label="[your line]"
            />
          ) : (
            <p className={`text-sm leading-relaxed ${text} bg-yellow-200 text-gray-900 rounded px-1`}>
              {line.text}
            </p>
          )
        ) : (
          <p className={`text-sm leading-relaxed ${text}`}>{line.text}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 5: Move the existing advanced settings block** (toggles, speed, pitch, ElevenLabs) inside the accordion. They can keep their existing JSX mostly intact — just remove the outer `<div className="space-y-3">` wrapper since the accordion provides that.

**Step 6: Remove the old `ParsedLineRow` and `ToggleOption` internal components** if they are only used in SetupScreen. Keep `ToggleOption` since it's used in the accordion. Remove the showCorrection / showAllLines / fix-misparses functionality — it was rarely used and adds complexity. The line correction feature can be re-added later if needed.

**Step 7: Build check**
```bash
npm run build 2>&1 | tail -5
```
Expected: clean build.

**Step 8: Commit**
```bash
git add src/components/SetupScreen.tsx
git commit -m "feat: redesign SetupScreen — screenplay preview, blackout/highlight, advanced accordion, white theme"
```

---

### Task 6: Update `ScriptView.tsx` — add blackout/highlight toggle

**Files:**
- Modify: `src/components/ScriptView.tsx`

**What to change:**

Add a toggle in the header that reads/writes `localStorage` key `lineup-preview-mode`, matching the setup screen choice.

**Step 1: Add state**

```typescript
const [previewMode, setPreviewMode] = useState<'blackout' | 'highlight'>(() => {
  return (localStorage.getItem('lineup-preview-mode') as 'blackout' | 'highlight') || 'blackout';
});

const togglePreviewMode = () => {
  const next = previewMode === 'blackout' ? 'highlight' : 'blackout';
  localStorage.setItem('lineup-preview-mode', next);
  setPreviewMode(next);
};
```

**Step 2: Update header** — add toggle button next to the close button:

```tsx
<button
  onClick={togglePreviewMode}
  className="text-xs px-2.5 py-1 rounded-lg border border-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
>
  {previewMode === 'blackout' ? '⬛ Blackout' : '🟡 Highlight'}
</button>
```

**Step 3: Update header subtitle** — change from "Blacking out: HARVEY" to match mode:

```tsx
<p className="text-xs text-text-muted mt-0.5">
  {previewMode === 'blackout' ? 'Blacking out' : 'Highlighting'}:{' '}
  <span className="font-medium text-text-secondary">{myCharacter}</span>
</p>
```

**Step 4: Update `ScriptLineRow`** — add `previewMode` prop and render highlight when selected:

Pass `previewMode` to `ScriptLineRow`. Replace the black bar div with:
```tsx
{isMe ? (
  previewMode === 'blackout' ? (
    <div
      className="h-5 rounded-sm bg-text-primary/90"
      style={{ width: `${barWidth}%` }}
      aria-label="[your line]"
    />
  ) : (
    <p className="text-text-secondary leading-relaxed bg-yellow-200/20 text-text-primary rounded px-1">
      {line.text}
    </p>
  )
) : (
  <p className="text-text-secondary leading-relaxed">{line.text}</p>
)}
```

Note: in ScriptView (dark background), use `bg-yellow-200/20` for highlight (subtle glow) rather than the full `bg-yellow-200` used in the white setup screen.

**Step 5: Build check**
```bash
npm run build 2>&1 | tail -5
```
Expected: clean build.

**Step 6: Commit**
```bash
git add src/components/ScriptView.tsx
git commit -m "feat: ScriptView blackout/highlight toggle synced with localStorage"
```

---

### Task 7: Deploy

**Step 1: Final build**
```bash
npm run build 2>&1 | tail -8
```
Expected: clean build, no TS errors.

**Step 2: Deploy to GitHub Pages**
```bash
npm run deploy 2>&1 | tail -5
```
Expected: `Published`

**Step 3: Push main branch**
```bash
git push origin main
```

**Step 4: Verify GitHub Actions**
```bash
gh run list --repo nathanaelhub/lineup --limit 3
```
Expected: latest runs show `success`.
