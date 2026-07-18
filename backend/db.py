import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "anatomia"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

worlds_collection = db["worlds"]
scores_collection = db["scores"]
term_stats_collection = db["term_stats"]
