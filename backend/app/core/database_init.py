"""
Database initialization for Intelligence Empire
"""

import asyncio
from app.models.database import engine, Base
from app.models.conversation import Conversation, Message, CouncilResponse, IntelligenceSession

async def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

async def init_database():
    """Initialize the database with tables"""
    try:
        await create_tables()
        return True
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(init_database()) 