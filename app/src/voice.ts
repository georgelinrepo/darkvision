/**
 * Voice manager — owns the @react-native-voice/voice lifecycle.
 *
 * Android SpeechRecognizer is fragile: always destroy before re-starting,
 * and give it time between sessions. We use a state machine to avoid overlap.
 */
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

// ── Wake word scanning ────────────────────────────────────────────────────────

type ScanCallback = () => void;

let _scanning = false;
let _onWakeWord: ScanCallback | null = null;
let _scanTimer: ReturnType<typeof setTimeout> | null = null;
let _sessionActive = false;

function containsWakeWord(text: string): boolean {
  const n = text.toLowerCase().replace(/[\s\-_]/g, '');
  // Accept "darkvision", "dark vision", "darkest vision", common mishearings
  return n.includes('darkvision') || n.includes('darkvizion') || n.includes('darkbision');
}

function clearScanTimer() {
  if (_scanTimer) {
    clearTimeout(_scanTimer);
    _scanTimer = null;
  }
}

async function _doStartScan() {
  if (!_scanning || _sessionActive) return;
  _sessionActive = true;
  try {
    await Voice.destroy();
    await Voice.start('en-US');
  } catch {
    _sessionActive = false;
    if (_scanning) {
      _scanTimer = setTimeout(_doStartScan, 1000);
    }
  }
}

function scheduleScanRestart(delayMs = 600) {
  clearScanTimer();
  if (_scanning) {
    _scanTimer = setTimeout(_doStartScan, delayMs);
  }
}

export async function startWakeWordScan(onWakeWord: ScanCallback): Promise<void> {
  _scanning = true;
  _onWakeWord = onWakeWord;
  _sessionActive = false;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    _sessionActive = false;
    const transcript = (e.value ?? []).join(' ');
    if (containsWakeWord(transcript)) {
      _scanning = false;
      clearScanTimer();
      Voice.destroy().catch(() => {});
      _onWakeWord?.();
    } else {
      scheduleScanRestart(500);
    }
  };

  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    // Check partial results too for faster wake word detection
    const transcript = (e.value ?? []).join(' ');
    if (containsWakeWord(transcript) && _scanning) {
      _scanning = false;
      _sessionActive = false;
      clearScanTimer();
      Voice.stop().catch(() => {});
      Voice.destroy().catch(() => {});
      _onWakeWord?.();
    }
  };

  Voice.onSpeechError = (_e: SpeechErrorEvent) => {
    _sessionActive = false;
    scheduleScanRestart(1000);
  };

  Voice.onSpeechEnd = () => {
    // Don't restart here — wait for onSpeechResults which follows shortly.
    // Add a fallback in case results never arrive.
    _scanTimer = setTimeout(() => {
      if (_scanning && !_sessionActive) {
        _doStartScan();
      }
    }, 800);
  };

  await _doStartScan();
}

export async function stopWakeWordScan(): Promise<void> {
  _scanning = false;
  _sessionActive = false;
  _onWakeWord = null;
  clearScanTimer();
  Voice.onSpeechResults     = undefined as any;
  Voice.onSpeechPartialResults = undefined as any;
  Voice.onSpeechError       = undefined as any;
  Voice.onSpeechEnd         = undefined as any;
  try {
    await Voice.stop();
    await Voice.destroy();
  } catch {}
}

// ── Single-shot command STT ───────────────────────────────────────────────────

export function listenOnce(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    function done(transcript: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      Voice.onSpeechResults        = undefined as any;
      Voice.onSpeechPartialResults = undefined as any;
      Voice.onSpeechError          = undefined as any;
      Voice.stop().catch(() => {});
      Voice.destroy().catch(() => {}).then(() => resolve(transcript));
    }

    Voice.onSpeechResults = (e: SpeechResultsEvent) =>
      done((e.value ?? [])[0] ?? '');

    Voice.onSpeechError = () => done('');

    timer = setTimeout(() => done(''), timeoutMs);

    Voice.destroy()
      .catch(() => {})
      .then(() => Voice.start('en-US'))
      .catch(() => done(''));
  });
}
