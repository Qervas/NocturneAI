from typing import Dict, Any, List, Optional
from ..core.agent import BaseAgent, AgentRole, AgentResponse, AgentState
from ..core.workflow import Workflow
import logging

logger = logging.getLogger(__name__)

class CoordinatorAgent(BaseAgent):
    """Coordinates between different agents in the system"""
    
    def __init__(self, workflow: Workflow):
        super().__init__(role=AgentRole.COORDINATOR, name="coordinator")
        self.workflow = workflow
        self.current_agent_name: Optional[str] = None
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and coordinate between agents"""
        try:
            # Initialize workflow if this is the first run
            if not self.workflow.initialized:
                await self.workflow.initialize()
            
            # Get the next agent to execute
            next_agent_name = self.workflow.get_next_agent(self.current_agent_name)
            if not next_agent_name:
                return AgentResponse(
                    content="Workflow completed",
                    metadata={"status": "completed"}
                )
            
            self.current_agent_name = next_agent_name
            agent = self.workflow.get_agent(next_agent_name)
            
            # Process with the current agent
            logger.info(f"Executing agent: {next_agent_name}")
            response = await agent.process(input_data)
            
            # Update workflow state
            self.workflow.update_state(agent.state)
            
            # Determine next steps
            if response.next_agent:
                self.workflow.set_next_agents(response.next_agent)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in coordinator: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error in coordinator: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    def reset(self) -> None:
        """Reset the coordinator's state"""
        self.current_agent_name = None
        self.workflow.reset()
