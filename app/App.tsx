import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchPuzzle, Puzzle } from './src/puzzle';
import { PuzzleEngine } from './src/puzzleEngine';
import { fenToNarration, answerQuery } from './src/narrator';
import { updateRating } from './src/rating';
import { speak, stop as ttsStop } from './src/tts';
import { useVoiceLoop, VoiceState } from './src/hooks/useVoiceLoop';
import { QueryCommand } from './src/moveParser';
import { fetchRating, saveRating } from './src/ratingApi';

type PuzzleStatus = 'idle' | 'loading' | 'playing' | 'complete' | 'failed';

const MIC_LABEL: Record<VoiceState, string> = {
  idle:        '',
  scanning:    '○  say DarkVision',
  listening:   '●  listening',
  processing:  '◌  processing',
  confirming:  '●  confirm?',
};

const MIC_COLOR: Record<VoiceState, string> = {
  idle:        '#444',
  scanning:    '#555',
  listening:   '#4af',
  processing:  '#fa4',
  confirming:  '#4af',
};

export default function App() {
  const [status, setStatus] = useState<PuzzleStatus>('idle');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [playerRating, setPlayerRating] = useState(1500);

  // Load persisted rating on mount
  useEffect(() => {
    fetchRating().then(setPlayerRating);
  }, []);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);

  // Engine lives in a ref — mutable, no re-renders on each move
  const engineRef = useRef<PuzzleEngine | null>(null);

  // ── Move handler — called by voice loop after player confirms a move ──
  const handleMove = useCallback((san: string) => {
    const engine = engineRef.current;
    if (!engine || !puzzle) return;

    const result = engine.applyMove(san);
    setMoveIndex(engine.moveIndex);

    if (result.status === 'illegal') {
      speak('Illegal move — try again.');
      return; // voice loop is already scanning
    }

    if (result.status === 'incorrect') {
      setPlayerRating(prev => {
        const next = updateRating(prev, puzzle.rating, false);
        speak(`Incorrect. Puzzle failed. Rating: ${next}.`);
        saveRating(next);
        return next;
      });
      setMessage('Puzzle failed.');
      setStatus('failed');
      stopScanning();
      return;
    }

    // Correct move
    if (result.complete) {
      setPlayerRating(prev => {
        const next = updateRating(prev, puzzle.rating, true);
        speak(`Puzzle complete. Rating: ${next}.`);
        saveRating(next);
        return next;
      });
      setMessage('Puzzle complete!');
      setStatus('complete');
      stopScanning();
    } else {
      setMessage(`✓  ${san}`);
      speak('Correct.');
      // Voice loop already restarted scanning for next move
    }
  }, [puzzle]);

  // ── Query handler — position questions mid-puzzle ──
  const handleQuery = useCallback((cmd: QueryCommand) => {
    const engine = engineRef.current;
    if (!engine) return;
    const fen = engine.getFen();
    let answer: string;
    if (cmd.type === 'where_is') {
      answer = answerQuery(fen, 'where_is', cmd.color, cmd.piece);
    } else if (cmd.type === 'repeat_pieces') {
      answer = answerQuery(fen, 'repeat_pieces', cmd.color);
    } else {
      answer = answerQuery(fen, 'repeat_position');
    }
    speak(answer);
  }, []);

  const { voiceState, pendingMove, lastHeard, startScanning, stopScanning, triggerListen } = useVoiceLoop({
    onMove: handleMove,
    onQuery: handleQuery,
  });

  // ── Load a new puzzle ──
  async function loadPuzzle() {
    ttsStop();
    setStatus('loading');
    setError('');
    setMessage('');
    engineRef.current = null;

    try {
      const p = await fetchPuzzle();
      setPuzzle(p);
      engineRef.current = new PuzzleEngine(p);
      setMoveIndex(0);
      setStatus('playing');
      const narration = fenToNarration(p.fen);
      speak(narration, { onDone: () => startScanning() });
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch puzzle');
      setStatus('idle');
    }
  }

  function handleRepeat() {
    const engine = engineRef.current;
    if (!engine) return;
    ttsStop();
    speak(fenToNarration(engine.getFen()));
  }

  function handleStop() {
    ttsStop();
    stopScanning();
    engineRef.current = null;
    setPuzzle(null);
    setStatus('idle');
    setMessage('');
  }

  const playing = status === 'playing';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>DARKVISION</Text>

      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>Rating</Text>
        <Text style={styles.ratingValue}>{playerRating}</Text>
        {puzzle && <Text style={styles.puzzleRating}>  puzzle {puzzle.rating}</Text>}
      </View>

      {/* Mic state */}
      {playing && (
        <View style={styles.micWrap}>
          <Text style={[styles.micLabel, { color: MIC_COLOR[voiceState] }]}>
            {MIC_LABEL[voiceState]}
          </Text>
          {pendingMove && <Text style={styles.pending}>{pendingMove}</Text>}
          {!pendingMove && lastHeard !== '' && (
            <Text style={styles.heard}>{lastHeard}</Text>
          )}
          {voiceState === 'scanning' && (
            <Pressable style={styles.tapBtn} onPress={triggerListen}>
              <Text style={styles.tapBtnText}>TAP TO SPEAK</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Status message */}
      {message !== '' && (
        <Text style={[
          styles.message,
          status === 'failed' && styles.messageFail,
          status === 'complete' && styles.messageWin,
        ]}>
          {message}
        </Text>
      )}

      {status === 'loading' && (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 32 }} />
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {/* DEBUG: expected solution moves */}
      {puzzle && engineRef.current && (
        <View style={styles.debug}>
          <Text style={styles.debugTitle}>Expected moves:</Text>
          {engineRef.current.solutionSAN.map((san, i) => (
            <Text
              key={i}
              style={[
                styles.debugMove,
                i === moveIndex && styles.debugMoveCurrent,
                i < moveIndex && styles.debugMoveDone,
              ]}
            >
              {i + 1}. {san}{i === moveIndex ? '  ←' : ''}
            </Text>
          ))}
        </View>
      )}

      {/* Buttons */}
      <View style={styles.btnRow}>
        {(status === 'idle' || status === 'complete' || status === 'failed') && (
          <Pressable style={styles.btn} onPress={loadPuzzle}>
            <Text style={styles.btnText}>
              {status === 'idle' ? 'Start Puzzle' : 'Next Puzzle'}
            </Text>
          </Pressable>
        )}

        {playing && (
          <>
            <Pressable style={styles.btn} onPress={handleRepeat}>
              <Text style={styles.btnText}>Repeat</Text>
            </Pressable>
            {puzzle && (
              <Pressable
                style={styles.btn}
                onPress={() => Linking.openURL(`https://lichess.org/training/${puzzle.id}`)}
              >
                <Text style={styles.btnText}>View Position</Text>
              </Pressable>
            )}
            <Pressable style={[styles.btn, styles.btnSkip]} onPress={loadPuzzle}>
              <Text style={styles.btnText}>Skip</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={handleStop}>
              <Text style={styles.btnText}>Stop</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  ratingLabel: {
    fontSize: 13,
    color: '#555',
    marginRight: 6,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  puzzleRating: {
    fontSize: 13,
    color: '#444',
  },
  micWrap: {
    alignItems: 'center',
    minHeight: 64,
    marginBottom: 16,
  },
  micLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  pending: {
    marginTop: 10,
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
  },
  heard: {
    marginTop: 6,
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tapBtn: {
    marginTop: 20,
    backgroundColor: '#4af',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
  },
  tapBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  message: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageFail: { color: '#f66' },
  messageWin:  { color: '#4d4' },
  error: {
    color: '#f66',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnSkip:   { backgroundColor: '#1a2a3a' },
  btnDanger: { backgroundColor: '#3a1a1a' },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  debug: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  debugTitle: {
    color: '#666',
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  debugMove: {
    color: '#555',
    fontSize: 13,
    fontFamily: 'monospace',
    paddingVertical: 1,
  },
  debugMoveCurrent: {
    color: '#4af',
    fontWeight: '700',
  },
  debugMoveDone: {
    color: '#2a5',
    textDecorationLine: 'line-through',
  },
});
