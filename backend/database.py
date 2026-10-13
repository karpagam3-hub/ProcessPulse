"""
ProcessPulse - SQLite Database & Persistence Layer
Stores human validation decisions and persistent process memory.
Persists across server restarts.
"""

import os
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "processpulse.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ValidationDecisionModel(Base):
    """
    Persistent table for human validation decisions and process memory.
    """
    __tablename__ = "validation_decisions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    decision_id = Column(String(64), unique=True, index=True, nullable=False)
    execution_id = Column(String(64), index=True, nullable=False)
    deviation_signature = Column(String(128), index=True, nullable=False)
    machine_id = Column(String(32), index=True, nullable=False)
    shift = Column(String(32), nullable=False)
    product_id = Column(String(32), nullable=False)
    decision = Column(String(64), nullable=False)  # Validate Improvement | Needs Further Investigation | Reject / Correct Deviation
    reviewer = Column(String(128), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


def init_db():
    """Create database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency helper to yield database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize database upon import
init_db()
