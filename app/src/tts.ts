import * as Speech from 'expo-speech';

const DEFAULT_OPTIONS: Speech.SpeechOptions = {
  rate: 0.95,   // slightly slower than default for clarity
  pitch: 1.0,
};

export function speak(text: string, options?: Speech.SpeechOptions): void {
  Speech.speak(text, { ...DEFAULT_OPTIONS, ...options });
}

export function stop(): void {
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
