from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from codes import unique_code
from db import scores_collection, worlds_collection
from models import ScoreEntry, ScoreSubmitRequest, WorldPayload, WorldPublishResponse

app = FastAPI(title="Super Anatomy Bros API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return {"status": "ok"}


@app.get("/api/scores/{code}", response_model=list[ScoreEntry])
async def get_leaderboard(code: str):
    code = code.upper()
    cursor = scores_collection.find({"code": code}).sort("score", -1)
    entries = [ScoreEntry(nickname=doc["nickname"], score=doc["score"]) async for doc in cursor]
    return entries
