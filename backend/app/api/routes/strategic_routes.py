"""
Strategic Intelligence API Routes - Phase 3 (Basic Implementation)
"""

from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime

from ...core.strategic.mission_control import MissionControl, AlertPriority
from ...core.strategic.competitive_intelligence import CompetitiveIntelligenceSystem
from ...core.strategic.predictive_analytics import PredictiveAnalyticsSystem

router = APIRouter(prefix="/strategic", tags=["strategic-intelligence"])

# Global instances 
mission_control = MissionControl()
competitive_intel = CompetitiveIntelligenceSystem()
predictive_analytics = PredictiveAnalyticsSystem()

@router.on_event("startup")
async def startup_strategic_systems():
    """Initialize strategic systems"""
    await mission_control.start_monitoring()

@router.get("/mission-control/dashboard")
async def get_mission_control_dashboard():
    """Get mission control dashboard"""
    try:
        dashboard = mission_control.get_mission_control_dashboard()
        return {
            "status": "success",
            "dashboard": dashboard,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/competitive-intelligence/dashboard")
async def get_competitive_dashboard():
    """Get competitive intelligence dashboard"""
    try:
        dashboard = competitive_intel.get_competitive_dashboard()
        return {
            "status": "success",
            "competitive_intelligence": dashboard,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predictive-analytics/dashboard")
async def get_predictive_dashboard():
    """Get predictive analytics dashboard"""
    try:
        dashboard = predictive_analytics.get_predictive_dashboard()
        return {
            "status": "success",
            "predictive_analytics": dashboard,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/competitive-intelligence/analyze-landscape")
async def analyze_competitive_landscape(analysis_request: Dict):
    """Analyze competitive landscape"""
    try:
        market = analysis_request.get('market', 'AI/Technology')
        analysis = await competitive_intel.analyze_competitive_landscape(market)
        
        return {
            "status": "success",
            "analysis": analysis.to_dict(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predictive-analytics/market-timing/{opportunity_id}")
async def analyze_market_timing(opportunity_id: str):
    """Analyze market timing"""
    try:
        timing_analysis = await predictive_analytics.analyze_market_timing(opportunity_id)
        
        return {
            "status": "success",
            "timing_analysis": timing_analysis,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predictive-analytics/detect-patterns")
async def detect_emerging_patterns():
    """Detect emerging patterns"""
    try:
        patterns = await predictive_analytics.detect_emerging_patterns()
        
        return {
            "status": "success",
            "emerging_patterns": [pattern.to_dict() for pattern in patterns],
            "pattern_count": len(patterns),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def strategic_health_check():
    """Health check for strategic systems"""
    try:
        return {
            "status": "healthy",
            "systems": {
                "mission_control": {"status": "operational"},
                "competitive_intelligence": {"status": "operational"},
                "predictive_analytics": {"status": "operational"}
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 