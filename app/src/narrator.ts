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

function squareToSpeech(square: string): string {
  return square; // e.g. "d1", "e4" — standard chess notation
}

const COUNT_WORDS: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four',
  5: 'five', 6: 'six', 7: 'seven', 8: 'eight',
};

function describePieces(chess: Chess, color: Color): string {
  const parts: string[] = [];

  for (const sym of PIECE_ORDER) {
    const squares = chess
      .board()
      .flat()
      .filter((sq) => sq && sq.color === color && sq.type === sym)
      .map((sq) => sq!.square);

    if (squares.length === 0) continue;

    const count = squares.length;
    const name = PIECE_NAMES[sym];

    if (count === 1) {
      parts.push(`a ${name} on ${squareToSpeech(squares[0])}`);
    } else {
      const countWord = COUNT_WORDS[count] ?? count.toString();
      const squareList = squares.map(squareToSpeech);
      const listed = squareList.length === 2
        ? `${squareList[0]} and ${squareList[1]}`
        : squareList.slice(0, -1).join(', ') + ', and ' + squareList[squareList.length - 1];
      parts.push(`${countWord} ${name}s on ${listed}`);
    }
  }

  // Oxford-comma join so Polly pauses naturally at each piece group
  if (parts.length === 0) return 'no pieces';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

export function fenToNarration(fen: string): string {
  const chess = new Chess(fen);
  const toMove = chess.turn() === 'w' ? 'White' : 'Black';

  const whitePieces = describePieces(chess, 'w');
  const blackPieces = describePieces(chess, 'b');

  // SSML: slow rate + pauses between sections for Polly
  return (
    `<speak><prosody rate="85%">` +
    `${toMove} to move. ` +
    `<break time="400ms"/>White has ${whitePieces}. ` +
    `<break time="600ms"/>Black has ${blackPieces}.` +
    `</prosody></speak>`
  );
}

/** Answer an on-demand position query from the current FEN. */
export function answerQuery(fen: string, type: string, color?: string, piece?: string): string {
  const chess = new Chess(fen);

  if (type === 'repeat_position') return fenToNarration(fen);

  if (type === 'repeat_pieces' && color) {
    const c = color === 'white' ? 'w' : 'b';
    return `${color} has ${describePieces(chess, c)}.`;
  }

  if (type === 'where_is' && color && piece) {
    const c = color === 'white' ? 'w' : 'b';
    const sym = Object.entries(PIECE_NAMES).find(([, name]) => name === piece.toLowerCase())?.[0] as PieceSymbol | undefined;
    if (!sym) return `I don't recognise that piece.`;
    const squares = chess.board().flat()
      .filter(sq => sq && sq.color === c && sq.type === sym)
      .map(sq => sq!.square);
    if (squares.length === 0) return `No ${color} ${piece} on the board.`;
    return `${color} ${piece} on ${squares.map(squareToSpeech).join(' and ')}.`;
  }

  return fenToNarration(fen);
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
