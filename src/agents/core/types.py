"""
Core type definitions for the NocturneAI agent system.

This module defines the fundamental types used throughout the agent framework,
including roles, capabilities, and message formats.
"""

from enum import Enum, auto
from typing import Dict, Any, List, Optional, Union, Set, Type
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class AgentRole(str, Enum):
    """Agent roles in the system"""
    ASSISTANT = "assistant"      # General purpose assistant
    PLANNER = "planner"          # Planning and coordination
    RESEARCHER = "researcher"    # Information gathering and research
    EXECUTOR = "executor"        # Task execution (including code generation)
    CRITIC = "critic"            # Evaluation and quality assurance
    TROUBLESHOOTER = "troubleshooter"  # Problem identification and solving
    EXPERT = "expert"            # Domain-specific expertise
    COORDINATOR = "coordinator"  # Multi-agent coordination
    CUSTOM = "custom"            # Custom role with specific capabilities


class AgentCapability(str, Enum):
    """Capabilities that agents can possess"""
    THINKING = "thinking"        # Reasoning and deliberation
    COMMUNICATION = "communication"  # Messaging and interaction
    TOOL_USE = "tool_use"        # Using tools and external systems
    MEMORY = "memory"            # Persistent memory and recall
    PLANNING = "planning"        # Goal-directed planning
    LEARNING = "learning"        # Adapting behavior over time
    REFLECTION = "reflection"    # Self-monitoring and adaptation
    CODE = "code"                # Code generation and manipulation
    RESEARCH = "research"        # Information gathering and synthesis
    EXPERTISE = "expertise"      # Domain-specific knowledge
    COLLABORATION = "collaboration"  # Team coordination and cooperation


class MessageType(str, Enum):
    """Types of messages exchanged between agents"""
    PROMPT = "prompt"            # Initial prompt or query
    RESPONSE = "response"        # Response to a prompt
    QUESTION = "question"        # Question requiring a response
    ANSWER = "answer"            # Answer to a question
    COMMAND = "command"          # Command to perform an action
    RESULT = "result"            # Result of an action
    REFLECTION = "reflection"    # Self-reflection or analysis
    PLAN = "plan"                # Proposed plan or steps
    ERROR = "error"              # Error or exception
    INFO = "info"                # Informational message
    SYSTEM = "system"            # System-level message
    TEAM_INVITE = "team_invite"        # Invitation to join a team
    TASK_ASSIGNMENT = "task_assignment" # Assignment of a task to an agent
    TEAM_UPDATE = "team_update"        # Update on team status or progress
    CONTEXT_SHARE = "context_share"    # Sharing context with team members
    VOTE_REQUEST = "vote_request"      # Request for a vote on a decision
    VOTE_CAST = "vote_cast"            # Cast vote for a decision
    DECISION_RESULT = "decision_result" # Result of a team decision


class Message(BaseModel):
    """Standard message format for agent communication"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_type: str = ""
    receiver_id: Optional[str] = None
    receiver_type: Optional[str] = None
    type: MessageType
    content: Any
    ref_message_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        result = self.dict()
        # Convert enum values to strings
        if isinstance(result["type"], MessageType):
            result["type"] = result["type"].value
        # Convert datetime to ISO format string
        if isinstance(result["timestamp"], datetime):
            result["timestamp"] = result["timestamp"].isoformat()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """Create message from dictionary"""
        # Convert string message type to enum
        if "type" in data and isinstance(data["type"], str):
            data["type"] = MessageType(data["type"])
        # Convert ISO string to datetime
        if "timestamp" in data and isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


class ThoughtNode(BaseModel):
    """A node in a thinking graph"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    node_type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ThoughtEdge(BaseModel):
    """An edge connecting two thought nodes"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str
    target_id: str
    edge_type: str
    weight: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ThoughtGraph(BaseModel):
    """A graph of connected thoughts representing reasoning"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nodes: Dict[str, ThoughtNode] = Field(default_factory=dict)
    edges: List[ThoughtEdge] = Field(default_factory=list)
    
    def add_node(self, node: ThoughtNode) -> str:
        """Add a node to the graph and return its ID"""
        self.nodes[node.id] = node
        return node.id
    
    def add_edge(self, source_id: str, target_id: str, edge_type: str, weight: float = 1.0) -> str:
        """Add an edge between two nodes and return its ID"""
        edge = ThoughtEdge(
            source_id=source_id,
            target_id=target_id,
            edge_type=edge_type,
            weight=weight
        )
        self.edges.append(edge)
        return edge.id
    
    def get_node(self, node_id: str) -> Optional[ThoughtNode]:
        """Get a node by ID"""
        return self.nodes.get(node_id)
    
    def get_edges_from(self, node_id: str) -> List[ThoughtEdge]:
        """Get all edges from a node"""
        return [edge for edge in self.edges if edge.source_id == node_id]
    
    def get_edges_to(self, node_id: str) -> List[ThoughtEdge]:
        """Get all edges to a node"""
        return [edge for edge in self.edges if edge.target_id == node_id]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert graph to dictionary"""
        return {
            "id": self.id,
            "nodes": {k: v.dict() for k, v in self.nodes.items()},
            "edges": [edge.dict() for edge in self.edges]
        }


class AgentState(BaseModel):
    """Current state of an agent"""
    id: str
    name: str
    role: AgentRole
    capabilities: Set[AgentCapability]
    active: bool = True
    current_task: Optional[str] = None
    thinking: Optional[ThoughtGraph] = None
    working_memory: Dict[str, Any] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)