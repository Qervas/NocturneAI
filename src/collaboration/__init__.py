"""
Collaboration module for agent-to-agent communication and cooperation.
"""

from .protocol import AgentMessage, MessageType, MessageStatus, CommunicationProtocol
from .knowledge import KnowledgeGraph, Entity, Relationship
from .tasks import Task, TaskStatus, TaskPriority, TaskRegistry
from .conflict import ConflictResolver, ResolutionStrategy, ConflictType

__all__ = [
    'AgentMessage',
    'MessageType',
    'MessageStatus',
    'CommunicationProtocol',
    'KnowledgeGraph',
    'Entity',
    'Relationship',
    'Task',
    'TaskStatus',
    'TaskPriority',
    'TaskRegistry',
    'ConflictResolver',
    'ResolutionStrategy',
    'ConflictType',
]
