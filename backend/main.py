import os
from datetime import datetime, timezone

from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from codes import unique_code
from db import attempts_collection, scores_collection, term_stats_collection, worlds_collection
from models import AttemptEntry, ScoreEntry, ScoreSubmitRequest, TermMissStat, WorldPayload, WorldPublishResponse

app = FastAPI(title="Super Anatomy Bros API")

# Comma-separated list so this can point at a LAN IP (same-network classroom
# use) or a real deployed frontend domain (cloud hosting) without a code
# change — defaults to today's local-dev-only behavior if unset.
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded classroom music is stored as bytes directly in the world's own
# Mongo document (musicData/musicContentType below), not on local disk —
# Render's free tier has no persistent disk, so anything written to disk
# (the old `uploads/<code>.mp3` + StaticFiles mount this replaced) silently
# vanishes on the very next deploy, permanently breaking every classroom's
# uploaded music. Mongo already persists everything else about a world;
# 8MB comfortably fits under Mongo's own 16MB document size limit.
MAX_MUSIC_BYTES = 8 * 1024 * 1024


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/worlds", response_model=WorldPublishResponse)
async def publish_world(payload: WorldPayload):
    code = await unique_code(worlds_collection)
    doc = payload.model_dump()
    doc["code"] = code
    doc["createdAt"] = datetime.now(timezone.utc).isoformat()
    await worlds_collection.insert_one(doc)
    return WorldPublishResponse(code=code)


@app.get("/api/worlds/{code}")
async def get_world(code: str):
    # Excludes musicData: every student joining a world fetches this
    # document, and that field can be up to MAX_MUSIC_BYTES of raw audio —
    # the frontend only ever needs musicUrl (a plain string pointing at the
    # dedicated /music route below), never the bytes themselves here.
    doc = await worlds_collection.find_one({"code": code.upper()}, {"musicData": 0, "musicContentType": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="World not found")
    doc.pop("_id", None)
    return doc


@app.put("/api/worlds/{code}", response_model=WorldPublishResponse)
async def update_world(code: str, payload: WorldPayload):
    code = code.upper()
    existing = await worlds_collection.find_one({"code": code})
    if not existing:
        raise HTTPException(status_code=404, detail="World not found")
    update_doc = payload.model_dump()
    await worlds_collection.update_one({"code": code}, {"$set": update_doc})
    return WorldPublishResponse(code=code)


@app.post("/api/worlds/{code}/music")
async def upload_world_music(code: str, file: UploadFile = File(...)):
    code = code.upper()
    world = await worlds_collection.find_one({"code": code})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")

    is_mp3_type = file.content_type in ("audio/mpeg", "audio/mp3")
    is_mp3_name = (file.filename or "").lower().endswith(".mp3")
    if not (is_mp3_type or is_mp3_name):
        raise HTTPException(status_code=400, detail="Only MP3 files are accepted")

    body = await file.read()
    if len(body) > MAX_MUSIC_BYTES:
        raise HTTPException(status_code=400, detail="File too large (8MB max)")

    # musicUrl is a stable path (no filename/extension in it) — it always
    # points at this same API route, which looks up whatever's currently
    # stored for this code, so a re-upload just needs the $set below and
    # nothing else changes for anyone already holding this URL.
    music_url = f"/api/worlds/{code}/music"
    await worlds_collection.update_one(
        {"code": code},
        {"$set": {"musicUrl": music_url, "musicData": body, "musicContentType": file.content_type or "audio/mpeg"}},
    )
    return {"musicUrl": music_url}


@app.get("/api/worlds/{code}/music")
async def get_world_music(code: str):
    doc = await worlds_collection.find_one({"code": code.upper()}, {"musicData": 1, "musicContentType": 1})
    if not doc or not doc.get("musicData"):
        raise HTTPException(status_code=404, detail="No music uploaded for this world")
    return Response(
        content=bytes(doc["musicData"]),
        media_type=doc.get("musicContentType") or "audio/mpeg",
        # A world's music is only ever replaced by a brand-new upload, and
        # the frontend's <audio src> naturally re-fetches whenever a level
        # switches worlds — safe to cache for a while rather than
        # re-downloading the same bytes on every replay of the same world.
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.post("/api/scores/{code}")
async def submit_score(code: str, payload: ScoreSubmitRequest):
    code = code.upper()
    world = await worlds_collection.find_one({"code": code})
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    nickname = payload.nickname.strip()
    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname required")
    # $max keeps only the best score per (code, nickname) in a single atomic
    # upsert — no read-then-write race.
    await scores_collection.update_one(
        {"code": code, "nickname": nickname},
        {"$max": {"score": payload.score}, "$setOnInsert": {"code": code, "nickname": nickname}},
        upsert=True,
    )
    # Every run's misses count toward the class-wide tally, not just each
    # student's best run — this answers "what's tripping the class up,"
    # a different question than the score leaderboard above.
    for term_id in payload.missedTermIds:
        await term_stats_collection.update_one(
            {"code": code, "termId": term_id},
            {"$inc": {"missCount": 1}},
            upsert=True,
        )
    # Inserted (not upserted) so every replay is kept, not just the best —
    # answers "how did this student do on each specific play," which the
    # $max-based leaderboard above can't, since it only ever keeps one score
    # per nickname.
    await attempts_collection.insert_one(
        {
            "code": code,
            "nickname": nickname,
            "score": payload.score,
            "correctCount": payload.correctCount,
            "wrongCount": payload.wrongCount,
            "correctTermIds": payload.correctTermIds,
            "missedTermIds": payload.missedTermIds,
            "submittedAt": datetime.now(timezone.utc).isoformat(),
            "bestStreak": payload.bestStreak,
        }
    )
    return {"status": "ok"}


@app.get("/api/scores/{code}", response_model=list[ScoreEntry])
async def get_leaderboard(code: str):
    code = code.upper()
    cursor = scores_collection.find({"code": code}).sort("score", -1)
    entries = [ScoreEntry(nickname=doc["nickname"], score=doc["score"]) async for doc in cursor]
    return entries


@app.get("/api/worlds/{code}/missed-terms", response_model=list[TermMissStat])
async def get_missed_terms(code: str):
    code = code.upper()
    cursor = term_stats_collection.find({"code": code}).sort("missCount", -1)
    return [TermMissStat(termId=doc["termId"], missCount=doc["missCount"]) async for doc in cursor]


@app.get("/api/worlds/{code}/attempts", response_model=list[AttemptEntry])
async def get_attempts(code: str):
    code = code.upper()
    # Sorted by nickname then time so every student's plays land together,
    # oldest first, showing their progression across replays.
    cursor = attempts_collection.find({"code": code}).sort([("nickname", 1), ("submittedAt", 1)])
    return [
        AttemptEntry(
            nickname=doc["nickname"],
            score=doc["score"],
            correctCount=doc["correctCount"],
            wrongCount=doc["wrongCount"],
            correctTermIds=doc["correctTermIds"],
            missedTermIds=doc["missedTermIds"],
            submittedAt=doc["submittedAt"],
            bestStreak=doc.get("bestStreak", 0),
        )
        async for doc in cursor
    ]
