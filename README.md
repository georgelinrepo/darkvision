# DarkVision

Voice-first blindfold chess training for serious players.

Solve Lichess puzzles entirely by voice — no screen required. Built for the car: speak your moves, hear the position, train your calculation without looking at a board.

---

## How It Works

```
Lichess Puzzle API
      │
      ▼
  Position Narrator ──► AWS Polly (neural TTS) ──► Player hears position
                                                         │
                                              "DarkVision" wake word
                                                         │
                                                    Native STT
                                                         │
                                               Raw spoken transcript
                                                         │
                                          ┌──────────────┴──────────────┐
                                          │                             │
                                    Direct parse                 Claude Haiku
                                    succeeds?                   normalises to
                                          │                        SAN
                                          └──────────────┬──────────────┘
                                                         │
                                                    chess.js
                                              validates against
                                               solution line
                                                         │
                                              ┌──────────┴──────────┐
                                           Correct                Wrong
                                          next move              fail state
```

The player speaks every move — both colours — in solution order. The app validates each move against the known Lichess solution line and announces success or failure by voice at the end.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo (TypeScript) |
| Speech-to-text | Native iOS/Android STT via Expo Speech Recognition |
| Text-to-speech | AWS Polly neural voice (Matthew) via Lambda proxy |
| Move normalisation | Anthropic Claude Haiku |
| Puzzle source | Lichess Puzzle API (free, no auth) |
| Chess logic | chess.js |
| Backend | AWS Lambda (Python 3.12) + AWS SAM |
| Rating storage | Amazon S3 |

---

## Key Engineering

**Wake word as the interaction model.** The app listens continuously for "DarkVision" rather than requiring a button press — essential for a hands-free, eyes-free car environment. On detection: audio ping, mic icon pulses, STT session opens.

**LLM as a parsing fallback, not the primary path.** Spoken move transcripts ("knight to f3", "takes on e5") are first parsed directly into SAN. Claude Haiku is only called when direct parsing fails, keeping latency low and cost near zero (~$0.04 per 1,000 puzzles).

**AWS Polly over native TTS.** Native TTS reads chess notation oddly ("e4" as "E four", "Nf3" as "NF three"). Polly's neural Matthew voice with SSML control produces natural, unambiguous chess narration — critical when the player can't look at the board to cross-check.

**Position narration is structured, not conversational.** The piece inventory is read in a fixed order (who to move → white K Q R B N pawns → black K Q R B N pawns) with individual pawn squares listed one by one. Consistent structure lets the player build a reliable mental model across many sessions.

**Solution validation, not just legality.** chess.js checks two things: the move is legal in the current position, and it matches the next expected move in the Lichess solution line. A legal but wrong move is caught immediately.

---

## Project Structure

```
app/        React Native + Expo mobile app
  src/
    components/   UI components (mic state indicator, tap-to-speak)
    hooks/        Voice loop, wake word detection, TTS
    services/     Lichess API, chess logic, move parsing

server/     AWS Lambda function (Python)
  handler.py      Routes: /speak, /normalise-move, /rating
  store.py        S3-backed rating store
  template.yaml   AWS SAM infrastructure definition
```

---

## Setup

### 1. Deploy the server

```bash
cd server

# Store Anthropic API key in SSM (one-time)
aws ssm put-parameter \
  --name /darkvision/anthropic-key \
  --value sk-ant-... \
  --type SecureString

# Build and deploy
sam build && sam deploy --guided
```

Note the API Gateway URL from the deploy output.

### 2. Configure the app

```bash
cd app
cp .env.example .env   # if present, or create manually
```

Set in `app/.env`:

```
EXPO_PUBLIC_API_URL=https://<your-api-id>.execute-api.<region>.amazonaws.com
```

### 3. Run

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go on a physical device. Wake word detection and native STT require a real device — simulators won't work reliably.
