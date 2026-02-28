import { useState, useCallback } from 'react';
import type { ElevenLabsVoice, ElevenLabsConfig } from '../types';
import { fetchElevenLabsVoices, getStoredApiKey, storeApiKey } from '../lib/elevenLabsEngine';
import { guessGender } from '../utils/genderFromName';

interface ElevenLabsSettingsProps {
  characters: string[];
  config: ElevenLabsConfig | undefined;
  onChange: (config: ElevenLabsConfig | undefined) => void;
}

export function ElevenLabsSettings({ characters, config, onChange }: ElevenLabsSettingsProps) {
  const [isOpen, setIsOpen] = useState(!!config?.apiKey);
  const [apiKey, setApiKey] = useState(config?.apiKey || getStoredApiKey());
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(config?.voices || []);
  const [characterVoiceMap, setCharacterVoiceMap] = useState<Record<string, string>>(
    config?.characterVoiceMap || {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchElevenLabsVoices(apiKey.trim());
      setVoices(fetched);
      storeApiKey(apiKey.trim());

      // Auto-assign voices by matching character name gender to voice gender.
      const autoMap: Record<string, string> = {};
      const maleVoices = fetched.filter(v => v.gender === 'male');
      const femaleVoices = fetched.filter(v => v.gender === 'female');
      const ungenderedVoices = fetched.filter(v => !v.gender);
      let maleIdx = 0, femaleIdx = 0, anyIdx = 0;

      characters.forEach(char => {
        const gender = guessGender(char);
        if (gender === 'female' && femaleVoices.length > 0) {
          autoMap[char] = femaleVoices[femaleIdx % femaleVoices.length].voice_id;
          femaleIdx++;
        } else if (gender === 'male' && maleVoices.length > 0) {
          autoMap[char] = maleVoices[maleIdx % maleVoices.length].voice_id;
          maleIdx++;
        } else {
          // Unknown gender or no matching pool — cycle through all voices
          const fallback = [...maleVoices, ...femaleVoices, ...ungenderedVoices];
          if (fallback.length > 0) {
            autoMap[char] = fallback[anyIdx % fallback.length].voice_id;
            anyIdx++;
          }
        }
      });

      setCharacterVoiceMap(prev => ({ ...autoMap, ...prev }));

      onChange({
        apiKey: apiKey.trim(),
        voices: fetched,
        characterVoiceMap: { ...autoMap, ...characterVoiceMap },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [apiKey, characters, characterVoiceMap, onChange]);

  const handleVoiceChange = useCallback((character: string, voiceId: string) => {
    const newMap = { ...characterVoiceMap, [character]: voiceId };
    setCharacterVoiceMap(newMap);
    if (voices.length > 0) {
      onChange({ apiKey, voices, characterVoiceMap: newMap });
    }
  }, [characterVoiceMap, apiKey, voices, onChange]);

  const handleDisable = useCallback(() => {
    onChange(undefined);
    setIsOpen(false);
    storeApiKey('');
  }, [onChange]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3
          hover:bg-bg-tertiary transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-text-primary">ElevenLabs AI Voices</p>
          <p className="text-xs text-text-muted mt-0.5">Use realistic AI voices for other characters</p>
        </div>
        <span className="text-xs text-accent font-medium">Connect →</span>
      </button>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">ElevenLabs AI Voices</p>
          {voices.length > 0 && (
            <p className="text-xs text-success mt-0.5">✓ Connected · {voices.length} voices</p>
          )}
        </div>
        {voices.length > 0 && (
          <button
            onClick={handleDisable}
            className="text-xs text-text-muted hover:text-danger transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* API Key input */}
      <div className="space-y-2">
        <label className="text-xs text-text-muted">API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 bg-bg-primary border border-bg-tertiary rounded-lg px-3 py-2
              text-sm text-text-primary placeholder:text-text-muted/50
              focus:outline-none focus:border-accent/50 transition-colors"
          />
          <button
            onClick={handleConnect}
            disabled={!apiKey.trim() || loading}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium
              hover:bg-accent-glow transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {loading ? '...' : voices.length > 0 ? 'Refresh' : 'Connect'}
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <p className="text-xs text-text-muted">
          Get your API key at{' '}
          <span className="text-accent">elevenlabs.io</span>
          {' '}· Free tier works
        </p>
      </div>

      {/* Per-character voice assignment */}
      {voices.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-text-muted uppercase tracking-wider">
            Voice per character
          </label>
          {characters.map(character => (
            <div key={character} className="flex items-center gap-3">
              <span className="text-xs font-medium text-text-secondary w-24 truncate shrink-0">
                {character}
              </span>
              <select
                value={characterVoiceMap[character] || ''}
                onChange={e => handleVoiceChange(character, e.target.value)}
                className="flex-1 bg-bg-primary border border-bg-tertiary rounded-lg px-2 py-1.5
                  text-xs text-text-primary focus:outline-none focus:border-accent/50
                  transition-colors"
              >
                <option value="">Browser voice</option>
                {voices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name}{v.gender ? ` · ${v.gender}` : v.category ? ` (${v.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
