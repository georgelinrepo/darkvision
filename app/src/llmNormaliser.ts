/**
 * LLM fallback for move normalisation via the darkvision proxy Lambda.
 * The proxy holds the Anthropic API key — no secrets in the app.
 * Returns SAN string or null if UNCLEAR / error / timeout.
 */
import { API_URL } from './config';

export async function normaliseMoveWithLLM(transcript: string): Promise<string | null> {
  if (!API_URL) return null;

  try {
    const res = await fetch(`${API_URL}/normalise-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.san ?? null;
  } catch {
    return null;
  }
}
