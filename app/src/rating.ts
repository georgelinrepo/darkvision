const K = 32;

/** Elo-style puzzle rating update. Returns new player rating (rounded). */
export function updateRating(playerRating: number, puzzleRating: number, solved: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  const actual = solved ? 1 : 0;
  return Math.round(playerRating + K * (actual - expected));
}
