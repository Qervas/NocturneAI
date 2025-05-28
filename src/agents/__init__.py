"""
NocturneAI - Agent Framework

A modular, composable agent architecture that supports dynamic capability integration 
and agent construction at runtime.
"""

from .core.modular_agent import ModularAgent
from .core.registry import AgentRegistry
from .core.factory import AgentFactory
from .core.types import AgentRole, AgentCapability, MessageType

__all__ = [
    'ModularAgent',
    'AgentRegistry',
    'AgentFactory', 
    'AgentRole',
    'AgentCapability',
    'MessageType'
]
