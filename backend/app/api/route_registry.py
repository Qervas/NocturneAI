"""
Route Registry - Distributed Route Management
Organizes routes by service type and provides load balancing
"""

from fastapi import FastAPI, APIRouter, Request, HTTPException
from typing import Dict, List, Optional
from enum import Enum
import asyncio
import time
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class ServiceCategory(Enum):
    """Service categories for route organization"""
    CORE = "core"                    # Essential system functions
    AI_PROCESSING = "ai"             # AI/ML heavy operations  
    DATA_OPERATIONS = "data"         # Database operations
    AGENT_SERVICES = "agents"        # Agent-specific functionality
    MONITORING = "monitoring"        # System monitoring & health

@dataclass
class RouteConfig:
    """Configuration for route groups"""
    category: ServiceCategory
    prefix: str
    max_concurrent: int
    timeout_seconds: int
    description: str

# Route configurations
ROUTE_CONFIGS = {
    ServiceCategory.CORE: RouteConfig(
        category=ServiceCategory.CORE,
        prefix="/api/v1",
        max_concurrent=100,
        timeout_seconds=10,
        description="Core system functionality"
    ),
    ServiceCategory.AI_PROCESSING: RouteConfig(
        category=ServiceCategory.AI_PROCESSING,
        prefix="/api/ai",
        max_concurrent=5,  # Limit AI processing
        timeout_seconds=60,
        description="AI processing and intelligence operations"
    ),
    ServiceCategory.DATA_OPERATIONS: RouteConfig(
        category=ServiceCategory.DATA_OPERATIONS,
        prefix="/api/data",
        max_concurrent=20,
        timeout_seconds=30,
        description="Database and data operations"
    ),
    ServiceCategory.AGENT_SERVICES: RouteConfig(
        category=ServiceCategory.AGENT_SERVICES,
        prefix="/api/agents",
        max_concurrent=15,
        timeout_seconds=45,
        description="Agent collaboration and autonomous operations"
    ),
    ServiceCategory.MONITORING: RouteConfig(
        category=ServiceCategory.MONITORING,
        prefix="/api/system",
        max_concurrent=50,
        timeout_seconds=5,
        description="System monitoring and health checks"
    )
}

class LoadTracker:
    """Track request load per service category"""
    
    def __init__(self):
        self.active_requests: Dict[ServiceCategory, int] = {
            cat: 0 for cat in ServiceCategory
        }
        self.total_requests: Dict[ServiceCategory, int] = {
            cat: 0 for cat in ServiceCategory
        }
    
    def can_accept(self, category: ServiceCategory) -> bool:
        """Check if we can accept new request"""
        config = ROUTE_CONFIGS[category]
        return self.active_requests[category] < config.max_concurrent
    
    def start_request(self, category: ServiceCategory):
        """Track request start"""
        self.active_requests[category] += 1
        self.total_requests[category] += 1
    
    def end_request(self, category: ServiceCategory):
        """Track request end"""
        if self.active_requests[category] > 0:
            self.active_requests[category] -= 1
    
    def get_status(self) -> Dict:
        """Get current load status"""
        return {
            "active_requests": {cat.value: count for cat, count in self.active_requests.items()},
            "total_requests": {cat.value: count for cat, count in self.total_requests.items()},
            "utilization": {
                cat.value: {
                    "active": self.active_requests[cat],
                    "max": ROUTE_CONFIGS[cat].max_concurrent,
                    "percent": (self.active_requests[cat] / ROUTE_CONFIGS[cat].max_concurrent) * 100
                }
                for cat in ServiceCategory
            }
        }

# Global load tracker
load_tracker = LoadTracker()

class RouteRegistry:
    """Registry for organizing and managing routes"""
    
    def __init__(self):
        self.routers: Dict[ServiceCategory, APIRouter] = {}
        self.route_mappings: Dict[str, ServiceCategory] = {}
    
    def create_router(self, category: ServiceCategory) -> APIRouter:
        """Create router for service category"""
        config = ROUTE_CONFIGS[category]
        
        router = APIRouter(
            prefix=config.prefix,
            tags=[f"{category.value}-service"]
        )
        
        # Add load balancing middleware
        @router.middleware("http")
        async def load_balancer(request: Request, call_next):
            # Check capacity
            if not load_tracker.can_accept(category):
                logger.warning(f"Request rejected - {category.value} at capacity")
                raise HTTPException(
                    status_code=503,
                    detail=f"{category.value} service at capacity"
                )
            
            # Track request
            load_tracker.start_request(category)
            start_time = time.time()
            
            try:
                # Process with timeout
                response = await asyncio.wait_for(
                    call_next(request),
                    timeout=config.timeout_seconds
                )
                
                duration = time.time() - start_time
                logger.info(f"✅ {category.value} request: {duration:.2f}s")
                
                return response
                
            except asyncio.TimeoutError:
                logger.error(f"⏰ {category.value} timeout after {config.timeout_seconds}s")
                raise HTTPException(status_code=504, detail="Request timeout")
                
            finally:
                load_tracker.end_request(category)
        
        self.routers[category] = router
        return router
    
    def get_router(self, category: ServiceCategory) -> APIRouter:
        """Get or create router for category"""
        if category not in self.routers:
            self.create_router(category)
        return self.routers[category]
    
    def register_all_routers(self, app: FastAPI):
        """Register all routers with the FastAPI app"""
        
        # Create routers for each category
        for category in ServiceCategory:
            router = self.get_router(category)
            app.include_router(router)
        
        # Add system monitoring endpoints
        system_router = self.get_router(ServiceCategory.MONITORING)
        
        @system_router.get("/health")
        async def system_health():
            """System health check"""
            status = load_tracker.get_status()
            
            # Determine overall health
            total_active = sum(status["active_requests"].values())
            high_utilization = any(
                util["percent"] > 80 
                for util in status["utilization"].values()
            )
            
            health = "critical" if high_utilization else "good" if total_active > 20 else "excellent"
            
            return {
                "health": health,
                "load_status": status,
                "route_configs": {
                    cat.value: {
                        "prefix": config.prefix,
                        "max_concurrent": config.max_concurrent,
                        "timeout": config.timeout_seconds,
                        "description": config.description
                    }
                    for cat, config in ROUTE_CONFIGS.items()
                }
            }
        
        @system_router.get("/routes")
        async def route_info():
            """Get route organization info"""
            return {
                "categories": [cat.value for cat in ServiceCategory],
                "configs": {
                    cat.value: {
                        "prefix": config.prefix,
                        "description": config.description,
                        "max_concurrent": config.max_concurrent
                    }
                    for cat, config in ROUTE_CONFIGS.items()
                }
            }

# Global route registry
route_registry = RouteRegistry()

def setup_distributed_routes(app: FastAPI):
    """Setup distributed routing system"""
    route_registry.register_all_routers(app)
    return route_registry 