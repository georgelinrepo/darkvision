import { Chess, PieceSymbol, Color } from 'chess.js';

const PIECE_NAMES: Record<PieceSymbol, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

// Order pieces are announced: K Q R B N P
const PIECE_ORDER: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];

// Map file letter to spoken word to avoid ambiguity (e.g. "b" vs "be")
const FILE_NAMES: Record<string, string> = {
  a: 'alpha',
  b: 'bravo',
  c: 'charlie',
  d: 'delta',
  e: 'echo',
  f: 'foxtrot',
  g: 'golf',
  h: 'hotel',
};

function squareToSpeech(square: string): string {
  return `${FILE_NAMES[square[0]]} ${square[1]}`;
}

function describePieces(chess: Chess, color: Color): string {
  const parts: string[] = [];

  for (const sym of PIECE_ORDER) {
    const squares = chess
      .board()
      .flat()
      .filter((sq) => sq && sq.color === color && sq.type === sym)
      .map((sq) => sq!.square);

    if (squares.length === 0) continue;

    const name = squares.length === 1
      ? PIECE_NAMES[sym]
      : `${PIECE_NAMES[sym]}s`;

    parts.push(`${name} on ${squares.map(squareToSpeech).join(' and ')}`);
  }

  return parts.join(', ');
}

export function fenToNarration(fen: string): string {
  const chess = new Chess(fen);
  const toMove = chess.turn() === 'w' ? 'White' : 'Black';

  const whitePieces = describePieces(chess, 'w');
  const blackPieces = describePieces(chess, 'b');

  return `${toMove} to move. White: ${whitePieces}. Black: ${blackPieces}.`;
}

// Convert a UCI move string to a terse spoken phrase for confirmation.
// e.g. "e2e4" → "pawn echo 2 to echo 4"
export function uciToSpeech(uci: string, fen: string): string {
  const chess = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4];

  const piece = chess.get(from as any);
  const pieceName = piece ? PIECE_NAMES[piece.type] : 'piece';

  let phrase = `${pieceName} ${squareToSpeech(from)} to ${squareToSpeech(to)}`;
  if (promotion) {
    phrase += ` promotes to ${PIECE_NAMES[promotion as PieceSymbol]}`;
  }
  return phrase;
}
