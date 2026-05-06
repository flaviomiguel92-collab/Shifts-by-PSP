#!/usr/bin/env python3
"""
Direct MongoDB cleanup script - deletes all shifts, cycles, occurrences, and gratifications
Usage: MONGO_URL=<your_mongo_url> python cleanup_db.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup_all_data():
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("ERROR: MONGO_URL environment variable not set")
        print("Usage: MONGO_URL=<your_mongo_url> python cleanup_db.py")
        return False

    try:
        print(f"Connecting to MongoDB: {mongo_url[:50]}...")
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'shiftextra_db')]

        # Test connection
        await db.command("ping")
        print("[OK] Connected to MongoDB")

        # Delete all documents from each collection
        collections = ['shifts', 'cycles', 'occurrences', 'gratifications']
        total_deleted = 0

        for collection_name in collections:
            collection = db[collection_name]
            result = await collection.delete_many({})
            deleted_count = result.deleted_count
            total_deleted += deleted_count
            print(f"[OK] {collection_name}: deleted {deleted_count} documents")

        print(f"\n[OK] Total documents deleted: {total_deleted}")
        print("[OK] Database cleanup complete!")

        client.close()
        return True

    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        return False

if __name__ == '__main__':
    success = asyncio.run(cleanup_all_data())
    exit(0 if success else 1)
