import { Chess } from 'chess.js';
import { Puzzle } from './puzzle';

export type MoveResult =
  | { status: 'illegal' }
  | { status: 'incorrect' }
  | { status: 'correct'; complete: boolean };

export class PuzzleEngine {
  private chess: Chess;
  private solution: string[]; // UCI moves player must speak in order (both colours)
  private index = 0;

  constructor(puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
    this.solution = puzzle.solution;
  }

  getFen(): string {
    return this.chess.fen();
  }

  get moveCount(): number {
    return this.index;
  }

  get moveIndex(): number {
    return this.index;
  }

  get solutionMoves(): string[] {
    return this.solution;
  }

  applyMove(san: string): MoveResult {
    // 1. Attempt the move (chess.js enforces legality and turn order)
    let move;
    try {
      move = this.chess.move(san);
    } catch {
      return { status: 'illegal' };
    }

    // 2. Check against expected solution move
    const uci = move.from + move.to + (move.promotion ?? '');
    if (uci !== this.solution[this.index]) {
      this.chess.undo();
      return { status: 'incorrect' };
    }

    this.index++;
    return { status: 'correct', complete: this.index >= this.solution.length };
  }
}
