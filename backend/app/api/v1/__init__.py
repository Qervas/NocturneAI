"""
API v1 - Core System Routes
Lightweight, essential system functionality
"""

from fastapi import APIRouter

# Create v1 router
router = APIRouter(prefix="/api/v1", tags=["core-v1"])

# Import route modules
from . import system, messages

# Include sub-routers
router.include_router(system.router)
router.include_router(messages.router) 