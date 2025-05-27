from typing import Dict, List, Optional, Any
from ..core.agent import BaseAgent, AgentState
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class WorkflowConfig:
    """Configuration for the workflow"""
    name: str
    description: str = ""
    entry_point: str = ""
    max_steps: int = 100
    allow_cycles: bool = False

class Workflow:
    """Manages the execution flow between multiple agents"""
    
    def __init__(self, config: WorkflowConfig):
        self.config = config
        self.agents: Dict[str, BaseAgent] = {}
        self.agent_dependencies: Dict[str, List[str]] = {}
        self.agent_outputs: Dict[str, List[str]] = {}
        self.global_state: Dict[str, Any] = {}
        self.step_count: int = 0
        self.initialized: bool = False
    
    async def initialize(self) -> None:
        """Initialize the workflow"""
        if not self.config.entry_point:
            raise ValueError("No entry point specified in workflow config")
        
        if self.config.entry_point not in self.agents:
            raise ValueError(f"Entry point agent '{self.config.entry_point}' not found")
        
        self.initialized = True
        logger.info(f"Initialized workflow: {self.config.name}")
    
    def register_agent(self, agent: BaseAgent, 
                      depends_on: Optional[List[str]] = None,
                      produces: Optional[List[str]] = None) -> None:
        """Register an agent with the workflow"""
        agent_name = agent.name
        if agent_name in self.agents:
            raise ValueError(f"Agent '{agent_name}' is already registered")
        
        self.agents[agent_name] = agent
        self.agent_dependencies[agent_name] = depends_on or []
        self.agent_outputs[agent_name] = produces or []
        logger.debug(f"Registered agent: {agent_name}")
    
    def get_agent(self, agent_name: str) -> BaseAgent:
        """Get an agent by name"""
        if agent_name not in self.agents:
            raise ValueError(f"Agent '{agent_name}' not found")
        return self.agents[agent_name]
    
    def get_next_agent(self, current_agent_name: Optional[str] = None) -> Optional[str]:
        """Determine the next agent to execute"""
        if not current_agent_name:
            return self.config.entry_point
        
        current_agent = self.get_agent(current_agent_name)
        if not current_agent.state.next_agents:
            return None
            
        # For simplicity, just take the first next agent
        # In a more complex system, you might have more sophisticated routing
        next_agent_name = current_agent.state.next_agents[0]
        
        if next_agent_name not in self.agents:
            logger.warning(f"Next agent '{next_agent_name}' not found")
            return None
            
        return next_agent_name
    
    def update_state(self, agent_state: AgentState) -> None:
        """Update the workflow state with results from an agent"""
        self.step_count += 1
        if self.step_count >= self.config.max_steps:
            logger.warning("Maximum number of workflow steps reached")
            return
        
        # Update global state with agent's context
        self.global_state.update(agent_state.context)
    
    def set_next_agents(self, agent_names: List[str]) -> None:
        """Set the next agents to be executed"""
        # This would be used by agents to dynamically set the next agents
        # Implementation depends on your specific routing logic
        pass
    
    def reset(self) -> None:
        """Reset the workflow state"""
        self.step_count = 0
        self.global_state = {}
        for agent in self.agents.values():
            agent.state = AgentState()
        logger.info("Workflow reset")
