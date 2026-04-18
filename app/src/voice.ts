/**
 * Voice manager — owns the @react-native-voice/voice lifecycle.
 *
 * Two modes:
 *   scan()     — continuously restarts recognition looking for "DarkVision"
 *   listenOnce() — single shot, returns transcript when silence detected
 *
 * Only one mode runs at a time. Call stop() before switching.
 */
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

type ScanCallback = () => void;

let _scanning = false;
let _onWakeWord: ScanCallback | null = null;

function containsWakeWord(text: string): boolean {
  const n = text.toLowerCase().replace(/[\s\-]/g, '');
  return n.includes('darkvision');
}

async function _restartScan() {
  if (!_scanning) return;
  try {
    await Voice.start('en-US');
  } catch {
    setTimeout(_restartScan, 800);
  }
}

/** Start continuously scanning for the wake word. */
export async function startWakeWordScan(onWakeWord: ScanCallback): Promise<void> {
  _scanning = true;
  _onWakeWord = onWakeWord;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const transcript = e.value?.[0] ?? '';
    if (containsWakeWord(transcript)) {
      _scanning = false;
      Voice.stop().catch(() => {});
      _onWakeWord?.();
    } else {
      setTimeout(_restartScan, 200);
    }
  };

  Voice.onSpeechError = (_e: SpeechErrorEvent) => {
    if (_scanning) setTimeout(_restartScan, 800);
  };

  Voice.onSpeechEnd = () => {
    // Results handler will restart; this is a fallback
    if (_scanning) setTimeout(_restartScan, 200);
  };

  await _restartScan();
}

/** Stop wake word scanning. */
export async function stopWakeWordScan(): Promise<void> {
  _scanning = false;
  _onWakeWord = null;
  try {
    await Voice.stop();
    await Voice.destroy();
  } catch {}
  Voice.onSpeechResults = undefined as any;
  Voice.onSpeechError = undefined as any;
  Voice.onSpeechEnd = undefined as any;
}

/**
 * Single-shot STT: starts recognition and resolves with the transcript
 * when speech ends or the timeout elapses.
 * Returns empty string on timeout or error.
 */
export function listenOnce(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    function done(transcript: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      Voice.stop().catch(() => {});
      Voice.destroy().catch(() => {});
      Voice.onSpeechResults = undefined as any;
      Voice.onSpeechError = undefined as any;
      resolve(transcript);
    }

    Voice.onSpeechResults = (e: SpeechResultsEvent) => done(e.value?.[0] ?? '');
    Voice.onSpeechError = () => done('');

    timer = setTimeout(() => done(''), timeoutMs);

    Voice.start('en-US').catch(() => done(''));
  });
}
