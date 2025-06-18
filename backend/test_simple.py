#!/usr/bin/env python3

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn

app = FastAPI(title="Simple Test API")

class SimpleRequest(BaseModel):
    message: str
    requested_members: Optional[List[str]] = None
    interaction_mode: Optional[str] = "casual_chat"

class SimpleResponse(BaseModel):
    success: bool
    response: Optional[Dict] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"status": "Simple test API is running"}

@app.post("/api/v1/council/query")
async def simple_query(request: SimpleRequest):
    """Simple test endpoint without WebSocket or AI complexity"""
    try:
        # Simulate Sarah's response
        if request.requested_members and "sarah" in [m.lower() for m in request.requested_members]:
            response_data = {
                "query": request.message,
                "council_responses": [{
                    "member_name": "Sarah",
                    "role": "product_strategy",
                    "message": f"Hey! 👋 Nice to hear from you! {request.message} sounds interesting. From a product perspective, I think there's definitely potential here. What specific aspects are you curious about?",
                    "confidence_level": 0.8,
                    "reasoning": "Casual chat mode response",
                    "suggested_actions": [],
                    "timestamp": "2025-06-15T17:00:00Z"
                }],
                "synthesis": f"Hey! 👋 Nice to hear from you! {request.message} sounds interesting. From a product perspective, I think there's definitely potential here. What specific aspects are you curious about?",
                "recommended_actions": [],
                "confidence_score": 0.8,
                "processing_time": 0.1,
                "timestamp": "2025-06-15T17:00:00Z"
            }
            
            return SimpleResponse(success=True, response=response_data)
        else:
            return SimpleResponse(success=False, error="No valid members specified")
            
    except Exception as e:
        return SimpleResponse(success=False, error=f"Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 