"""
Distributed Router System - Intelligence Empire
Smart routing system that distributes requests based on workload and resource requirements
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.routing import APIRouter
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
import time
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ServiceType(Enum):
    """Different types of services with different resource requirements"""
    LIGHTWEIGHT = "lightweight"      # Quick operations (status, simple queries)
    COMPUTE_INTENSIVE = "compute"     # AI processing, complex analysis
    DATABASE_HEAVY = "database"      # Complex queries, bulk operations
    REAL_TIME = "realtime"           # Live updates, websockets
    BACKGROUND = "background"        # Async tasks, scheduled jobs

@dataclass
class ServiceConfig:
    """Configuration for each service type"""
    service_type: ServiceType
    max_concurrent: int
    timeout_seconds: int
    priority: int  # 1 = highest, 5 = lowest
    resource_weight: float  # Relative resource usage

# Service configurations
SERVICE_CONFIGS = {
    ServiceType.LIGHTWEIGHT: ServiceConfig(
        service_type=ServiceType.LIGHTWEIGHT,
        max_concurrent=50,
        timeout_seconds=5,
        priority=1,
        resource_weight=0.1
    ),
    ServiceType.COMPUTE_INTENSIVE: ServiceConfig(
        service_type=ServiceType.COMPUTE_INTENSIVE,
        max_concurrent=5,  # Limit AI processing
        timeout_seconds=60,
        priority=3,
        resource_weight=1.0
    ),
    ServiceType.DATABASE_HEAVY: ServiceConfig(
        service_type=ServiceType.DATABASE_HEAVY,
        max_concurrent=20,
        timeout_seconds=30,
        priority=2,
        resource_weight=0.5
    ),
    ServiceType.REAL_TIME: ServiceConfig(
        service_type=ServiceType.REAL_TIME,
        max_concurrent=100,
        timeout_seconds=10,
        priority=1,
        resource_weight=0.2
    ),
    ServiceType.BACKGROUND: ServiceConfig(
        service_type=ServiceType.BACKGROUND,
        max_concurrent=10,
        timeout_seconds=300,
        priority=5,
        resource_weight=0.3
    )
}

class RequestTracker:
    """Track active requests and system load"""
    
    def __init__(self):
        self.active_requests: Dict[ServiceType, int] = {
            service_type: 0 for service_type in ServiceType
        }
        self.request_history: List[Dict] = []
        self.system_load = 0.0
        
    def can_accept_request(self, service_type: ServiceType) -> bool:
        """Check if system can accept new request of this type"""
        config = SERVICE_CONFIGS[service_type]
        current_load = self.active_requests[service_type]
        
        # Check concurrent limit
        if current_load >= config.max_concurrent:
            return False
            
        # Check overall system load
        total_weight = sum(
            self.active_requests[st] * SERVICE_CONFIGS[st].resource_weight 
            for st in ServiceType
        )
        
        # Don't accept new heavy requests if system is overloaded
        if total_weight > 3.0 and config.resource_weight > 0.5:
            return False
            
        return True
    
    def start_request(self, service_type: ServiceType, request_id: str):
        """Register start of request"""
        self.active_requests[service_type] += 1
        self.request_history.append({
            "request_id": request_id,
            "service_type": service_type.value,
            "action": "start",
            "timestamp": datetime.now().isoformat(),
            "active_count": self.active_requests[service_type]
        })
        
    def end_request(self, service_type: ServiceType, request_id: str):
        """Register end of request"""
        if self.active_requests[service_type] > 0:
            self.active_requests[service_type] -= 1
            
        self.request_history.append({
            "request_id": request_id,
            "service_type": service_type.value,
            "action": "end",
            "timestamp": datetime.now().isoformat(),
            "active_count": self.active_requests[service_type]
        })
        
        # Keep only recent history
        if len(self.request_history) > 1000:
            self.request_history = self.request_history[-500:]
    
    def get_system_status(self) -> Dict:
        """Get current system status"""
        total_requests = sum(self.active_requests.values())
        total_weight = sum(
            self.active_requests[st] * SERVICE_CONFIGS[st].resource_weight 
            for st in ServiceType
        )
        
        return {
            "total_active_requests": total_requests,
            "system_load": total_weight,
            "service_breakdown": {
                st.value: {
                    "active": self.active_requests[st],
                    "max_concurrent": SERVICE_CONFIGS[st].max_concurrent,
                    "utilization": self.active_requests[st] / SERVICE_CONFIGS[st].max_concurrent
                }
                for st in ServiceType
            },
            "can_accept_new": {
                st.value: self.can_accept_request(st) for st in ServiceType
            }
        }

# Global request tracker
request_tracker = RequestTracker()

class DistributedRouter:
    """Smart router that distributes requests based on service type and load"""
    
    def __init__(self):
        self.routers: Dict[ServiceType, APIRouter] = {}
        self.route_mappings: Dict[str, ServiceType] = {}
        self.middleware_handlers: List[Callable] = []
        
    def create_service_router(self, service_type: ServiceType, prefix: str = "") -> APIRouter:
        """Create a router for a specific service type"""
        router = APIRouter(
            prefix=prefix,
            tags=[f"{service_type.value}-service"]
        )
        
        # Add load balancing middleware
        @router.middleware("http")
        async def load_balancer(request: Request, call_next):
            request_id = str(uuid.uuid4())
            
            # Check if we can accept this request
            if not request_tracker.can_accept_request(service_type):
                logger.warning(f"Request rejected due to load: {service_type.value}")
                raise HTTPException(
                    status_code=503, 
                    detail=f"Service temporarily unavailable - {service_type.value} overloaded"
                )
            
            # Track request
            request_tracker.start_request(service_type, request_id)
            start_time = time.time()
            
            try:
                # Process request with timeout
                config = SERVICE_CONFIGS[service_type]
                response = await asyncio.wait_for(
                    call_next(request),
                    timeout=config.timeout_seconds
                )
                
                # Log successful request
                duration = time.time() - start_time
                logger.info(f"✅ {service_type.value} request completed in {duration:.2f}s")
                
                return response
                
            except asyncio.TimeoutError:
                logger.error(f"⏰ {service_type.value} request timed out after {config.timeout_seconds}s")
                raise HTTPException(status_code=504, detail="Request timeout")
                
            except Exception as e:
                logger.error(f"❌ {service_type.value} request failed: {str(e)}")
                raise
                
            finally:
                request_tracker.end_request(service_type, request_id)
        
        self.routers[service_type] = router
        return router
    
    def get_router(self, service_type: ServiceType) -> APIRouter:
        """Get router for service type"""
        if service_type not in self.routers:
            return self.create_service_router(service_type)
        return self.routers[service_type]
    
    def register_route_mapping(self, path_pattern: str, service_type: ServiceType):
        """Register which service type handles which paths"""
        self.route_mappings[path_pattern] = service_type
    
    def get_system_health(self) -> Dict:
        """Get overall system health"""
        status = request_tracker.get_system_status()
        
        # Determine health level
        system_load = status["system_load"]
        if system_load < 1.0:
            health = "excellent"
        elif system_load < 2.0:
            health = "good"
        elif system_load < 3.0:
            health = "warning"
        else:
            health = "critical"
            
        return {
            "health": health,
            "system_load": system_load,
            "timestamp": datetime.now().isoformat(),
            "service_status": status,
            "recommendations": self._get_recommendations(status)
        }
    
    def _get_recommendations(self, status: Dict) -> List[str]:
        """Get system recommendations based on current load"""
        recommendations = []
        
        for service_type, info in status["service_breakdown"].items():
            utilization = info["utilization"]
            
            if utilization > 0.8:
                recommendations.append(f"Consider scaling {service_type} service - {utilization:.1%} utilization")
            elif utilization > 0.6:
                recommendations.append(f"Monitor {service_type} service - approaching capacity")
        
        system_load = status["system_load"]
        if system_load > 2.5:
            recommendations.append("System under heavy load - consider request queuing")
        elif system_load > 1.5:
            recommendations.append("Moderate system load - monitor performance")
            
        return recommendations

# Global distributed router
distributed_router = DistributedRouter()

# Route mappings for different service types
ROUTE_SERVICE_MAPPING = {
    # Lightweight services
    "/api/v1/status": ServiceType.LIGHTWEIGHT,
    "/api/v1/health": ServiceType.LIGHTWEIGHT,
    "/api/v1/council/members": ServiceType.LIGHTWEIGHT,
    "/api/system/health": ServiceType.LIGHTWEIGHT,
    
    # Compute intensive (AI processing)
    "/api/v1/council/query": ServiceType.COMPUTE_INTENSIVE,
    "/api/enhanced/agent": ServiceType.COMPUTE_INTENSIVE,
    "/autonomous/agent": ServiceType.COMPUTE_INTENSIVE,
    
    # Database heavy
    "/api/v1/channels": ServiceType.DATABASE_HEAVY,
    "/api/v1/conversations": ServiceType.DATABASE_HEAVY,
    "/api/v1/messages": ServiceType.DATABASE_HEAVY,
    
    # Real-time services
    "/api/agents/network": ServiceType.REAL_TIME,
    "/api/agents/collaboration": ServiceType.REAL_TIME,
    
    # Background services
    "/api/agents/autonomous": ServiceType.BACKGROUND,
    "/api/agents/strategic": ServiceType.BACKGROUND
}

# Register route mappings
for path, service_type in ROUTE_SERVICE_MAPPING.items():
    distributed_router.register_route_mapping(path, service_type)

def setup_distributed_routing(app: FastAPI):
    """Setup distributed routing for the FastAPI app"""
    
    # Create service-specific routers
    lightweight_router = distributed_router.create_service_router(ServiceType.LIGHTWEIGHT, "/api/system")
    compute_router = distributed_router.create_service_router(ServiceType.COMPUTE_INTENSIVE, "/api/ai")
    database_router = distributed_router.create_service_router(ServiceType.DATABASE_HEAVY, "/api/data")
    realtime_router = distributed_router.create_service_router(ServiceType.REAL_TIME, "/api/live")
    background_router = distributed_router.create_service_router(ServiceType.BACKGROUND, "/api/async")
    
    # Add system monitoring endpoints
    @lightweight_router.get("/health")
    async def system_health():
        """Get distributed system health"""
        return distributed_router.get_system_health()
    
    @lightweight_router.get("/load")
    async def system_load():
        """Get current system load"""
        return request_tracker.get_system_status()
    
    @lightweight_router.get("/routes")
    async def route_info():
        """Get route distribution information"""
        return {
            "service_types": [st.value for st in ServiceType],
            "route_mappings": {
                path: service_type.value 
                for path, service_type in distributed_router.route_mappings.items()
            },
            "service_configs": {
                st.value: {
                    "max_concurrent": config.max_concurrent,
                    "timeout_seconds": config.timeout_seconds,
                    "priority": config.priority,
                    "resource_weight": config.resource_weight
                }
                for st, config in SERVICE_CONFIGS.items()
            }
        }
    
    # Include all routers
    app.include_router(lightweight_router)
    app.include_router(compute_router)
    app.include_router(database_router)
    app.include_router(realtime_router)
    app.include_router(background_router)
    
    return distributed_router 