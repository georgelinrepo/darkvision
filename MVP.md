# DarkVision — MVP Scope

## Goal
Validate that voice-first blindfold chess works as an experience.

## Build Order

### Phase 1 — Position Read-Out
- Fetch puzzle from Lichess API
- Apply first move to get actual starting position
- Parse FEN into piece inventory
- Read out via TTS
- Test on device in real car environment

Done when: position read-out is clear, fast, and unambiguous to an 1800 player.

### Phase 2 — Voice Input Loop
- Implement wake word detection
- Open STT session on wake word
- Parse transcript as algebraic notation
- If parse fails, call Claude Haiku
- Read move back for confirmation
- Accept yes/no by voice

Done when: moves recognised reliably in noisy environment.

### Phase 3 — Full Puzzle Loop
- Wire Phase 1 and 2 together
- Validate moves against solution line
- Handle correct/incorrect/illegal
- Multi-move puzzle support
- Voice announcements throughout

Done when: complete multi-move puzzle solvable without touching screen.

### Phase 4 — Basic Rating
- Local puzzle rating (starts 1500)
- Elo-style update on solve/fail
- Display rating on screen

Done when: rating persists correctly between sessions.

## What's In MVP
- Lichess puzzle fetch (1700–1900 rating band)
- Full piece inventory TTS read-out
- Wake word activation
- Native STT move capture
- LLM normalisation fallback
- Move confirmation by voice
- Legal move validation
- Solution line validation
- Multi-move puzzle support
- Calculation mode
- Success/fail voice announcement
- On-demand position query
- Basic Elo puzzle rating (local)
- Visual mic state indicator
- Audio ping on wake word

## What's Out of MVP
- Reactive mode
- Game mode vs engine
- Theme filtering
- Streaks and badges
- User accounts
- Cloud sync
- Difficulty adjustment
- Offline mode

## MVP Success Criteria
1. Player understands puzzle position from audio alone
2. Wake word reliable in noisy car
3. Moves recognised >90% of the time
4. Multi-move puzzle solvable without screen
5. Rating updates correctly
