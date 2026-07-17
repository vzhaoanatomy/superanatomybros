# Super Anatomy Bros — Full Spec

## Content model (read first)
Vocabulary is **teacher-supplied, not hardcoded**. The 7 built-in worlds are themed
shells: each ships with a visual theme, enemy type, level layout, and 8–10 placeholder
sample terms so the game is playable immediately. Teachers replace or extend any
world's vocab via Teacher Mode. Every world — built-in or custom — draws quiz content
from an editable vocab list. Do not invent large medical term sets; write only the
small sample sets needed for a working demo.

## The 7 built-in worlds
| # | World | Enemy sprite |
|---|-------|--------------|
| 1 | Anatomical and Directional Terms | goomba-style blob |
| 2 | Integumentary System | skin-disease blob |
| 3 | Skeletal System | skeleton |
| 4 | Muscular System | muscle-brawler |
| 5 | Nervous System | neuron |
| 6 | Feline Anatomy (Cat Dissection) | lab-cat |
| 7 | Boss World | dragonlings + final dragon boss |

Each world gets a distinct background palette and its own enemy sprite.

## Characters (4 selectable, original designs)
1. **Doc** — red cap, blue overalls, mustache — *Coin Combo:* every 5th coin worth 2x
2. **Vee** — green cap variant — *Super Jump:* jumps 20% higher
3. **Dr. Bloom** — crown, pink dress — *Glide:* hold jump to float down slowly
4. **Rex** — green shell, red hair, horns — *Ground Pound:* press down in mid-air to
   slam and wipe out nearby enemies

Character select shows a sprite preview card + ability label. (Rename freely — these
are original characters, not licensed ones.)

## Core gameplay
Side-scrolling platformer: gravity, camera scroll, platforms, pits, enemies, coins,
checkpoint doors, end-of-level flag. Lives (start 3, max 5), score, HUD showing
lives / score / timer / world name. **Quit-to-Menu button always visible in the HUD.**

## Level length & difficulty scaling
Vocab lists are long, so levels must be long and varied. Implement both:
1. **Teacher-set level duration:** per-world setting of 2 / 3 / 5 minutes (default 3).
   Drives the countdown timer. HUD color states (green → yellow → red pulse).
   +10 points per remaining second on completion. Hitting zero costs a life.
2. **Per-world scene variety and escalating difficulty:** each world is visually
   distinct and harder than the last — more enemies, more gaps, more complex
   platforming, faster enemies as world number rises. Level width, coin count, and
   enemy count scale with the selected duration so a 5-minute level is genuinely
   bigger, not just a longer clock.

Coins are seeded from the active world's vocab list and cycle through it.

## Quiz mechanics (the educational core)
- **Coin Quiz:** touching any coin opens an overlay: definition prompt + 4 term
  options. Correct = +15 and collected. Wrong = -10, coin bounces away, brief
  invulnerability so it can't instantly re-trigger. HUD formats negative scores cleanly.
- **Enemy encounter:** collision opens a definition-match overlay. Correct defeats the
  enemy; wrong costs a life.
- **Checkpoint quiz doors:** mid-level doors requiring a correct answer to pass.
- **End-of-level quiz (5 questions, targeted review):** serve the player's **missed
  terms from that run first**. If fewer than 5 missed, fill with random terms from
  that world. If none missed, all 5 random.
- **Boss battle (World 7):** animated dragon with HP bar near the flag. 3 sequential
  questions — each correct removes 1 HP, each wrong costs a life. Defeat = +1500
  points, then walk to the goal.
- **Wrong Answers Review:** every wrong answer (coin, enemy, door, boss) accumulates
  in app state. Game Over / level-complete shows a "Review Missed Terms" button (only
  when wrongs occurred) opening a scrollable list of each missed term + definition.

## Power-ups
- Mushroom — +1 life (cap 5)
- Star — ~8 seconds invincibility
- Yoshi-style egg mount — 1.5x speed + absorbs one hit

## Menu (single play mode)
Tagline: "Anatomy and Physiology Edition" / "Collect as many coins as you can.
Highest score wins!"

**One play mode only:** pick a world from a dropdown → pick a character → play.
No Adventure/Review toggle. Dropdown lists all 7 built-in worlds plus any custom or
classroom-code worlds (custom marked with a star). Menu also has: settings (music/SFX
volume), local leaderboard, Teacher Mode button, "Join with Classroom Code".

## Teacher Mode
Purple "Teacher Mode · Custom Vocab" button opens a builder targeting **any world,
built-in or custom**:
- Select an existing world to edit, or create a new custom world.
- Paste vocab as "Term - Definition" lines. Parser accepts `-`, `:`, `|`, en-dash, and
  em-dash as separators. Also accept CSV paste (term,definition per line).
- Per-world level duration setting (2 / 3 / 5 min).
- **Every saved world has EDIT and DELETE buttons.** Edit reopens the builder
  pre-filled with current name, duration, and full term list; saving updates in place.
  Editing a built-in replaces its sample terms; provide "Reset to defaults" for built-ins.
- Persist to localStorage key `anatomia_custom_worlds_v1`.

## Classroom Code (backend)
- "Publish with Classroom Code" sends the world (name, theme/enemy, duration, vocab)
  to the backend, which returns a **6-letter code**. Display it large and copyable.
- Students enter **code + nickname** on the menu → app fetches the world and adds it
  to their dropdown.
- **Per-code leaderboard:** after each run of a classroom world, score posts under that
  nickname. Show the leaderboard right after the run and from the menu. Keep only each
  nickname's **best** score per code. Sort descending, highlight current player.
- Republishing an edited world under the same code updates vocab for everyone.

### API
- `POST /api/worlds` → body: world object → returns `{ code }`
- `GET /api/worlds/{code}` → returns world object
- `PUT /api/worlds/{code}` → update existing published world
- `POST /api/scores/{code}` → body: `{ nickname, score }` → upserts best score
- `GET /api/scores/{code}` → returns leaderboard sorted desc

## Mobile
- On-screen D-pad + JUMP + POUND, auto-shown on touch devices, hidden on desktop.
- **One-time mobile landing splash** on touch devices: mobile-first welcome screen with
  a large visual hint showing the touch controls. Shown once, remembered in localStorage.

## Audio
- **Chiptune via Web Audio API:** ~170 BPM, 6 distinct 16-note sections (A–F) — square
  lead, triangle harmony, sawtooth bass, kick+snare — sequenced non-consecutively so it
  never feels like a short loop.
- Retro 8-bit SFX: jump, coin, correct, wrong, power-up, enemy defeat, death, level complete.
- **Custom music upload:** Settings file picker accepts MP3/OGG. Uploaded tracks loop as
  background music via blob URL `<audio loop>`, replacing synth music, with a toggle back
  to built-in chiptune. Persist the choice.

## Game Over / Level Complete
Score summary, time-bonus breakdown, Review Missed Terms (when applicable), Play Again,
Quit to Menu, and the per-code leaderboard when playing a classroom world.
**Shareable Score Card:** "Download Score Card" renders a stylized canvas-generated PNG
(logo, character sprite, world name, score, date) and downloads it.

---

# BUILD PHASES — stop at each checkpoint

**Phase 0 — Scaffold.** Vite + React frontend, FastAPI backend, docker-compose for Mongo.
Both run, hello world both ends.
✅ Checkpoint: `npm run dev` and the API health endpoint both respond.

**Phase 1 — Game core, no content.** Canvas, game loop mounted once, physics constants
above, variable-height jump, camera scroll, platforms, pits, one placeholder enemy, coins
as plain collectibles. Rectangles are fine — no art yet.
✅ Checkpoint: I play it and confirm the motion feels smooth, not choppy. **Do not
proceed until I say the feel is right.**

**Phase 2 — Sprites.** Create `game/spriteRenderer.js`. Draw the 4 characters and their
abilities, plus the goomba-style enemy. Character select screen.
✅ Checkpoint: all 4 characters render distinctly and each ability works.

**Phase 3 — Vocab + quiz overlays.** Vocab data model, coin quiz, enemy encounter,
checkpoint door, end-of-level quiz with missed-terms-first logic, wrong-answer tracking,
Review Missed Terms.
✅ Checkpoint: a full level is playable end to end with real questions.

**Phase 4 — Worlds.** All 7 themed shells with sample terms, per-world enemy sprites,
difficulty scaling, timer + time bonus, Quit-to-Menu.
✅ Checkpoint: every world loads, looks distinct, and gets harder.

**Phase 5 — Power-ups + boss.** Mushroom, star, egg mount. World 7 dragon with HP bar.
✅ Checkpoint: boss beatable, power-ups all work.

**Phase 6 — Teacher Mode.** Builder, parser (all separators + CSV), edit/delete, duration
setting, reset-to-defaults, localStorage.
✅ Checkpoint: I paste a real vocab list into a built-in world and play it.

**Phase 7 — Classroom Code.** Backend endpoints, publish flow, join flow, per-code
leaderboard with best-score-per-nickname.
✅ Checkpoint: publish from one browser, join from another, scores roll up.

**Phase 8 — Polish.** Mobile controls + splash, audio (chiptune + MP3 upload), score card
PNG, local leaderboard, settings.
✅ Checkpoint: works on a phone.
