import os
from datetime import datetime, timezone

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from codes import unique_code
from db import scores_collection, term_stats_collection, worlds_collection
from models import ScoreEntry, ScoreSubmitRequest, TermMissStat, WorldPayload, WorldPublishResponse

app = FastAPI(title="Super Anatomy Bros API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded classroom music lives on disk, served back out at /media/<code>.mp3
# — one fixed filename per code, so a re-upload just overwrites in place.
UPLOAD_DIR = "uploads"
MAX_MUSIC_BYTES = 8 * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")


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
    doc = await worlds_collection.find_one({"code": code.upper()})
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

    dest = os.path.join(UPLOAD_DIR, f"{code}.mp3")
    with open(dest, "wb") as f:
        f.write(body)

    music_url = f"/media/{code}.mp3"
    await worlds_collection.update_one({"code": code}, {"$set": {"musicUrl": music_url}})
    return {"musicUrl": music_url}


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
