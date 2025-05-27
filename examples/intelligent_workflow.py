import asyncio
import logging
import os
from typing import List
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
from src.agents.intelligent_agent import IntelligentAgent
from src.core.memory import MemoryStore
from src.core.tools import ToolRegistry
from src.tools.web_search import CalculatorTool, TimeTool
from src.core.agent import AgentRole

class IntelligentWorkflowExample:
    """
    Example workflow using intelligent agents with LLM integration.
    
    This example creates a team of specialized agents, each powered by LLMs,
    that can collaborate to solve complex tasks.
    """
    
    def __init__(self):
        # Initialize workflow
        self.workflow_config = WorkflowConfig(
            name="intelligent_workflow",
            description="Workflow with LLM-powered intelligent agents",
            entry_point="planner",
            max_steps=20,
            allow_cycles=True
        )
        self.workflow = Workflow(self.workflow_config)
        
        # Shared resources
        self.memory_store = MemoryStore()
        self.tool_registry = ToolRegistry()
        
        # Register tools
        self._register_tools()
        
        # Set up agents
        self._setup_agents()
    
    def _register_tools(self):
        """Register tools to be used by agents"""
        # Calculator tool
        self.tool_registry.register(CalculatorTool())
        
        # Time tool
        self.tool_registry.register(TimeTool())
    
    def _setup_agents(self):
        """Set up the intelligent agents"""
        # Configure provider based on environment
        if os.getenv("OPENAI_API_KEY"):
            provider_type = "openai"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gpt-3.5-turbo")
            }
        else:
            provider_type = "local"
            provider_config = {
                "provider_type": provider_type,
                "model_name": os.getenv("MODEL_NAME", "gemma3")
            }
            
            # Add base URL for Ollama if specified
            if os.getenv("OLLAMA_BASE_URL"):
                provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
        
        # Create agents
        self.planner = IntelligentAgent(
            role=AgentRole.PLANNER,
            name="planner",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store
        )
        
        self.researcher = IntelligentAgent(
            role=AgentRole.RESEARCHER,
            name="researcher",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store
        )
        
        self.executor = IntelligentAgent(
            role=AgentRole.EXECUTOR,
            name="executor",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store
        )
        
        self.reviewer = IntelligentAgent(
            role=AgentRole.REVIEWER,
            name="reviewer",
            llm_provider_config=provider_config,
            tool_registry=self.tool_registry,
            memory_store=self.memory_store
        )
        
        # Register agents with workflow
        self.workflow.register_agent(self.planner)
        self.workflow.register_agent(self.researcher)
        self.workflow.register_agent(self.executor)
        self.workflow.register_agent(self.reviewer)
    
    async def run(self, task_description: str, steps: List[str] = None):
        """Run the intelligent workflow on a task"""
        print(f"\n{'='*80}")
        print(f"Processing task: {task_description}")
        print(f"{'='*80}\n")
        
        # Default execution steps if none provided
        if not steps:
            steps = ["planner", "researcher", "executor", "reviewer"]
        
        current_input = {
            "content": task_description,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Execute each step in sequence
        for step in steps:
            print(f"\n{step.upper()} PHASE")
            print("-" * 40)
            
            agent = getattr(self, step)
            response = await agent.process(current_input)
            
            print(response.content)
            
            # Update input for next step
            current_input = {
                "content": f"Continue working on: {task_description}",
                "previous_step": step,
                "previous_result": response.content,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        print("\nWorkflow Complete")
        print("=" * 40)
        
        # Display memory entries
        self._display_memory_summary()
    
    def _display_memory_summary(self):
        """Display a summary of the agent memory"""
        print("\nMemory Summary:")
        print("-" * 40)
        memories = self.memory_store.search("", limit=5)
        for i, memory in enumerate(memories, 1):
            print(f"{i}. {memory.content[:100]}...")

async def run_demo(task):
    """Run the intelligent workflow demo"""
    workflow = IntelligentWorkflowExample()
    await workflow.run(task)

if __name__ == "__main__":
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not set. Using local LLM (Ollama) instead.")
        print("For better results, set your OpenAI API key in the .env file.\n")
    
    # Example tasks to choose from
    tasks = [
        "Create a simple web scraper in Python",
        "Design a database schema for an e-commerce platform",
        "Develop a strategy for improving API performance",
        "Create a marketing plan for a new mobile app"
    ]
    
    print("Intelligent Agent Workflow Demo")
    print("=" * 40)
    print("\nAvailable tasks:")
    for i, task in enumerate(tasks, 1):
        print(f"{i}. {task}")
    print(f"{len(tasks)+1}. Custom task (enter your own)")
    
    # Get user selection
    while True:
        try:
            choice = int(input("\nSelect a task (1-5): "))
            if 1 <= choice <= len(tasks)+1:
                break
            print("Invalid choice. Please select a valid option.")
        except ValueError:
            print("Please enter a number.")
    
    # Get task description
    if choice <= len(tasks):
        task = tasks[choice-1]
    else:
        task = input("Enter your custom task: ")
    
    # Run the workflow
    asyncio.run(run_demo(task))
