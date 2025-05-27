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
from src.agents.advanced_agent import AdvancedAgent
from src.core.memory import MemoryStore
from src.tools.web_search import WebSearchTool, CalculatorTool, TimeTool

class AdvancedWorkflowExample:
    def __init__(self):
        # Initialize workflow
        self.workflow_config = WorkflowConfig(
            name="advanced_workflow",
            description="Advanced workflow with tools and memory",
            entry_point="main_agent",
            max_steps=20
        )
        self.workflow = Workflow(self.workflow_config)
        
        # Initialize memory store
        self.memory_store = MemoryStore()
        
        # Create and register agents
        self._setup_agents()
    
    def _setup_agents(self):
        """Set up and register all agents"""
        # Main agent with tools
        self.main_agent = AdvancedAgent(
            role="main",
            name="main_agent",
            memory_store=self.memory_store
        )
        
        # Register tools with the main agent
        self._register_tools()
        
        # Register agents with workflow
        self.workflow.register_agent(self.main_agent)
    
    def _register_tools(self):
        """Register tools with the main agent"""
        # Web search tool (requires BRAVE_API_KEY in .env)
        web_search = WebSearchTool(api_key=os.getenv("BRAVE_API_KEY"))
        self.main_agent.register_tool(web_search)
        
        # Calculator tool
        calculator = CalculatorTool()
        self.main_agent.register_tool(calculator)
        
        # Time tool
        time_tool = TimeTool()
        self.main_agent.register_tool(time_tool)
    
    async def run(self, user_input: str):
        """Run the workflow with user input"""
        print(f"\n{'='*50}")
        print(f"Processing input: {user_input}")
        print(f"{'='*50}")
        
        # Create input data
        input_data = {
            "content": user_input,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Process the input
        response = await self.main_agent.process(input_data)
        
        # Display the response
        print("\nResponse:")
        print("-" * 30)
        print(response.content)
        
        if response.metadata.get("tool_used"):
            print(f"\nTool used: {response.metadata['tool_used']}")
        
        # Display recent memories
        self._display_recent_memories()
    
    def _display_recent_memories(self):
        """Display recent memories from the memory store"""
        print("\nRecent Memories:")
        print("-" * 30)
        memories = self.memory_store.search("", limit=3)
        for i, memory in enumerate(memories, 1):
            print(f"{i}. {memory.content[:100]}...")

async def interactive_demo():
    """Run an interactive demo of the advanced workflow"""
    print("Initializing Advanced Agent Workflow...")
    workflow = AdvancedWorkflowExample()
    
    print("\nAgent System Ready!")
    print("Type 'exit' to quit\n")
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ('exit', 'quit', 'q'):
                print("Goodbye!")
                break
                
            if not user_input.strip():
                continue
                
            await workflow.run(user_input)
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"Error: {str(e)}", exc_info=True)
            print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    asyncio.run(interactive_demo())
