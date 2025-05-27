"""
Agent capabilities for NocturneAI.

This package contains the modular capabilities that can be
attached to agents to provide various functionalities.
"""

from .base import (
    Capability,
    ThinkingCapability,
    CommunicationCapability,
    ToolUseCapability,
    MemoryCapability,
    ReflectionCapability,
    PlanningCapability,
    CodeCapability,
    ResearchCapability,
    ExpertiseCapability,
    CollaborationCapability
)

from .collaboration import (
    TeamCoordination,
    ConsensusBuilding
)

from .expertise import (
    DomainExpertise,
    MultiDomainExpertise
)

__all__ = [
    'Capability',
    'ThinkingCapability',
    'CommunicationCapability',
    'ToolUseCapability',
    'MemoryCapability',
    'ReflectionCapability',
    'PlanningCapability',
    'CodeCapability',
    'ResearchCapability',
    'ExpertiseCapability',
    'CollaborationCapability',
    'TeamCoordination',
    'ConsensusBuilding',
    'DomainExpertise',
    'MultiDomainExpertise'
]
