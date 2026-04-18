# DarkVision — Product Requirements Document

## Overview
DarkVision is a voice-first blindfold chess training app for serious players. It allows players to solve Lichess puzzles entirely by voice, with no need to look at a screen. Designed for use during car journeys, it trains deep blindfold calculation through audio-only interaction.

## Target User
- Chess player rated ~1800 OTB
- Wants to improve blindfold calculation and visualisation
- Uses the app during car journeys — hands-free, eyes-free
- Does not need hand-holding or unsolicited hints
- Expects a serious, terse, fast experience

## Platform
React Native + Expo — single codebase for iOS and Android. Native speech recognition for maximum STT quality in noisy environments.

## Core Experience
1. App reads out the full piece inventory of a puzzle position
2. Player speaks every move — both colours — in the correct solution order
3. App validates each move against the known Lichess solution line
4. Success or failure announced by voice at the end
5. Puzzle rating updates accordingly

## Key Design Principles
- Voice-first, screen-optional
- Serious player experience — no hand-holding, no unsolicited hints
- Fast and terse — clean move announcements, no filler language
- No internet = no app — LLM dependency accepted; offline mode not required

## Features

### Puzzle Mode
- Fetch puzzles from Lichess API filtered by rating band (default 1700–1900)
- Read out full piece inventory at puzzle start (white then black, by piece type)
- Player speaks all moves for both colours in sequence
- Legal move validation against known solution line
- On-demand position queries mid-puzzle
- Success/fail state announced by voice

### Two Training Modes
- Calculation mode (primary): player speaks all moves, both colours
- Reactive mode: app announces engine moves, player speaks only their colour

### Wake Word
- Wake word: "DarkVision"
- On detection: audio ping + pulsing microphone icon on screen
- Three visual states: idle, listening, processing

### Points System
- Elo-style puzzle rating, separate from OTB rating
- Solve = rating up, fail = rating down, scaled by puzzle difficulty
- Streak tracking for consecutive solves

## Out of Scope (Post-MVP)
- Game mode (vs engine)
- Puzzle theme filtering
- Streaks and badges UI
- User accounts and cloud sync
- Difficulty adjustment settings
- Offline/cached puzzle mode

## Success Criteria for MVP
The MVP is considered successful if a player can:
1. Hear a puzzle position read aloud and understand it
2. Speak moves by voice reliably in a noisy car environment
3. Complete a multi-move puzzle end to end without touching the screen
