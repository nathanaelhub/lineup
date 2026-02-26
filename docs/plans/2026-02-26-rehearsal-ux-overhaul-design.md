# Rehearsal UX Overhaul — Design Doc
_2026-02-26_

## Problem Statement

Three issues make the rehearsal experience unreliable:
1. TTS (browser speech synthesis) cuts off other characters' lines early and immediately advances
2. Mic auto-advance fires before the user finishes speaking (moves on mid-sentence)
3. The rehearsal screen is cluttered with too many controls, making the core experience hard to use

Two new features are also needed:
4. Advanced settings accessible without cluttering the main screen
5. A "blackout" script view — screenplay text with the user's lines redacted

---

## Approach: Option B — Bug fixes + Settings Drawer + PDF Script View

### 1. Bug Fix — TTS Cuts Off Early

**Root cause**: `ttsEngine.speak()` calls `synth.cancel()` then immediately `synth.speak()`. Chrome has a race condition where the new utterance receives an `interrupted` onerror immediately, which the current code resolves as a success — advancing the line without speaking.

**Fix**: Wrap `synth.speak(utterance)` in a `setTimeout(50ms)` after the cancel call to give Chrome time to process the cancellation before accepting the new utterance.

**File**: `src/lib/ttsEngine.ts`

---

### 2. Bug Fix — Mic Advances Too Early

**Root cause**: The Web Speech API fires `onend` after any pause in speech, even mid-sentence. The app then immediately advances to the next line.

**Fix**: After `onend` fires in `sttListener`, wait **1500ms** before calling `onSpeechEnd`. Track whether `onspeechstart` fired (i.e. actual speech was detected). If no speech was detected, advance immediately (no point waiting). If the browser restarts recognition during the grace period and detects new speech, reset the timer.

**Files**: `src/lib/sttListener.ts`

---

### 3. Clean Rehearsal Screen

**Current**: Bottom transport area has play/pause, skip, back, speed, auto-advance, off-book, cue, just-my-cues, loop A/B, jump menu, install — all visible at once.

**New main screen contains**:
- Top bar: Exit (×), mic indicator + run count (centre), two icon buttons top-right (⚙ settings, 📄 script view)
- Progress bar
- Line display (centre, full height)
- Bottom row: Back | Play/Pause/Advance | Skip — three buttons only

**Files**: `src/components/RehearsalScreen.tsx`, `src/components/TransportControls.tsx`

---

### 4. Settings Drawer

A right-side panel that slides in over the rehearsal screen. Triggered by the ⚙ icon. Closes on tap-outside or × button.

**Contents**:
- Auto-advance toggle
- Off-book mode toggle
- Cue mode toggle
- Just my cues toggle
- Speed selector (0.75× / 1.0× / 1.25× / 1.5×)
- Loop A/B (Set A, Set B, Clear)
- Jump to line (opens existing ScriptJumpMenu)
- Run stats (accuracy %, avg time, stumbles)

**New file**: `src/components/SettingsDrawer.tsx`

---

### 5. PDF Script View (Blackout Mode)

A fullscreen overlay opened by the 📄 icon in the top bar during rehearsal. Uses the already-parsed `ScriptLine[]` data — no PDF re-rendering required.

**Layout**: Screenplay-formatted text scroll view
- Scene headings: small caps, dimmed
- Stage directions: italic, indented
- Other characters' dialogue: character name bold above, text normal
- User's dialogue lines: character name shown, dialogue text replaced with a **solid black bar** sized proportionally to text length (gives authentic redaction look)

**Header**: small badge showing "Blacking out: [CHARACTER NAME]", close button (×) returns to rehearsal

**New file**: `src/components/ScriptView.tsx`

---

## Data Flow

No new state is needed at the top level. `SessionConfig` already contains `script`, `myCharacter`, and all settings. The `SettingsDrawer` receives the same callbacks already passed to `TransportControls`. `ScriptView` receives `script.lines` and `myCharacter`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/ttsEngine.ts` | Add 50ms delay between cancel and speak |
| `src/lib/sttListener.ts` | Add 1500ms grace period before firing onSpeechEnd |
| `src/components/RehearsalScreen.tsx` | Add drawer/script-view state, simplified layout |
| `src/components/TransportControls.tsx` | Reduce to 3-button row |
| `src/components/SettingsDrawer.tsx` | New — all advanced controls |
| `src/components/ScriptView.tsx` | New — blackout script view |

---

## Out of Scope

- PDF re-rendering / actual PDF page images
- Exporting a redacted PDF
- Changing the setup screen or parser
