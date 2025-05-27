"""
Code Agent Example - Demonstrates using the CodeAgent within the agent framework

This example shows how to initialize and use the standardized CodeAgent
to solve programming tasks using your LangGraph-based agent system.
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Add the src directory to the path so we can import the agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.llm import LLMFactory
from src.core.tools import ToolRegistry
from src.core.memory import MemoryStore
from src.agents.code_agent import CodeAgent, CodeTask
from src.agents.advanced_agent import ThinkingStrategy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def run_code_agent_example():
    """Run an example using the CodeAgent"""
    print("\n" + "=" * 80)
    print("CODE AGENT EXAMPLE")
    print("=" * 80 + "\n")
    
    # Set up the LLM provider
    llm_provider_config = {
        "provider_type": "local",  # Use the local Ollama provider
        "model_name": os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip(),
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    }
    
    # Create a tool registry, memory store, and LLM provider
    tool_registry = ToolRegistry()
    memory_store = MemoryStore()
    
    # Create the CodeAgent
    code_agent = CodeAgent(
        name="code_agent",
        tool_registry=tool_registry,
        memory_store=memory_store,
        llm_provider_config=llm_provider_config,
        # Create a playground directory in the examples folder
        playground_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), "playground"),
        thinking_strategy=ThinkingStrategy.PLANNING  # Use planning for code generation
    )
    
    # Start the agent
    await code_agent.start()
    print(f"Code agent started with playground directory: {code_agent.playground_dir}\n")
    
    # Define a programming task
    task_description = """
    Create a simple calculator application with the following features:
    
    1. Addition, subtraction, multiplication, and division operations
    2. Support for decimal numbers
    3. A command-line interface
    4. Error handling for invalid inputs
    5. Ability to store and recall the last result
    
    The application should be easy to use and should provide clear instructions.
    """
    
    print("TASK DESCRIPTION:")
    print(task_description)
    print("\nGenerating solution...")
    
    # Solve the programming task
    solution = await code_agent.solve_programming_task(
        task_description=task_description,
        output_name="calculator_app",
        language="python",
        task_type=CodeTask.APPLICATION
    )
    
    print("\n" + "=" * 80)
    print("SOLUTION GENERATED")
    print("=" * 80)
    print(f"\nSolution path: {solution['solution_path']}")
    print("\nFiles created:")
    
    for file_path in solution.get("files_created", []):
        print(f"- {os.path.basename(file_path)}")
    
    # Display the main Python file if it exists
    main_file = os.path.join(solution["solution_path"], "main.py")
    if os.path.exists(main_file):
        print("\nMAIN FILE CONTENT:")
        print("-" * 40)
        with open(main_file, "r") as f:
            print(f.read())
    
    # Run the solution if it's a Python script
    print("\nRunning the solution...")
    run_result = await code_agent._run_code(
        os.path.join(solution["solution_path"], "main.py")
    )
    
    # Check if the run was successful and handle output safely
    if run_result and "status" in run_result and run_result["status"] == "success":
        print("\nRUN OUTPUT:")
        print("-" * 40)
        print(run_result.get("stdout", "No output"))
    else:
        print("\nERROR RUNNING SOLUTION:")
        print("-" * 40)
        if run_result and "error" in run_result:
            print(run_result["error"])
        elif run_result and "stderr" in run_result:
            print(run_result["stderr"])
        else:
            print("Unknown error occurred")
    
    # Stop the agent
    await code_agent.stop()
    print("\nCode agent stopped")

if __name__ == "__main__":
    asyncio.run(run_code_agent_example())
