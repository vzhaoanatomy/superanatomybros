from pydantic import BaseModel, Field


class VocabTerm(BaseModel):
    id: str
    term: str
    definition: str


class Palette(BaseModel):
    sky: str
    hills: str
    ground: str
    platform: str
    accent: str


# Body for both POST /api/worlds (publish) and PUT /api/worlds/{code}
# (republish) — matches the shape the frontend's custom worlds already have.
class WorldPayload(BaseModel):
    name: str
    subtitle: str = ""
    enemyType: str
    palette: Palette
    defaultDurationMinutes: int
    # "quick" (short prompt) or "scenario" (longer case-note prompt) — both
    # are 4-choice. See the frontend's WorldBuilderForm.jsx / vocab.js
    # buildQuestion.
    questionStyle: str = "quick"
    vocab: list[VocabTerm]


class WorldPublishResponse(BaseModel):
    code: str


# nickname is the only identifying field ever collected — no accounts, no PII.
class ScoreSubmitRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=24)
    score: int
    missedTermIds: list[str] = []
    correctTermIds: list[str] = []
    correctCount: int = 0
    wrongCount: int = 0
    # Longest consecutive-correct run this attempt reached (see
    # GameCanvas.jsx's answerStreak) — powers the teacher's "Biggest
    # Streak" callout in StudentAttemptsPanel.
    bestStreak: int = 0


class ScoreEntry(BaseModel):
    nickname: str
    score: int


# Aggregated across every run submitted for a classroom code, not just the
# best one — this is "which terms trip the class up," not a per-student stat.
class TermMissStat(BaseModel):
    termId: str
    missCount: int


# One per submitted run (inserted, never upserted) — unlike ScoreEntry above
# (which only keeps a student's best score), this is the full replay history:
# who played, when, their score for that specific attempt, and which terms
# they got right/wrong on it.
class AttemptEntry(BaseModel):
    nickname: str
    score: int
    correctCount: int
    wrongCount: int
    correctTermIds: list[str]
    missedTermIds: list[str]
    submittedAt: str
    bestStreak: int = 0
