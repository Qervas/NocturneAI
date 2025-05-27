"""
NocturneAI - Agent Framework

A modular, composable agent architecture that supports dynamic capability integration 
and agent construction at runtime.
"""

from .core.agent import Agent
from .core.registry import AgentRegistry
from .core.factory import AgentFactory
from .core.types import AgentRole, AgentCapability, MessageType

__all__ = [
    'Agent',
    'AgentRegistry',
    'AgentFactory', 
    'AgentRole',
    'AgentCapability',
    'MessageType'
]
