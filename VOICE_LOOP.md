# DarkVision — Voice Loop Specification

## States
- `IDLE`: mic dim, silent
- `LISTENING`: mic lit pulsing
- `PROCESSING`: mic static, spinner
- `CONFIRMING`: mic lit pulsing, move read back aloud

## Wake Word Detection
- Trigger: player says "DarkVision"
- On detection: audio ping → LISTENING state → open STT session
- False trigger handling: minimum confidence threshold, 1 second debounce

## STT
- Library: `@react-native-voice/voice`
- iOS: `SFSpeechRecognizer`. Android: `SpeechRecognizer`.
- Session: listen until 500ms silence. Max 5 seconds. Timeout → prompt repeat.

## Move Parser (Direct)
Attempts parse before calling LLM:
```
"knight f3"       → Nf3
"queen takes e5"  → Qxe5
"castle kingside" → O-O
"castle queenside"→ O-O-O
```

Mishearing normalisation:
```
"night"/"knife"   → N (knight)
"if"              → f
"see"             → c
"dee"             → d
"gee"             → g
"won"/"one"       → 1
"to"/"two"        → 2
"eight"           → 8
```

## LLM Normalisation (Fallback)
- Model: `claude-haiku-4-5-20251001`
- System prompt: parse spoken chess move, return algebraic notation only, or `UNCLEAR` if genuinely ambiguous.
- Timeout: 2 seconds max.

## Move Confirmation
1. Read move aloud: "Knight f3 — confirm?"
2. Listen for yes/no
3. Yes → validate. No → return to IDLE.
4. Timeout → repeat once, then cancel.

## Move Validation
- Step 1: legality check via chess.js. If illegal → "Illegal move — try again"
- Step 2: solution check. If correct → advance. If incorrect → "Incorrect", end puzzle.
- Disambiguation: if two pieces can reach same square → ask "Which rook — a1 or f1?"

## On-Demand Queries
Player says DarkVision then:
- "Where is the black queen?" → "Black queen is on b6"
- "Repeat position" → full inventory again
- "Repeat white/black pieces" → partial read-out

Implementation: pattern match on transcript before move parser.

## TTS Phrases
| Event | Phrase |
|---|---|
| Position start | "White to move. White: [pieces]. Black: [pieces]." |
| Move confirmation | "[Move] — confirm?" |
| Correct | "Puzzle complete." |
| Incorrect | "Incorrect. Puzzle failed. Rating: [new rating]." |
| Illegal | "Illegal move — try again." |
| Unclear | "Didn't catch that — say DarkVision to try again." |

## Error Handling
- No internet: show offline banner, disable puzzle fetch
- Lichess timeout: retry once, then error
- LLM timeout: treat as UNCLEAR, prompt repeat
- STT permission denied: show permissions screen
- Microphone unavailable: show error
