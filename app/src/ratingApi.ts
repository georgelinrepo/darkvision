/**
 * Rating persistence via the DarkVision Lambda API (backed by S3).
 * Swap the server-side store.py implementation to change the backend —
 * this client interface stays the same.
 */
import { API_URL } from './config';

const DEFAULT_USER = 'default';

export async function fetchRating(userId = DEFAULT_USER): Promise<number> {
  if (!API_URL) return 1500;
  try {
    const res = await fetch(`${API_URL}/rating?user=${encodeURIComponent(userId)}`);
    if (!res.ok) return 1500;
    const data = await res.json();
    return typeof data.rating === 'number' ? data.rating : 1500;
  } catch {
    return 1500;
  }
}

export async function saveRating(rating: number, userId = DEFAULT_USER): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userId, rating }),
    });
  } catch {
    // Non-fatal — rating will be re-saved next puzzle
  }
}
