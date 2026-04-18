# DarkVision — Architecture

## Tech Stack
| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo |
| Language | TypeScript |
| Speech-to-text | Native iOS/Android STT via Expo Speech Recognition |
| Text-to-speech | Native iOS/Android TTS via Expo Speech |
| LLM normalisation | Anthropic Claude API (claude-haiku) |
| Puzzle source | Lichess Puzzle API |
| Chess logic | chess.js |
| State management | React useState / useReducer |

## System Components

### 1. Wake Word Detector
Continuously listens for "DarkVision". On detection: fires audio ping, activates mic icon, opens STT session.

### 2. Speech-to-Text (STT)
Uses native platform STT. Captures player's spoken move. Returns raw transcript.

### 3. Move Normaliser (LLM)
Input: raw STT transcript. Output: standard algebraic notation. Model: Claude Haiku. Only called when raw transcript fails direct parse.

### 4. Move Validator
Library: chess.js. Validates normalised move against current position and solution line.

### 5. Puzzle Engine
Fetches puzzle from Lichess API. Parses FEN and solution move list. Tracks position in solution sequence.

### 6. Position Narrator
Takes FEN as input. Generates structured piece inventory. Order: who to move → white pieces (K Q R B N pawns) → black pieces.

### 7. Text-to-Speech (TTS)
Native platform TTS. Terse, fast — no filler language.

### 8. Rating Engine
Local puzzle rating (starts at 1500). Elo-style update on solve/fail.

## Data Flow
```
Lichess API → Puzzle Engine (FEN + solution)
  → Position Narrator → TTS
  → Player speaks move → Wake Word → STT
  → Move Normaliser → TTS confirmation
  → Player confirms → Move Validator
  → advance or fail
```

## Lichess Puzzle API
- Endpoint: `GET https://lichess.org/api/puzzle/next`
- Key fields: `puzzle.fen`, `puzzle.solution` (UCI array), `puzzle.rating`
- Note: first move in solution is opponent's move — apply before reading position to player.

## Cost Estimate
- Lichess API: free
- Native STT: free
- Claude Haiku fallback: ~$0.00004 per puzzle
- Native TTS: free
- Estimated cost per 1,000 puzzles: ~$0.04

## Key Dependencies
- `expo-speech` (TTS)
- `expo-av` (audio ping)
- `chess.js` (FEN parsing, move validation)
- Anthropic SDK (LLM normalisation)
- Lichess public API (no auth required)
