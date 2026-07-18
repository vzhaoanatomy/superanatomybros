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
    vocab: list[VocabTerm]


class WorldPublishResponse(BaseModel):
    code: str


# nickname is the only identifying field ever collected — no accounts, no PII.
class ScoreSubmitRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=24)
    score: int
    missedTermIds: list[str] = []


class ScoreEntry(BaseModel):
    nickname: str
    score: int


# Aggregated across every run submitted for a classroom code, not just the
# best one — this is "which terms trip the class up," not a per-student stat.
class TermMissStat(BaseModel):
    termId: str
    missCount: int
