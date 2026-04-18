import { Chess } from 'chess.js';

export interface Puzzle {
  id: string;
  fen: string;          // position AFTER opponent's first move applied
  solution: string[];   // remaining UCI moves (player's first move is solution[0])
  rating: number;
  initialFen: string;   // raw FEN from Lichess (before first move)
  firstMove: string;    // opponent's move (UCI)
}

const LICHESS_PUZZLE_URL = 'https://lichess.org/api/puzzle/next';

export async function fetchPuzzle(): Promise<Puzzle> {
  const res = await fetch(LICHESS_PUZZLE_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Lichess API error: ${res.status}`);
  }
  const data = await res.json();

  const rawFen: string = data.puzzle.fen;
  const solution: string[] = data.puzzle.solution; // all UCI moves
  const rating: number = data.puzzle.rating;
  const id: string = data.puzzle.id;

  // First move in solution is the opponent's move — apply it to get the
  // position the player will actually think from.
  const chess = new Chess(rawFen);
  const firstMove = solution[0];
  chess.move({ from: firstMove.slice(0, 2), to: firstMove.slice(2, 4), promotion: firstMove[4] });

  return {
    id,
    fen: chess.fen(),
    solution: solution.slice(1), // remaining moves are player's to speak
    rating,
    initialFen: rawFen,
    firstMove,
  };
}
