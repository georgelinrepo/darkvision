/**
 * Voice manager — owns the @react-native-voice/voice lifecycle.
 *
 * Android SpeechRecognizer is fragile: always destroy before re-starting,
 * and give it time between sessions. We use a state machine to avoid overlap.
 */
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

// ── Wake word scanning ────────────────────────────────────────────────────────

type ScanCallback = () => void;
type TranscriptCallback = (text: string) => void;

let _scanning = false;
let _onWakeWord: ScanCallback | null = null;
let _onTranscript: TranscriptCallback | null = null;
let _scanTimer: ReturnType<typeof setTimeout> | null = null;
let _sessionActive = false;

function containsWakeWord(text: string): boolean {
  const t = text.toLowerCase();
  const n = t.replace(/[\s\-_']/g, '');
  // Exact / joined variants
  if (
    n.includes('darkvision') ||
    n.includes('darkvizion') ||
    n.includes('darkbision') ||
    n.includes('darkversion') ||
    n.includes('darkfision') ||
    n.includes('darkvishon')
  ) return true;
  // "dark" followed shortly by "vis" / "viz" / "bis"
  if (/dark.{0,4}vi[sz]/i.test(t)) return true;
  return false;
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

export async function startWakeWordScan(
  onWakeWord: ScanCallback,
  onTranscript?: TranscriptCallback,
): Promise<void> {
  _scanning = true;
  _onWakeWord = onWakeWord;
  _onTranscript = onTranscript ?? null;
  _sessionActive = false;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    _sessionActive = false;
    const transcript = (e.value ?? []).join(' ');
    _onTranscript?.(transcript);
    if (containsWakeWord(transcript)) {
      _scanning = false;
      clearScanTimer();
      Voice.destroy().catch(() => {});
      _onWakeWord?.();
    } else {
      scheduleScanRestart(400);
    }
  };

  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const transcript = (e.value ?? []).join(' ');
    _onTranscript?.(transcript + '…');
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
    scheduleScanRestart(800);
  };

  Voice.onSpeechEnd = () => {
    // Session ended — clear active flag regardless of whether results arrive.
    // This prevents the mic going permanently silent if Android fires onSpeechEnd
    // without a following onSpeechResults or onSpeechError.
    _sessionActive = false;
    scheduleScanRestart(400);
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
      .then(() => new Promise(r => setTimeout(r, 200)))
      .then(() => Voice.start('en-US'))
      .catch(() => done(''));
  });
}
