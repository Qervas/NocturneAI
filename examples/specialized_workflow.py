import asyncio
import logging
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.workflow import Workflow, WorkflowConfig
from src.agents.coordinator import CoordinatorAgent
from src.core.memory import MemoryStore
from src.agents.specialized.planning_agent import PlanningAgent
from src.agents.specialized.quality_assurance_agent import QualityAssuranceAgent
from src.agents.specialized.troubleshooting_agent import TroubleshootingAgent
from src.agents.specialized.research_agent import ResearchAgent
from src.tools.web_search import CalculatorTool, TimeTool

class SpecializedWorkflowExample:
    """Example workflow using specialized agents for a complete project management system"""
    
    def __init__(self):
        # Initialize workflow
        self.workflow_config = WorkflowConfig(
            name="nocturne_ai_workflow",
            description="Autonomous project management workflow with specialized agents",
            entry_point="planner",
            max_steps=30,
            allow_cycles=True  # Allow agents to cycle back to previous agents
        )
        self.workflow = Workflow(self.workflow_config)
        
        # Initialize shared memory store
        self.memory_store = MemoryStore()
        
        # Create and register agents
        self._setup_agents()
        
        # Current running task
        self.current_task = None
    
    def _setup_agents(self):
        """Set up and register all agents"""
        # Create planning agent
        self.planning_agent = PlanningAgent(
            memory_store=self.memory_store
        )
        
        # Create quality assurance agent
        self.qa_agent = QualityAssuranceAgent(
            memory_store=self.memory_store
        )
        
        # Create troubleshooting agent
        self.troubleshooting_agent = TroubleshootingAgent(
            memory_store=self.memory_store
        )
        
        # Create research agent
        self.research_agent = ResearchAgent(
            memory_store=self.memory_store
        )
        
        # Register tools with each agent
        self._register_tools()
        
        # Register agents with workflow
        self.workflow.register_agent(self.planning_agent)
        self.workflow.register_agent(self.qa_agent, depends_on=["planner"])
        self.workflow.register_agent(self.troubleshooting_agent, depends_on=["qa_agent"])
        self.workflow.register_agent(self.research_agent)
        
        # Create coordinator
        self.coordinator = CoordinatorAgent(self.workflow)
    
    def _register_tools(self):
        """Register tools with agents"""
        # Calculator tool
        calculator = CalculatorTool()
        
        # Time tool
        time_tool = TimeTool()
        
        # Register with each agent
        for agent in [self.planning_agent, self.qa_agent, self.troubleshooting_agent, self.research_agent]:
            agent.tool_registry.register(calculator)
            agent.tool_registry.register(time_tool)
    
    async def run(self, task_description: str, code_sample: str = None):
        """Run the workflow with a task"""
        print(f"\n{'='*80}")
        print(f"Processing task: {task_description}")
        print(f"{'='*80}")
        
        self.current_task = task_description
        
        # Create input data for the planning agent
        input_data = {
            "content": task_description,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "needs_qa": code_sample is not None,
            "code": code_sample
        }
        
        # Start with the planning agent
        plan_response = await self.planning_agent.process(input_data)
        print("\nPlanning Phase Complete")
        print("-" * 40)
        print(plan_response.content)
        
        # If we have code to review and the plan indicates QA is needed
        if code_sample and plan_response.next_agent == "quality_assurance_agent":
            # Create input for QA agent
            qa_input = {
                "content": f"Perform quality assurance for {task_description}",
                "code": code_sample,
                "plan": plan_response.metadata.get("plan", {})
            }
            
            # Run QA agent
            qa_response = await self.qa_agent.process(qa_input)
            print("\nQuality Assurance Phase Complete")
            print("-" * 40)
            print(qa_response.content)
            
            # If issues were found, run troubleshooting
            if qa_response.next_agent == "troubleshooting_agent":
                # Create input for troubleshooting agent
                troubleshooting_input = {
                    "content": f"Fix issues in {task_description}",
                    "code": code_sample,
                    "qa_results": qa_response.metadata.get("qa_results", {})
                }
                
                # Run troubleshooting agent
                troubleshooting_response = await self.troubleshooting_agent.process(troubleshooting_input)
                print("\nTroubleshooting Phase Complete")
                print("-" * 40)
                print(troubleshooting_response.content)
                
                # If research is needed
                if troubleshooting_response.next_agent == "research_agent":
                    # Create input for research agent
                    research_input = {
                        "content": f"Research solutions for {task_description}",
                        "sources": ["documentation", "stack_overflow", "github"]
                    }
                    
                    # Run research agent
                    research_response = await self.research_agent.process(research_input)
                    print("\nResearch Phase Complete")
                    print("-" * 40)
                    print(research_response.content)
        
        print("\nWorkflow Complete")
        print("=" * 40)
        self._display_memory_summary()
    
    def _display_memory_summary(self):
        """Display a summary of what the system remembers"""
        print("\nMemory Summary:")
        print("-" * 40)
        memories = self.memory_store.search("", limit=5)
        for i, memory in enumerate(memories, 1):
            print(f"{i}. {memory.content[:100]}...")

async def run_example():
    """Run the specialized workflow example"""
    workflow = SpecializedWorkflowExample()
    
    # Example task
    task = "Implement a RESTful API for user authentication"
    
    # Example code (with deliberate issues for QA to find)
    code_sample = """
def authenticate_user(username, password):
    # Check if user exists
    user = db.users.find_one({"username": username})
    
    # No validation or error handling
    
    # Insecure password comparison
    if user["password"] == password:
        # Generate token without expiration
        token = generate_token(user["_id"])
        return token
    
    return None

def generate_token(user_id):
    # No expiration or token revocation mechanism
    payload = {"user_id": user_id}
    token = jwt.encode(payload, "secret_key", algorithm="HS256")
    return token
"""
    
    await workflow.run(task, code_sample)

if __name__ == "__main__":
    asyncio.run(run_example())
