/**
 * LLM fallback for move normalisation.
 * Calls Claude Haiku with a 2-second timeout.
 * Returns SAN string or null if UNCLEAR / error / timeout.
 */
import { ANTHROPIC_API_KEY } from './config';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const SYSTEM =
  'You parse spoken chess moves into standard algebraic notation. ' +
  'Return the SAN string only (e.g. Nf3, Qxe5, e4, O-O, O-O-O, e8=Q). ' +
  'Return UNCLEAR if genuinely ambiguous. Nothing else. No explanation.';

export async function normaliseMoveWithLLM(transcript: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16,
        system: SYSTEM,
        messages: [{ role: 'user', content: transcript }],
      }),
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data.content?.[0]?.text?.trim() ?? '';
    return text === 'UNCLEAR' || !text ? null : text;
  } catch {
    return null;
  }
}
