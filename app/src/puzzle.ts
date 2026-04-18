import { Chess } from 'chess.js';

export interface Puzzle {
  id: string;
  fen: string;        // position at puzzle start — player moves first from here
  solution: string[]; // UCI moves: [0]=player, [1]=opponent, [2]=player, ...
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

  // Replay game to initialPly — that position is where the player starts
  const chess = new Chess();
  const moves = pgn.split(/\s+/).filter(Boolean);
  for (let i = 0; i < initialPly && i < moves.length; i++) {
    chess.move(moves[i]);
  }

  return {
    id,
    fen: chess.fen(),
    solution,   // solution[0] is player's first move
    rating,
  };
}
