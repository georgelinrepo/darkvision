import { Chess } from 'chess.js';
import { Puzzle } from './puzzle';

export type MoveResult =
  | { status: 'illegal' }
  | { status: 'incorrect' }
  | { status: 'correct'; complete: false; opponentSan: string }
  | { status: 'correct'; complete: true };

export class PuzzleEngine {
  private chess: Chess;
  private solution: string[]; // UCI, alternating player / opponent
  private index = 0;          // index of next expected player move

  constructor(puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
    this.solution = puzzle.solution;
  }

  getFen(): string {
    return this.chess.fen();
  }

  /** How many player moves have been played correctly. */
  get moveCount(): number {
    return Math.floor(this.index / 2);
  }

  applyMove(san: string): MoveResult {
    // 1. Attempt the move (chess.js validates legality)
    let move;
    try {
      move = this.chess.move(san);
    } catch {
      return { status: 'illegal' };
    }

    // 2. Compare resulting UCI against expected solution move
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

    // 4. Apply opponent's response
    const oppUci = this.solution[this.index];
    const oppMove = this.chess.move({
      from: oppUci.slice(0, 2) as any,
      to: oppUci.slice(2, 4) as any,
      promotion: oppUci[4] as any,
    });
    this.index++;

    // 5. Puzzle complete after opponent's last move
    if (this.index >= this.solution.length) {
      return { status: 'correct', complete: true };
    }

    return { status: 'correct', complete: false, opponentSan: oppMove.san };
  }
}
