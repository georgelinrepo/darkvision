import { Chess } from 'chess.js';

export interface Puzzle {
  id: string;
  fen: string;          // position AFTER opponent's first move — what player thinks from
  solution: string[];   // remaining UCI moves (player's first move is solution[0])
  rating: number;
  initialFen: string;   // FEN before opponent's first move
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

  const pgn: string       = data.game.pgn;           // space-separated SAN moves, no numbers
  const initialPly: number = data.puzzle.initialPly; // how many plies to replay
  const solution: string[] = data.puzzle.solution;   // UCI moves; [0] is opponent's first move
  const rating: number    = data.puzzle.rating;
  const id: string        = data.puzzle.id;

  // Replay the game up to initialPly to reconstruct the puzzle start position
  const chess = new Chess();
  const moves = pgn.split(/\s+/).filter(Boolean);
  for (let i = 0; i < initialPly && i < moves.length; i++) {
    chess.move(moves[i]);
  }
  const initialFen = chess.fen();

  // Apply opponent's first move to get the position the player thinks from
  const firstMove = solution[0];
  chess.move({
    from: firstMove.slice(0, 2) as any,
    to: firstMove.slice(2, 4) as any,
    promotion: firstMove[4] as any,
  });

  return {
    id,
    fen: chess.fen(),
    solution: solution.slice(1),
    rating,
    initialFen,
    firstMove,
  };
}
