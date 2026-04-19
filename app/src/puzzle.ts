import { Chess } from 'chess.js';

export interface Puzzle {
  id: string;
  fen: string;        // position AFTER opponent's setup move — player thinks from here
  solution: string[]; // remaining UCI moves the player must speak (both colours, in order)
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
  const allMoves: string[] = data.puzzle.solution; // [0]=opponent setup, [1..n]=player speaks
  const rating: number     = data.puzzle.rating;
  const id: string         = data.puzzle.id;

  // Replay game to initialPly
  const chess = new Chess();
  const pgnMoves = pgn.split(/\s+/).filter(Boolean);
  for (let i = 0; i < initialPly && i < pgnMoves.length; i++) {
    chess.move(pgnMoves[i]);
  }

  // Apply opponent's setup move (solution[0]) — this is what Lichess shows first
  const setupMove = allMoves[0];
  chess.move({
    from: setupMove.slice(0, 2) as any,
    to:   setupMove.slice(2, 4) as any,
    promotion: setupMove[4] as any,
  });

  return {
    id,
    fen: chess.fen(),          // position player thinks from
    solution: allMoves.slice(1), // player speaks all of these in order
    rating,
  };
}
