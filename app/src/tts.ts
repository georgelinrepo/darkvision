/**
 * TTS via AWS Polly (neural Matthew voice) through the Lambda proxy.
 * Falls back to native expo-speech if API_URL is not configured.
 */
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { API_URL } from './config';

let _currentSound: Audio.Sound | null = null;
let _currentAbort: AbortController | null = null;

async function _stopCurrent() {
  // Cancel any in-flight Polly fetch so it can't start playing later
  if (_currentAbort) {
    _currentAbort.abort();
    _currentAbort = null;
  }
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
    const abort = new AbortController();
    _currentAbort = abort;
    try {
      const res = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });

      if (abort.signal.aborted) return;
      if (!res.ok) throw new Error(`Polly proxy ${res.status}`);

      const { audio } = await res.json();
      if (abort.signal.aborted) return;

      _currentAbort = null;
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
      if (abort.signal.aborted) return; // cancelled — don't fall through
      // Fall through to native TTS on genuine error
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
