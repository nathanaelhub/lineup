# Mic Reliability & UX Redesign
**Date:** 2026-02-27

## Problems

### Mic auto-advance bugs (three failure modes)
1. **Jumps before user speaks** — when `hadSpeech = false` at `onend`, the code advances immediately with no floor delay. Browser sometimes doesn't fire `onspeechstart` before `onend` (especially on recognition restart), so lines get skipped before the user opens their mouth.
2. **Jumps mid-sentence** — `hadSpeech` is reset to `false` the moment `onend` fires. If the browser restarts recognition mid-sentence (normal Web Speech API behavior) and fires another `onend`, the flag is already cleared and the 1500ms grace period is bypassed, advancing mid-speech.
3. **Inconsistency builds over multiple lines** — the two bugs above compound over a run: the STT singleton accumulates bad state across recognition restarts, making behavior unpredictable after the first few lines.

### UX / design
- Setup screen is cluttered — too many settings visible at once, intimidating for new users
- Script preview is buried, not visually compelling
- App has no paper/script aesthetic — white background with blacked-out or highlighted lines is more authentic
- Dark mode not available (setup screens)
- Blackout script view only accessible during rehearsal, not before starting

---

## Design

### Mic fixes — `src/lib/sttListener.ts` + `src/hooks/useRehearsal.ts`

**Fix 1 — Listen start delay (200ms)**
In `useRehearsal.ts`, after TTS finishes a line and before calling `stt.startListening()`, wait 200ms. Prevents the recognition startup itself from triggering a spurious `onend` that bypasses all guards.

**Fix 2 — Minimum listen floor (2500ms)**
Track `listenStartTime = Date.now()` when `startListening()` is called. In the `onend` handler, when `hadSpeech = false`, compute `elapsed = Date.now() - listenStartTime`. Schedule `onSpeechEnd` after `Math.max(0, 2500 - elapsed)` ms instead of calling it immediately. User always gets at least 2.5 seconds to start speaking.

**Fix 3 — `hadSpeech` persists through restarts**
Move `this.hadSpeech = false` from before the grace period timer to inside the timer callback, after `onSpeechEnd` is called. This means if the browser restarts recognition mid-grace-period, `hadSpeech` remains `true`, the timer continues, and the line doesn't advance prematurely.

```
// Current (buggy):
this.hadSpeech = false;
this.speechEndTimer = setTimeout(() => { onSpeechEnd(); }, 1500);

// Fixed:
this.speechEndTimer = setTimeout(() => {
  this.hadSpeech = false;
  this.speechEndTimer = null;
  this.callbacks.onSpeechEnd?.();
}, 1500);
```

Also add `private listenStartTime: number = 0` field and set it in `startListening()`.

---

### Setup screen redesign — `src/components/SetupScreen.tsx`

**Layout (white paper theme):**
1. Header bar — script title left, dark mode toggle (☀/🌙) right
2. Character picker — horizontal pill buttons, selected = black fill
3. Script preview panel — scrollable, takes up bulk of screen
4. Start button — full-width, black/white, disabled until character selected
5. Advanced settings accordion — collapsed by default, expands inline

**White paper theme:**
- Background: `#FFFFFF` / `bg-white`
- Text: `text-gray-900`
- Borders/shadows: soft gray
- Applied to: HomeScreen, SetupScreen (not RehearsalScreen — always dark)
- Dark mode: `data-theme="dark"` on root app div, Tailwind `dark:` variants
- Persisted: `localStorage` key `lineup-theme`

**Dark mode toggle:**
- Sun/moon icon button in header
- Visible on all setup/home screens
- RehearsalScreen unaffected (always dark)

---

### Script preview redesign — `src/components/SetupScreen.tsx` + `src/components/ScriptView.tsx`

**Screenplay format:**
- Font: `font-mono` (Courier New fallback)
- Scene headings: small caps, wide tracking, gray
- Character names: centered, all caps, bold
- Stage directions: indented, italic, gray
- Dialogue: indented, normal weight, black

**Blackout / Highlight toggle:**
- Toggle button at top-right of preview panel: "⬛ Blackout | 🟡 Highlight"
- **Blackout mode**: user's dialogue text replaced with solid black bar, proportional width
- **Highlight mode**: user's dialogue text fully visible with `bg-yellow-200` background
- Character name always visible in both modes
- Choice persisted to `localStorage` as `lineup-script-preview-mode`
- Same toggle + styling applied consistently in ScriptView overlay during rehearsal

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/sttListener.ts` | Add `listenStartTime` field; fix `hadSpeech` reset timing; add minimum floor delay |
| `src/hooks/useRehearsal.ts` | Add 200ms delay before `stt.startListening()` after TTS ends |
| `src/components/SetupScreen.tsx` | Full layout redesign: white theme, screenplay preview, blackout/highlight toggle, advanced accordion, dark mode toggle |
| `src/components/ScriptView.tsx` | Update to match blackout/highlight toggle, sync with localStorage preference |
| `src/components/HomeScreen.tsx` | Apply white paper theme |
| `src/App.tsx` | Load and apply `lineup-theme` from localStorage on mount; pass theme state down |

---

## Non-Goals
- Redesigning the rehearsal screen UI (stays dark, transport controls stay as 3 buttons)
- ElevenLabs integration changes
- Any new rehearsal features beyond fixing auto-advance reliability
