import type { ElevenLabsVoice } from '../types';

const BASE_URL = 'https://api.elevenlabs.io/v1';

export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${BASE_URL}/voices`, {
    headers: { 'xi-api-key': apiKey },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid API key');
    throw new Error(`ElevenLabs error: ${res.status}`);
  }
  const data = await res.json();
  return (data.voices as any[]).map(v => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
  }));
}

export async function speakWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  speed: number = 1.0,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: Math.max(0.7, Math.min(1.3, speed)),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS error: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback error'));
    };
    audio.play().catch(reject);
  });
}

// Store/retrieve API key from localStorage
const EL_KEY = 'lineup_elevenlabs_key';
export function getStoredApiKey(): string {
  return localStorage.getItem(EL_KEY) || '';
}
export function storeApiKey(key: string): void {
  if (key) localStorage.setItem(EL_KEY, key);
  else localStorage.removeItem(EL_KEY);
}
