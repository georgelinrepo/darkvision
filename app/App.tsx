import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchPuzzle, Puzzle } from './src/puzzle';
import { fenToNarration } from './src/narrator';
import { speak, stop } from './src/tts';

type AppState = 'idle' | 'loading' | 'ready' | 'speaking' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string>('');

  async function loadAndRead() {
    setAppState('loading');
    setError('');
    try {
      const p = await fetchPuzzle();
      setPuzzle(p);
      setAppState('speaking');
      const narration = fenToNarration(p.fen);
      speak(narration, {
        onDone: () => setAppState('ready'),
        onError: () => setAppState('ready'),
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch puzzle');
      setAppState('error');
    }
  }

  function handleRepeat() {
    if (!puzzle) return;
    stop();
    setAppState('speaking');
    const narration = fenToNarration(puzzle.fen);
    speak(narration, {
      onDone: () => setAppState('ready'),
      onError: () => setAppState('ready'),
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>DarkVision</Text>

      {puzzle && (
        <Text style={styles.rating}>Puzzle rating: {puzzle.rating}</Text>
      )}

      {appState === 'loading' && (
        <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
      )}

      {appState === 'speaking' && (
        <Text style={styles.status}>Reading position...</Text>
      )}

      {appState === 'ready' && puzzle && (
        <Pressable style={styles.btn} onPress={handleRepeat}>
          <Text style={styles.btnText}>Repeat Position</Text>
        </Pressable>
      )}

      {appState === 'error' && (
        <Text style={styles.error}>{error}</Text>
      )}

      {(appState === 'idle' || appState === 'error') && (
        <Pressable style={styles.btn} onPress={loadAndRead}>
          <Text style={styles.btnText}>
            {appState === 'error' ? 'Retry' : 'Start Puzzle'}
          </Text>
        </Pressable>
      )}
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
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
  },
  status: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 16,
  },
  spinner: {
    marginTop: 16,
  },
  btn: {
    marginTop: 24,
    backgroundColor: '#333',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#f66',
    marginBottom: 16,
    textAlign: 'center',
  },
});
