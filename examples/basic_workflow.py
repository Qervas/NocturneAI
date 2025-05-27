import asyncio
import logging
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.workflow import Workflow, WorkflowConfig
from src.agents.planner import PlannerAgent
from src.agents.coordinator import CoordinatorAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    # Create a new workflow
    workflow_config = WorkflowConfig(
        name="basic_workflow",
        description="A simple workflow demonstrating agent coordination",
        entry_point="planner",
        max_steps=10
    )
    workflow = Workflow(workflow_config)
    
    # Create and register agents
    planner = PlannerAgent()
    workflow.register_agent(planner, produces=["plan"])
    
    # Create coordinator
    coordinator = CoordinatorAgent(workflow)
    
    # Example input
    user_input = {
        "goal": "build a REST API with FastAPI"
    }
    
    try:
        # Start the workflow
        print("Starting workflow...")
        response = await coordinator.process(user_input)
        print(f"\nFinal response: {response.content}")
        print(f"Metadata: {response.metadata}")
        
    except Exception as e:
        logger.error(f"Workflow failed: {str(e)}", exc_info=True)
    finally:
        # Clean up
        coordinator.reset()
        print("\nWorkflow completed.")

if __name__ == "__main__":
    asyncio.run(main())
