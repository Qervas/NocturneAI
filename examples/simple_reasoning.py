"""
Simple Reasoning Example

This example demonstrates the advanced reasoning capabilities
of a single agent without requiring the full collaboration infrastructure.
"""

import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.agent import AgentRole
from src.core.memory import MemoryStore
from src.core.tools import ToolRegistry
from src.tools.web_search import CalculatorTool, TimeTool
from src.agents.advanced_agent import AdvancedAgent, ThinkingStrategy
from src.agents.reasoning import ReasoningMode, ReasoningChain


def get_content_str(content) -> str:
    """Helper function to extract string content from different response types"""
    if hasattr(content, 'content'):
        return content.content
    else:
        return str(content)

async def demonstrate_reasoning(llm_provider_config: Dict[str, Any]):
    """Demonstrate the different reasoning strategies"""
    # Create a simple agent with reasoning capabilities
    agent = AdvancedAgent(
        role=AgentRole.PLANNER,  # Using PLANNER role instead of ASSISTANT
        name="reasoning_agent",
        llm_provider_config=llm_provider_config,
        thinking_strategy=ThinkingStrategy.REFLECTIVE,
        expertise_domains={"problem_solving": 0.9, "critical_thinking": 0.85, "creative_thinking": 0.8}
    )
    
    # Start the agent
    await agent.start()
    
    try:
        # Define a complex problem
        problem = """
        Design a system to reduce traffic congestion in a growing city with limited budget.
        The city has a population of 1 million and is expected to grow by 20% in the next decade.
        Current public transportation is limited, and most citizens rely on personal vehicles.
        The city government can allocate $50 million for this project over 5 years.
        """
        
        print("\n" + "="*80)
        print("DEMONSTRATING DIFFERENT REASONING STRATEGIES")
        print("="*80 + "\n")
        
        # 1. Sequential Reasoning
        print("\n" + "-"*40)
        print("SEQUENTIAL REASONING STRATEGY")
        print("-"*40)
        
        sequential_chain = await agent.reason_about_problem(
            problem=problem,
            reasoning_mode=ReasoningMode.SEQUENTIAL
        )
        
        # Print reasoning steps
        print("\nReasoning Steps:")
        for i, step in enumerate(sequential_chain.steps):
            print(f"\nStep {i+1}: {step.step_type}")
            print("-" * 20)
            # Print a truncated version of each step to keep output manageable
            content_str = get_content_str(step.content)
            content = content_str[:300] + "..." if len(content_str) > 300 else content_str
            print(content)
        
        # 2. Tree Reasoning
        print("\n\n" + "-"*40)
        print("TREE REASONING STRATEGY")
        print("-"*40)
        
        tree_chain = await agent.reason_about_problem(
            problem=problem,
            reasoning_mode=ReasoningMode.TREE
        )
        
        # Print reasoning steps
        print("\nReasoning Steps:")
        for i, step in enumerate(tree_chain.steps):
            print(f"\nStep {i+1}: {step.step_type}")
            print("-" * 20)
            # Print a truncated version of each step to keep output manageable
            content_str = get_content_str(step.content)
            content = content_str[:300] + "..." if len(content_str) > 300 else content_str
            print(content)
        
        # 3. Reflective Reasoning
        print("\n\n" + "-"*40)
        print("REFLECTIVE REASONING STRATEGY")
        print("-"*40)
        
        reflective_chain = await agent.reason_about_problem(
            problem=problem,
            reasoning_mode=ReasoningMode.REFLECTIVE
        )
        
        # Print reasoning steps
        print("\nReasoning Steps:")
        for i, step in enumerate(reflective_chain.steps):
            print(f"\nStep {i+1}: {step.step_type}")
            print("-" * 20)
            # Print a truncated version of each step to keep output manageable
            content_str = get_content_str(step.content)
            content = content_str[:300] + "..." if len(content_str) > 300 else content_str
            print(content)
        
        # 4. Socratic Reasoning
        print("\n\n" + "-"*40)
        print("SOCRATIC REASONING STRATEGY")
        print("-"*40)
        
        socratic_chain = await agent.reason_about_problem(
            problem=problem,
            reasoning_mode=ReasoningMode.SOCRATIC
        )
        
        # Print reasoning steps
        print("\nReasoning Steps:")
        for i, step in enumerate(socratic_chain.steps):
            print(f"\nStep {i+1}: {step.step_type}")
            print("-" * 20)
            # Print a truncated version of each step to keep output manageable
            content_str = get_content_str(step.content)
            content = content_str[:300] + "..." if len(content_str) > 300 else content_str
            print(content)
        
        # Compare conclusions
        print("\n\n" + "="*80)
        print("COMPARING REASONING STRATEGIES")
        print("="*80 + "\n")
        
        # Get conclusions
        sequential_conclusion = next((get_content_str(s.content) for s in reversed(sequential_chain.steps) if s.step_type == "conclusion"), "No conclusion")
        tree_conclusion = next((get_content_str(s.content) for s in reversed(tree_chain.steps) if s.step_type == "evaluation"), "No conclusion")
        reflective_conclusion = next((get_content_str(s.content) for s in reversed(reflective_chain.steps) if s.step_type == "conclusion"), "No conclusion")
        socratic_conclusion = next((get_content_str(s.content) for s in reversed(socratic_chain.steps) if s.step_type == "synthesis"), "No conclusion")
        
        print("\nSequential Reasoning Conclusion:")
        print("-" * 40)
        print(sequential_conclusion[:400] + "..." if len(sequential_conclusion) > 400 else sequential_conclusion)
        
        print("\nTree Reasoning Conclusion:")
        print("-" * 40)
        print(tree_conclusion[:400] + "..." if len(tree_conclusion) > 400 else tree_conclusion)
        
        print("\nReflective Reasoning Conclusion:")
        print("-" * 40)
        print(reflective_conclusion[:400] + "..." if len(reflective_conclusion) > 400 else reflective_conclusion)
        
        print("\nSocratic Reasoning Conclusion:")
        print("-" * 40)
        print(socratic_conclusion[:400] + "..." if len(socratic_conclusion) > 400 else socratic_conclusion)
        
    finally:
        # Stop the agent
        await agent.stop()

async def run_example():
    """Run the simple reasoning example"""
    print("\nAdvanced Agent System - Simple Reasoning Example\n")
    
    # Configure LLM provider
    if os.getenv("OPENAI_API_KEY"):
        provider_type = "openai"
        provider_config = {
            "provider_type": provider_type,
            "model_name": os.getenv("MODEL_NAME", "gpt-3.5-turbo")
        }
        print(f"Using OpenAI API with model: {provider_config['model_name']}")
    else:
        provider_type = "local"
        provider_config = {
            "provider_type": provider_type,
            "model_name": os.getenv("MODEL_NAME", "gemma3")
        }
        
        # Add base URL for Ollama if specified
        if os.getenv("OLLAMA_BASE_URL"):
            provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
        
        print(f"Using local model: {provider_config['model_name']} via Ollama")
    
    # Demonstrate reasoning
    await demonstrate_reasoning(provider_config)
    
    print("\nReasoning demonstration complete!")

if __name__ == "__main__":
    asyncio.run(run_example())
