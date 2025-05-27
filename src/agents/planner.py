from typing import Dict, Any
from ..core.agent import BaseAgent, AgentRole, AgentResponse
import logging

logger = logging.getLogger(__name__)

class PlannerAgent(BaseAgent):
    """Agent responsible for planning and task decomposition"""
    
    def __init__(self):
        super().__init__(role=AgentRole.PLANNER, name="planner")
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and generate a plan"""
        try:
            # Get the user's goal from input
            goal = input_data.get("goal", "")
            
            if not goal:
                return AgentResponse(
                    content="No goal provided. Please provide a goal to plan for.",
                    metadata={"error": True}
                )
            
            # In a real implementation, this would use an LLM to generate the plan
            # For now, we'll use a simple hardcoded plan
            plan = {
                "goal": goal,
                "steps": [
                    {"action": "research", "description": f"Research information about {goal}"},
                    {"action": "plan", "description": f"Create a detailed plan for {goal}"},
                    {"action": "execute", "description": f"Execute the plan for {goal}"},
                    {"action": "review", "description": f"Review the results of {goal}"}
                ]
            }
            
            # Update agent state
            self.update_state({"current_plan": plan})
            self.add_message("assistant", f"Created a plan for: {goal}")
            
            # Set next agent to be the researcher
            return AgentResponse(
                content=f"Plan created for: {goal}",
                metadata={"plan": plan},
                next_agent="researcher"
            )
            
        except Exception as e:
            logger.error(f"Error in planner: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error in planner: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
