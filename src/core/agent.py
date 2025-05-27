from typing import Dict, Any, List, Optional, TypeVar, Generic
from pydantic import BaseModel, Field
from enum import Enum
from dataclasses import dataclass

class AgentState(BaseModel):
    """Base state for all agents"""
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    next_agents: List[str] = Field(default_factory=list)
    
class AgentRole(str, Enum):
    """Roles that agents can take in the system"""
    PLANNER = "planner"
    RESEARCHER = "researcher"
    EXECUTOR = "executor"
    REVIEWER = "reviewer"
    COORDINATOR = "coordinator"

@dataclass
class AgentResponse:
    """Structured response from an agent"""
    content: str
    metadata: Dict[str, Any] = None
    next_agent: Optional[str] = None

class BaseAgent:
    """Base class for all agents in the system"""
    
    def __init__(self, role: AgentRole, name: str):
        self.role = role
        self.name = name
        self.state = AgentState()
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Main processing method to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement this method")
    
    def update_state(self, new_state: Dict[str, Any]) -> None:
        """Update the agent's internal state"""
        self.state.context.update(new_state)
    
    def add_message(self, role: str, content: str, **kwargs) -> None:
        """Add a message to the agent's state"""
        self.state.messages.append({
            "role": role,
            "content": content,
            **kwargs
        })
    
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get a value from the agent's context"""
        return self.state.context.get(key, default)
    
    def set_next_agents(self, agent_names: List[str]) -> None:
        """Set the next agents to be executed"""
        self.state.next_agents = agent_names
