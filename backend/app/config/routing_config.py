"""
Routing Configuration for Distributed Architecture
Defines service categories and load balancing rules
"""

from dataclasses import dataclass
from typing import Dict, List
from enum import Enum

class ServiceCategory(Enum):
    """Service categories for distributing load"""
    CORE = "core"           # System status, health, lightweight ops
    AI_PROCESSING = "ai"    # AI queries, council processing
    DATA_OPS = "data"       # Database operations, search
    AGENT_SERVICES = "agents"  # Agent collaboration, autonomous
    MONITORING = "monitoring"  # System monitoring, analytics

@dataclass
class ServiceConfig:
    """Configuration for each service category"""
    category: ServiceCategory
    max_concurrent: int     # Maximum concurrent requests
    timeout_seconds: int    # Request timeout
    prefix: str            # URL prefix
    description: str       # Service description
    priority: int          # 1=highest, 5=lowest

# Service configurations
SERVICE_CONFIGS = {
    ServiceCategory.CORE: ServiceConfig(
        category=ServiceCategory.CORE,
        max_concurrent=100,
        timeout_seconds=10,
        prefix="/api/v1",
        description="Core system functionality",
        priority=1
    ),
    ServiceCategory.AI_PROCESSING: ServiceConfig(
        category=ServiceCategory.AI_PROCESSING,
        max_concurrent=5,  # Limit AI processing to prevent overload
        timeout_seconds=60,
        prefix="/api/ai",
        description="AI processing and intelligence operations",
        priority=2
    ),
    ServiceCategory.DATA_OPS: ServiceConfig(
        category=ServiceCategory.DATA_OPS,
        max_concurrent=30,
        timeout_seconds=30,
        prefix="/api/data",
        description="Database and data operations",
        priority=2
    ),
    ServiceCategory.AGENT_SERVICES: ServiceConfig(
        category=ServiceCategory.AGENT_SERVICES,
        max_concurrent=15,
        timeout_seconds=45,
        prefix="/api/agents",
        description="Agent collaboration and autonomous operations",
        priority=3
    ),
    ServiceCategory.MONITORING: ServiceConfig(
        category=ServiceCategory.MONITORING,
        max_concurrent=50,
        timeout_seconds=5,
        prefix="/api/system",
        description="System monitoring and health checks",
        priority=1
    )
}

# Route mappings - which endpoints go to which service category
ROUTE_MAPPINGS = {
    # Core services (lightweight, high priority)
    "/api/v1/status": ServiceCategory.CORE,
    "/api/v1/health": ServiceCategory.CORE,
    "/api/v1/council/members": ServiceCategory.CORE,
    "/api/v1/ollama/status": ServiceCategory.CORE,
    
    # AI processing (resource intensive, limited concurrency)
    "/api/v1/council/query": ServiceCategory.AI_PROCESSING,
    "/api/enhanced": ServiceCategory.AI_PROCESSING,
    "/api/living": ServiceCategory.AI_PROCESSING,
    
    # Data operations (database heavy)
    "/api/v1/channels": ServiceCategory.DATA_OPS,
    "/api/v1/conversations": ServiceCategory.DATA_OPS,
    "/api/v1/messages": ServiceCategory.DATA_OPS,
    
    # Agent services (complex operations)
    "/api/agents/autonomous": ServiceCategory.AGENT_SERVICES,
    "/api/agents/collaboration": ServiceCategory.AGENT_SERVICES,
    "/api/agents/network": ServiceCategory.AGENT_SERVICES,
    "/api/strategic": ServiceCategory.AGENT_SERVICES,
    
    # Monitoring (system health)
    "/api/system": ServiceCategory.MONITORING,
}

def get_service_category(path: str) -> ServiceCategory:
    """Determine service category for a request path"""
    # Check exact matches first
    if path in ROUTE_MAPPINGS:
        return ROUTE_MAPPINGS[path]
    
    # Check prefix matches
    for route_prefix, category in ROUTE_MAPPINGS.items():
        if path.startswith(route_prefix):
            return category
    
    # Default to core for unknown routes
    return ServiceCategory.CORE

def get_load_balancing_config() -> Dict:
    """Get load balancing configuration"""
    return {
        "service_configs": {
            cat.value: {
                "max_concurrent": config.max_concurrent,
                "timeout_seconds": config.timeout_seconds,
                "prefix": config.prefix,
                "description": config.description,
                "priority": config.priority
            }
            for cat, config in SERVICE_CONFIGS.items()
        },
        "route_mappings": {
            path: category.value 
            for path, category in ROUTE_MAPPINGS.items()
        }
    }

# Recommended route organization
RECOMMENDED_ROUTE_STRUCTURE = {
    "core_routes": [
        "GET /api/v1/status",
        "GET /api/v1/health", 
        "GET /api/v1/council/members",
        "GET /api/v1/ollama/status"
    ],
    "ai_routes": [
        "POST /api/v1/council/query",
        "POST /api/ai/enhanced/*",
        "POST /api/living/*"
    ],
    "data_routes": [
        "GET /api/v1/channels/{type}/{id}/messages",
        "POST /api/v1/messages",
        "GET /api/v1/conversations/search"
    ],
    "agent_routes": [
        "POST /api/agents/autonomous/*",
        "POST /api/agents/collaboration/*",
        "GET /api/agents/network/*"
    ],
    "monitoring_routes": [
        "GET /api/system/health",
        "GET /api/system/load",
        "GET /api/system/routes"
    ]
} 