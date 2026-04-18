import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchPuzzle, Puzzle } from './src/puzzle';
import { fenToNarration } from './src/narrator';
import { speak, stop as ttsStop } from './src/tts';
import { useVoiceLoop, VoiceState } from './src/hooks/useVoiceLoop';

type AppState = 'idle' | 'loading' | 'active' | 'error';

const MIC_LABEL: Record<VoiceState, string> = {
  idle:        '',
  scanning:    '○  waiting for DarkVision',
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
  const [appState, setAppState] = useState<AppState>('idle');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState('');
  const [lastMove, setLastMove] = useState('');

  const handleMove = useCallback((san: string) => {
    // Phase 3 will validate against solution; for now just echo it
    setLastMove(san);
    speak(`Move: ${san}`);
  }, []);

  const { voiceState, pendingMove, startScanning, stopScanning } = useVoiceLoop({
    onMove: handleMove,
  });

  async function loadAndRead() {
    setAppState('loading');
    setError('');
    try {
      const p = await fetchPuzzle();
      setPuzzle(p);
      setAppState('active');
      const narration = fenToNarration(p.fen);
      speak(narration, { onDone: () => startScanning() });
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch puzzle');
      setAppState('error');
    }
  }

  function handleStop() {
    ttsStop();
    stopScanning();
    setAppState('idle');
    setPuzzle(null);
    setLastMove('');
  }

  function handleRepeat() {
    if (!puzzle) return;
    ttsStop();
    speak(fenToNarration(puzzle.fen));
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>DARKVISION</Text>

      {puzzle && (
        <Text style={styles.rating}>Puzzle {puzzle.rating}</Text>
      )}

      {/* Mic state indicator */}
      {appState === 'active' && (
        <View style={styles.micWrap}>
          <Text style={[styles.micDot, { color: MIC_COLOR[voiceState] }]}>
            {MIC_LABEL[voiceState]}
          </Text>
          {pendingMove && (
            <Text style={styles.pending}>{pendingMove}</Text>
          )}
        </View>
      )}

      {lastMove !== '' && (
        <Text style={styles.lastMove}>Last: {lastMove}</Text>
      )}

      {appState === 'loading' && (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 32 }} />
      )}

      {appState === 'error' && (
        <Text style={styles.error}>{error}</Text>
      )}

      <View style={styles.btnRow}>
        {(appState === 'idle' || appState === 'error') && (
          <Pressable style={styles.btn} onPress={loadAndRead}>
            <Text style={styles.btnText}>
              {appState === 'error' ? 'Retry' : 'Start Puzzle'}
            </Text>
          </Pressable>
        )}

        {appState === 'active' && (
          <>
            <Pressable style={styles.btn} onPress={handleRepeat}>
              <Text style={styles.btnText}>Repeat</Text>
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
    marginBottom: 4,
  },
  rating: {
    fontSize: 13,
    color: '#666',
    marginBottom: 40,
  },
  micWrap: {
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 60,
  },
  micDot: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  pending: {
    marginTop: 8,
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  lastMove: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  error: {
    color: '#f66',
    marginBottom: 16,
    textAlign: 'center',
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
  btnDanger: {
    backgroundColor: '#3a1a1a',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
