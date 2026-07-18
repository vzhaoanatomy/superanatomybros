import random
import string


def generate_code() -> str:
    return "".join(random.choices(string.ascii_uppercase, k=6))


async def unique_code(worlds_collection) -> str:
    # 26^6 possibilities — collisions are astronomically unlikely, this loop
    # is just a safety net rather than something expected to ever iterate.
    while True:
        code = generate_code()
        existing = await worlds_collection.find_one({"code": code})
        if not existing:
            return code
