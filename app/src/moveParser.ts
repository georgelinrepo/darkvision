/**
 * Direct spoken-move parser.
 * Returns a SAN string for chess.js, or null if the transcript can't be parsed.
 * The LLM normaliser is called by the caller if this returns null.
 */

// Spoken file → letter
const FILE: Record<string, string> = {
  alpha: 'a', bravo: 'b', charlie: 'c', delta: 'd',
  echo: 'e', foxtrot: 'f', golf: 'g', hotel: 'h',
  // common mis-hearings
  if: 'f', see: 'c', sea: 'c', dee: 'd', gee: 'g', be: 'b', jay: 'g',
  // plain letters
  a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h',
};

// Spoken rank → digit
const RANK: Record<string, string> = {
  one: '1', won: '1', 'one.': '1',
  two: '2', to: '2', too: '2',
  three: '3',
  four: '4', for: '4', fore: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8', ate: '8',
  '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8',
};

// Spoken piece → SAN letter (pawn = '' )
const PIECE: Record<string, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B',
  knight: 'N', night: 'N', knife: 'N', pawn: '',
};

// Spoken promotion piece
const PROMO: Record<string, string> = {
  queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', night: 'N',
};

function tok(raw: string): string[] {
  return raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
}

/**
 * Try to extract a square name from a slice of tokens starting at index i.
 * Returns [square, tokens_consumed] or null.
 * Accepts:  "echo 4"  |  "e4"  |  "e 4"
 */
function parseSquare(tokens: string[], i: number): [string, number] | null {
  const t0 = tokens[i];
  if (!t0) return null;

  // Single token like "e4"
  if (t0.length === 2 && FILE[t0[0]] && RANK[t0[1]]) {
    return [FILE[t0[0]] + RANK[t0[1]], 1];
  }

  // File token + rank token
  const file = FILE[t0];
  if (file && tokens[i + 1]) {
    const rank = RANK[tokens[i + 1]];
    if (rank) return [file + rank, 2];
  }

  return null;
}

export type QueryCommand =
  | { type: 'repeat_position' }
  | { type: 'repeat_pieces'; color: 'white' | 'black' }
  | { type: 'where_is'; piece: string; color: 'white' | 'black' };

/** Returns a QueryCommand if the transcript is a position query, else null. */
export function parseQuery(transcript: string): QueryCommand | null {
  const t = transcript.toLowerCase();

  if (t.includes('repeat position') || t.includes('position again')) {
    return { type: 'repeat_position' };
  }
  if (t.includes('repeat white') || t.includes('white pieces again')) {
    return { type: 'repeat_pieces', color: 'white' };
  }
  if (t.includes('repeat black') || t.includes('black pieces again')) {
    return { type: 'repeat_pieces', color: 'black' };
  }

  // "where is the black queen" / "where's the white rook"
  const where = /where(?:'s| is)(?: the)? (white|black) (\w+)/.exec(t);
  if (where) {
    const color = where[1] as 'white' | 'black';
    const piece = where[2];
    return { type: 'where_is', color, piece };
  }

  return null;
}

/** Returns SAN string or null if parse fails. */
export function parseMoveDirectly(transcript: string): string | null {
  const tokens = tok(transcript);
  let i = 0;

  // Castling
  if (tokens.includes('kingside') || tokens.join(' ').includes('castle king')) {
    return 'O-O';
  }
  if (tokens.includes('queenside') || tokens.join(' ').includes('castle queen')) {
    return 'O-O-O';
  }

  // Determine piece
  let pieceSAN = '';
  if (PIECE[tokens[i]] !== undefined) {
    pieceSAN = PIECE[tokens[i]];
    i++;
  }

  // Skip filler words
  while (tokens[i] === 'to' || tokens[i] === 'the') i++;

  // Capture?
  let capture = '';
  if (tokens[i] === 'takes' || tokens[i] === 'captures' || tokens[i] === 'x') {
    capture = 'x';
    i++;
  }

  // Skip filler again after "takes"
  while (tokens[i] === 'the') i++;

  // Destination square
  const sq = parseSquare(tokens, i);
  if (!sq) return null;
  const [square, consumed] = sq;
  i += consumed;

  // Promotion?
  let promo = '';
  if (tokens[i] === 'promotes' || tokens[i] === 'promotion') i++;
  if (tokens[i] === 'to') i++;
  if (tokens[i] && PROMO[tokens[i]]) {
    promo = '=' + PROMO[tokens[i]];
  }

  return `${pieceSAN}${capture}${square}${promo}`;
}

/** Returns true if transcript sounds like "yes" */
export function isYes(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  return ['yes', 'yeah', 'yep', 'correct', 'confirm', 'right', 'ok', 'okay'].some(w => t.includes(w));
}

/** Returns true if transcript sounds like "no" */
export function isNo(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  return ['no', 'nope', 'wrong', 'cancel', 'stop', 'negative'].some(w => t.includes(w));
}
