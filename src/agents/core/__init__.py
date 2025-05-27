"""
Core components for the NocturneAI agent system.

This package contains the foundational classes and types for the agent system.
"""

from .agent import Agent
from .registry import AgentRegistry
from .factory import AgentFactory
from .types import (
    AgentRole, 
    AgentCapability, 
    MessageType, 
    Message, 
    ThoughtNode, 
    ThoughtEdge,
    ThoughtGraph,
    AgentState
)

__all__ = [
    'Agent',
    'AgentRegistry',
    'AgentFactory',
    'AgentRole',
    'AgentCapability',
    'MessageType',
    'Message',
    'ThoughtNode',
    'ThoughtEdge',
    'ThoughtGraph',
    'AgentState'
]
