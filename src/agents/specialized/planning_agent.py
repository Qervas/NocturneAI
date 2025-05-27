from typing import Dict, Any, List, Optional
from ...core.agent import BaseAgent, AgentRole, AgentResponse
from ...core.tools import ToolRegistry
from ...core.memory import MemoryStore
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class PlanningAgent(BaseAgent):
    """
    Planning Agent that handles project planning and task decomposition.
    
    This agent is responsible for:
    1. Creating and updating project plans
    2. Breaking down tasks into manageable steps
    3. Prioritizing tasks based on project goals
    4. Estimating time requirements
    5. Adapting plans based on project progress
    """
    
    def __init__(
        self,
        name: str = "planning_agent",
        tool_registry: Optional[ToolRegistry] = None,
        memory_store: Optional[MemoryStore] = None,
        llm_provider: Any = None
    ):
        super().__init__(role=AgentRole.PLANNER, name=name)
        self.tool_registry = tool_registry or ToolRegistry()
        self.memory_store = memory_store or MemoryStore()
        self.llm_provider = llm_provider
    
    async def process(self, input_data: Dict[str, Any]) -> AgentResponse:
        """Process the input and generate planning-related outputs"""
        try:
            # Add input to conversation history
            self.add_message("user", input_data.get("content", ""))
            
            # Extract task information
            task = input_data.get("content", "")
            project_context = input_data.get("project_context", {})
            
            # In a real implementation, this would use an LLM to generate a plan
            # For now, we'll create a simple plan structure
            plan = await self._create_plan(task, project_context)
            
            # Remember the plan in memory
            self._store_plan_in_memory(task, plan)
            
            # Determine next steps
            # A real implementation would make this decision intelligently
            next_agent = "quality_assurance_agent" if input_data.get("needs_qa", False) else None
            
            return AgentResponse(
                content=f"Created plan for: {task}",
                metadata={"plan": plan},
                next_agent=next_agent
            )
            
        except Exception as e:
            logger.error(f"Error in planning agent: {str(e)}", exc_info=True)
            return AgentResponse(
                content=f"Error creating plan: {str(e)}",
                metadata={"error": True, "error_message": str(e)}
            )
    
    async def _create_plan(self, task: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a structured plan for the given task"""
        # In a real implementation, this would use an LLM
        current_time = datetime.now(timezone.utc)
        
        # Simple plan structure
        plan = {
            "task": task,
            "created_at": current_time.isoformat(),
            "deadline": None,  # Would be set based on context
            "priority": "medium",  # Would be determined based on context
            "steps": [
                {
                    "id": 1,
                    "description": f"Research requirements for {task}",
                    "status": "todo",
                    "estimated_hours": 2
                },
                {
                    "id": 2,
                    "description": f"Create implementation plan for {task}",
                    "status": "todo",
                    "estimated_hours": 3,
                    "dependencies": [1]
                },
                {
                    "id": 3,
                    "description": f"Implement {task}",
                    "status": "todo",
                    "estimated_hours": 8,
                    "dependencies": [2]
                },
                {
                    "id": 4,
                    "description": f"Test {task}",
                    "status": "todo",
                    "estimated_hours": 4,
                    "dependencies": [3]
                }
            ],
            "total_estimated_hours": 17,
            "resources_needed": [],
            "potential_risks": [],
            "notes": f"Plan generated automatically for {task}"
        }
        
        return plan
    
    def _store_plan_in_memory(self, task: str, plan: Dict[str, Any]) -> None:
        """Store the plan in memory for future reference"""
        self.memory_store.add(
            f"Plan for {task}",
            {"type": "plan", "plan": plan, "task": task}
        )
