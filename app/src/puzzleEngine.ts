import { Chess } from 'chess.js';
import { Puzzle } from './puzzle';

export type MoveResult =
  | { status: 'illegal' }
  | { status: 'incorrect' }
  | { status: 'correct'; complete: false; opponentSan: string }
  | { status: 'correct'; complete: true };

export class PuzzleEngine {
  private chess: Chess;
  private solution: string[]; // UCI: [0]=player, [1]=opponent, [2]=player, ...
  private index = 0;          // index of next expected player move (always even)

  constructor(puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
    this.solution = puzzle.solution;
  }

  getFen(): string {
    return this.chess.fen();
  }

  applyMove(san: string): MoveResult {
    // 1. Attempt the move
    let move;
    try {
      move = this.chess.move(san);
    } catch {
      return { status: 'illegal' };
    }

    // 2. Compare UCI against expected solution move
    const uci = move.from + move.to + (move.promotion ?? '');
    const expected = this.solution[this.index];

    if (uci !== expected) {
      this.chess.undo();
      return { status: 'incorrect' };
    }

    this.index++;

    // 3. Puzzle complete if no more moves
    if (this.index >= this.solution.length) {
      return { status: 'correct', complete: true };
    }

    // 4. Apply opponent's response (odd index)
    const oppUci = this.solution[this.index];
    const oppMove = this.chess.move({
      from: oppUci.slice(0, 2) as any,
      to: oppUci.slice(2, 4) as any,
      promotion: oppUci[4] as any,
    });
    this.index++;

    // 5. Complete if no more player moves
    if (this.index >= this.solution.length) {
      return { status: 'correct', complete: true };
    }

    return { status: 'correct', complete: false, opponentSan: oppMove.san };
  }
}
