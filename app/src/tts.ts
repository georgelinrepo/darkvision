/**
 * TTS via AWS Polly (neural Matthew voice) through the Lambda proxy.
 * Falls back to native expo-speech if API_URL is not configured.
 */
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { API_URL } from './config';

let _currentSound: Audio.Sound | null = null;

async function _stopCurrent() {
  if (_currentSound) {
    try {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
    } catch {}
    _currentSound = null;
  }
}

export async function speak(
  text: string,
  options?: { onDone?: () => void; onError?: () => void },
): Promise<void> {
  if (!text) return;
  await _stopCurrent();

  // ── Polly path ────────────────────────────────────────────────────────────
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`Polly proxy ${res.status}`);

      const { audio } = await res.json();

      // Write base64 MP3 to cache and play
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const uri = `data:audio/mpeg;base64,${audio}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      _currentSound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (_currentSound === sound) _currentSound = null;
          options?.onDone?.();
        }
      });

      await sound.playAsync();
      return;
    } catch {
      // Fall through to native TTS
    }
  }

  // ── Native fallback ───────────────────────────────────────────────────────
  Speech.speak(text, {
    rate: 0.82,
    pitch: 1.0,
    onDone: options?.onDone,
    onError: options?.onError,
  });
}

export async function stop(): Promise<void> {
  await _stopCurrent();
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  if (_currentSound) {
    try {
      const status = await _currentSound.getStatusAsync();
      return status.isLoaded && (status as any).isPlaying;
    } catch {}
  }
  return Speech.isSpeakingAsync();
}
