# Project: Super Anatomy Bros — Anatomy and Physiology Edition

A Super Mario–style 2D canvas platformer for high school A&P vocab review.
Full feature spec lives in SPEC.md — read it before starting any new feature.

## Stack
- Frontend: React (Vite), HTML5 Canvas, Web Audio API
- Backend: FastAPI + MongoDB (Classroom Code + leaderboards ONLY)
- Persistence: localStorage for everything else

## Commands
- Frontend dev: `cd frontend && npm run dev`
- Backend dev: `cd backend && uvicorn main:app --reload`
- Mongo: `docker compose up -d mongo`

## Non-negotiable engineering rules
1. **The game loop mounts ONCE.** It reads pause/overlay state from refs, never from
   React state. Re-mounting the loop on state change causes choppy motion. This was
   the single biggest bug in the previous build — do not regress it.
2. **All pixel-art drawing lives in `game/spriteRenderer.js`.** GameCanvas.jsx is
   game loop, physics, and collision only. Keep it under ~600 lines.
3. Physics constants are tuned. Do not "improve" them without being asked:
   run speed 5.6, jump velocity -15.2, gravity 0.62, variable-height jump
   (releasing jump early cuts it short).
4. Overlays (CoinQuiz, EnemyEncounter, BossEncounter, door quiz, end-of-level quiz)
   are separate React components layered over the canvas. They pause via refs.
5. No user accounts, no logins, no student PII. Nicknames only.
6. No external game engines. Hand-rolled canvas.

## Workflow
- Build in the phases listed in SPEC.md. Stop at each checkpoint so I can play it.
- After each phase, tell me exactly what to test and what "working" looks like.
- Commit at the end of each phase with a descriptive message.
