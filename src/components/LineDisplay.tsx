import { useEffect } from 'react';
import type { ScriptLine } from '../types';
import { getCharacterColor } from '../utils/voiceMapper';
import { vibrate } from '../utils/haptics';

function getCueText(text: string, wordCount = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) return text;
  return '… ' + words.slice(-wordCount).join(' ');
}

interface LineDisplayProps {
  line: ScriptLine | null;
  characters: string[];
  myCharacter: string;
  offBook: boolean;
  cueMode: boolean;
  isActive: boolean;
}

export function LineDisplay({ line, characters, myCharacter, offBook, cueMode, isActive }: LineDisplayProps) {
  const isMyLine = line?.type === 'dialogue' && line?.character === myCharacter;

  useEffect(() => {
    if (isMyLine && isActive) vibrate(50);
  }, [line?.lineIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!line) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
        }}
      >
        <span className="label">Standby</span>
        <p
          className="display display-i"
          style={{ fontSize: 28, color: 'var(--ink-soft)' }}
        >
          ready to begin
        </p>
        <p
          className="font-serif"
          style={{ fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }}
        >
          Tap <em>Begin</em> when you're ready.
        </p>
      </div>
    );
  }

  const color = line.character ? getCharacterColor(line.character, characters) : 'var(--ink-soft)';

  if (line.type === 'scene_heading') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        <span className="label" style={{ color: 'var(--scarlet)' }}>Scene</span>
        <h2 className="display display-i" style={{ fontSize: 28, marginTop: 8, lineHeight: 1.1 }}>
          {line.text}
        </h2>
      </div>
    );
  }

  if (line.type === 'direction') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        <span className="label">Stage direction</span>
        <p
          className="display display-i"
          style={{
            fontSize: 22,
            color: 'var(--ink-soft)',
            marginTop: 10,
            lineHeight: 1.25,
          }}
        >
          ({line.text})
        </p>
      </div>
    );
  }

  // dialogue
  const cueText = !isMyLine && cueMode ? getCueText(line.text) : null;
  const showOffBookBox = isMyLine && offBook;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        gap: 14,
        padding: '12px 0',
        alignItems: 'stretch',
        opacity: isActive ? 1 : 0.7,
        transition: 'opacity 200ms',
      }}
    >
      {/* Speaker rail */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          paddingTop: 4,
        }}
      >
        <div className="you-bar" style={{ background: color, minHeight: 80 }} />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Character header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.22em',
              color,
              textTransform: 'uppercase',
            }}
          >
            {line.character}
            {isMyLine && (
              <span style={{ marginLeft: 8, color: 'var(--scarlet)' }}>● you</span>
            )}
            {!isMyLine && cueMode && (
              <span style={{ marginLeft: 8, color: 'var(--ink-mute)' }}>cue</span>
            )}
          </div>
          {showOffBookBox && (
            <span
              className="stamp"
              style={{ color: 'var(--scarlet)', transform: 'rotate(2deg)', fontSize: 8 }}
            >
              off-book
            </span>
          )}
        </div>

        {/* Body */}
        {showOffBookBox ? (
          <div
            style={{
              border: '1.5px dashed var(--scarlet)',
              borderRadius: 6,
              padding: '20px 16px',
              textAlign: 'center',
              background: 'oklch(98% 0.04 25 / 0.4)',
            }}
          >
            <div className="label" style={{ color: 'var(--scarlet-deep)' }}>From memory</div>
            <p
              className="font-serif"
              style={{
                fontStyle: 'italic',
                color: 'var(--ink-mute)',
                fontSize: 16,
                marginTop: 6,
              }}
            >
              your line — speak it
            </p>
          </div>
        ) : cueText ? (
          <p
            className="display"
            style={{
              fontSize: 30,
              lineHeight: 1.15,
              color: 'var(--ink-soft)',
              fontStyle: 'italic',
            }}
          >
            {cueText}
          </p>
        ) : (
          <p
            className="display"
            style={{
              fontSize:
                line.text.length > 110 ? 22 : line.text.length > 60 ? 26 : 30,
              lineHeight: 1.18,
              color: 'var(--ink)',
              fontWeight: isMyLine ? 500 : 400,
            }}
          >
            {line.text}
          </p>
        )}
      </div>
    </div>
  );
}
