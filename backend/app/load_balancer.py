"""
Unified Load Balancer - Intelligence Empire
Manages request distribution across service types with intelligent routing
"""

from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import time
import uuid
import logging

logger = logging.getLogger(__name__)

class ServiceType(Enum):
    """Service types for load balancing"""
    CORE = "core"                    # /api/v1/* - System status, council members
    AI_PROCESSING = "ai"             # /api/ai/* - AI intelligence processing
    DATA_OPERATIONS = "data"         # /api/data/* - Database operations
    AGENT_SERVICES = "agents"        # /api/agents/* - Agent coordination
    MONITORING = "monitoring"        # /api/system/* - System monitoring

@dataclass
class ServiceConfig:
    """Configuration for each service type"""
    service_type: ServiceType
    max_concurrent: int
    timeout_seconds: int
    priority: int  # 1 = highest, 5 = lowest
    resource_weight: float

# Service configurations
SERVICE_CONFIGS = {
    ServiceType.CORE: ServiceConfig(
        service_type=ServiceType.CORE,
        max_concurrent=100,
        timeout_seconds=10,
        priority=1,
        resource_weight=0.1
    ),
    ServiceType.AI_PROCESSING: ServiceConfig(
        service_type=ServiceType.AI_PROCESSING,
        max_concurrent=5,
        timeout_seconds=60,
        priority=2,
        resource_weight=1.0
    ),
    ServiceType.DATA_OPERATIONS: ServiceConfig(
        service_type=ServiceType.DATA_OPERATIONS,
        max_concurrent=20,
        timeout_seconds=30,
        priority=2,
        resource_weight=0.5
    ),
    ServiceType.AGENT_SERVICES: ServiceConfig(
        service_type=ServiceType.AGENT_SERVICES,
        max_concurrent=15,
        timeout_seconds=45,
        priority=3,
        resource_weight=0.7
    ),
    ServiceType.MONITORING: ServiceConfig(
        service_type=ServiceType.MONITORING,
        max_concurrent=50,
        timeout_seconds=5,
        priority=1,
        resource_weight=0.1
    )
}

class LoadBalancer:
    """Unified load balancer for distributed services"""
    
    def __init__(self):
        self.active_requests: Dict[ServiceType, int] = {
            service_type: 0 for service_type in ServiceType
        }
        self.total_requests: Dict[ServiceType, int] = {
            service_type: 0 for service_type in ServiceType
        }
        self.request_history: List[Dict] = []
        self.active_request_ids: Dict[str, ServiceType] = {}
    
    def start_request(self, service_type: ServiceType, path: str) -> str:
        """Start tracking a request"""
        config = SERVICE_CONFIGS[service_type]
        
        # Check if we can accept this request
        if self.active_requests[service_type] >= config.max_concurrent:
            raise Exception(f"Service {service_type.value} at capacity ({config.max_concurrent} concurrent requests)")
        
        # Check overall system load
        total_weight = sum(
            self.active_requests[st] * SERVICE_CONFIGS[st].resource_weight 
            for st in ServiceType
        )
        
        if total_weight > 5.0 and config.resource_weight > 0.5:
            raise Exception(f"System overloaded (load: {total_weight:.1f})")
        
        # Generate request ID and track it
        request_id = str(uuid.uuid4())
        self.active_requests[service_type] += 1
        self.total_requests[service_type] += 1
        self.active_request_ids[request_id] = service_type
        
        # Log the request
        self.request_history.append({
            "request_id": request_id,
            "service_type": service_type.value,
            "path": path,
            "action": "start",
            "timestamp": datetime.now().isoformat(),
            "active_count": self.active_requests[service_type]
        })
        
        # Keep history manageable
        if len(self.request_history) > 1000:
            self.request_history = self.request_history[-500:]
        
        return request_id
    
    def end_request(self, service_type: ServiceType, request_id: str):
        """End tracking a request"""
        if request_id in self.active_request_ids:
            del self.active_request_ids[request_id]
        
        if self.active_requests[service_type] > 0:
            self.active_requests[service_type] -= 1
        
        # Log the completion
        self.request_history.append({
            "request_id": request_id,
            "service_type": service_type.value,
            "action": "end",
            "timestamp": datetime.now().isoformat(),
            "active_count": self.active_requests[service_type]
        })
    
    def get_status(self) -> Dict:
        """Get current load balancer status"""
        total_active = sum(self.active_requests.values())
        total_processed = sum(self.total_requests.values())
        
        return {
            "total_active_requests": total_active,
            "total_processed_requests": total_processed,
            "service_breakdown": {
                service_type.value: {
                    "active": self.active_requests[service_type],
                    "total_processed": self.total_requests[service_type],
                    "max_concurrent": SERVICE_CONFIGS[service_type].max_concurrent,
                    "utilization_percent": round(
                        (self.active_requests[service_type] / SERVICE_CONFIGS[service_type].max_concurrent) * 100, 1
                    )
                }
                for service_type in ServiceType
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def get_health(self) -> str:
        """Get overall system health"""
        total_active = sum(self.active_requests.values())
        
        # Check utilization
        high_utilization = any(
            self.active_requests[st] / SERVICE_CONFIGS[st].max_concurrent > 0.8
            for st in ServiceType
        )
        
        if high_utilization:
            return "critical"
        elif total_active > 30:
            return "warning"
        elif total_active > 10:
            return "good"
        else:
            return "excellent"
    
    def get_service_recommendations(self) -> List[str]:
        """Get recommendations for service optimization"""
        recommendations = []
        
        for service_type, active in self.active_requests.items():
            config = SERVICE_CONFIGS[service_type]
            utilization = active / config.max_concurrent
            
            if utilization > 0.9:
                recommendations.append(f"🔴 {service_type.value} service critically overloaded ({utilization:.0%})")
            elif utilization > 0.7:
                recommendations.append(f"🟡 {service_type.value} service under high load ({utilization:.0%})")
        
        total_active = sum(self.active_requests.values())
        if total_active == 0:
            recommendations.append("✅ All services running optimally")
        elif len(recommendations) == 0:
            recommendations.append("✅ All services within normal parameters")
        
        return recommendations

def get_service_type_from_path(path: str) -> ServiceType:
    """Determine service type from request path"""
    if path.startswith("/api/v1"):
        return ServiceType.CORE
    elif path.startswith("/api/ai"):
        return ServiceType.AI_PROCESSING
    elif path.startswith("/api/data"):
        return ServiceType.DATA_OPERATIONS
    elif path.startswith("/api/agents"):
        return ServiceType.AGENT_SERVICES
    elif path.startswith("/api/living"):
        return ServiceType.AGENT_SERVICES  # Living agents are part of agent services
    elif path.startswith("/api/system"):
        return ServiceType.MONITORING
    else:
        # Default to CORE for unknown paths
        return ServiceType.CORE

# Global load balancer instance
load_balancer = LoadBalancer()
