import { Chess } from 'chess.js';

export interface Puzzle {
  id: string;
  fen: string;        // puzzle start position (after initialPly+1 PGN moves)
  solution: string[]; // all UCI moves the player must speak, starting from solution[0]
  rating: number;
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

  const pgn: string        = data.game.pgn;
  const initialPly: number = data.puzzle.initialPly;
  const solution: string[] = data.puzzle.solution;
  const rating: number     = data.puzzle.rating;
  const id: string         = data.puzzle.id;

  // initialPly is the 0-indexed ply number of the last PGN move before the puzzle.
  // Replay moves at indices 0 through initialPly (inclusive) = initialPly+1 total.
  const chess = new Chess();
  const pgnMoves = pgn.split(/\s+/).filter(Boolean);
  for (let i = 0; i <= initialPly && i < pgnMoves.length; i++) {
    chess.move(pgnMoves[i]);
  }

  return {
    id,
    fen: chess.fen(),   // position where it's the player's turn to find the winning line
    solution,           // player speaks solution[0], [1], … in order (calculation mode)
    rating,
  };
}
