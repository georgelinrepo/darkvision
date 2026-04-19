/**
 * useVoiceLoop — state machine for the voice interaction loop.
 *
 * States: idle → scanning → listening → processing → confirming → (idle | onMove)
 *
 * Usage:
 *   const { voiceState, pendingMove, startScanning, stopScanning } = useVoiceLoop({ onMove });
 *   onMove(san) is called when a move is confirmed by the user.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { startWakeWordScan, stopWakeWordScan, listenOnce } from '../voice';
import { parseMoveDirectly, parseQuery, isYes, isNo, QueryCommand } from '../moveParser';
import { normaliseMoveWithLLM } from '../llmNormaliser';
import { speak, stop as ttsStop } from '../tts';

export type VoiceState = 'idle' | 'scanning' | 'listening' | 'processing' | 'confirming';

interface UseVoiceLoopOptions {
  /** Called with confirmed SAN move when the user says yes. */
  onMove: (san: string) => void;
  /** Called when a position query command is spoken. */
  onQuery?: (cmd: QueryCommand) => void;
}

export function useVoiceLoop({ onMove, onQuery }: UseVoiceLoopOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string>('');

  // Use refs so async closures always see latest values
  const voiceStateRef = useRef<VoiceState>('idle');
  const activeRef = useRef(false);

  function _setState(s: VoiceState) {
    voiceStateRef.current = s;
    setVoiceState(s);
  }

  // ── Wake word detected → open command STT session ──────────────────────
  const onWakeWord = useCallback(async () => {
    if (!activeRef.current) return;
    ttsStop();

    // Audio feedback handled by caller via voiceState change
    _setState('listening');
    speak(''); // tiny pause clears TTS queue; ping sound would go here

    const transcript = await listenOnce(5000);

    if (!activeRef.current) return;

    if (!transcript) {
      speak("Didn't catch that — say DarkVision to try again.");
      _setState('scanning');
      startWakeWordScan(onWakeWord);
      return;
    }

    // Check for on-demand queries first
    const query = parseQuery(transcript);
    if (query) {
      onQuery?.(query);
      _setState('scanning');
      startWakeWordScan(onWakeWord);
      return;
    }

    // Try to parse as a move
    _setState('processing');
    let san = parseMoveDirectly(transcript);

    if (!san) {
      san = await normaliseMoveWithLLM(transcript);
    }

    if (!san) {
      speak("Didn't catch that — say DarkVision to try again.");
      _setState('scanning');
      startWakeWordScan(onWakeWord);
      return;
    }

    // Confirm with player
    setPendingMove(san);
    _setState('confirming');
    speak(`${san} — confirm?`);

    // Listen for yes/no
    const confirmation = await listenOnce(5000);

    if (!activeRef.current) return;

    if (isYes(confirmation)) {
      const confirmedMove = san;
      setPendingMove(null);
      _setState('scanning');
      startWakeWordScan(onWakeWord);
      onMove(confirmedMove);
    } else if (isNo(confirmation)) {
      speak('Cancelled.');
      setPendingMove(null);
      _setState('scanning');
      startWakeWordScan(onWakeWord);
    } else {
      // Timeout or unclear — try confirming once more
      speak(`${san} — confirm?`);
      const retry = await listenOnce(5000);
      setPendingMove(null);
      if (activeRef.current) {
        if (isYes(retry)) {
          _setState('scanning');
          startWakeWordScan(onWakeWord);
          onMove(san);
        } else {
          speak('Cancelled.');
          _setState('scanning');
          startWakeWordScan(onWakeWord);
        }
      }
    }
  }, [onMove, onQuery]);

  const startScanning = useCallback(() => {
    activeRef.current = true;
    _setState('scanning');
    startWakeWordScan(onWakeWord, (t) => setLastHeard(t));
  }, [onWakeWord]);

  const stopScanning = useCallback(async () => {
    activeRef.current = false;
    _setState('idle');
    setPendingMove(null);
    await stopWakeWordScan();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopWakeWordScan().catch(() => {});
    };
  }, []);

  /** Manually trigger the listen-for-move flow (same as wake word firing). */
  const triggerListen = useCallback(() => {
    if (!activeRef.current || voiceStateRef.current !== 'scanning') return;
    stopWakeWordScan().catch(() => {});
    onWakeWord();
  }, [onWakeWord]);

  return { voiceState, pendingMove, lastHeard, startScanning, stopScanning, triggerListen };
}
