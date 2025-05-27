"""
Configuration-Driven Agent Example

This example demonstrates how to use the configuration system to create
and run agents with different roles and thinking strategies.
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
from src.agents.reasoning import ReasoningMode
from src.core.config import get_config_manager

async def run_config_driven_agent(role_name: str, thinking_strategy_name: str, problem: str):
    """Run an agent based on configuration settings"""
    # Get configuration manager
    config_manager = get_config_manager()
    
    # Get role and strategy configuration
    role_config = config_manager.get_agent_role(role_name)
    strategy_config = config_manager.get_thinking_strategy(thinking_strategy_name)
    
    # Determine LLM provider configuration
    if os.getenv("OPENAI_API_KEY"):
        provider_type = "openai"
        provider_settings = config_manager.get_llm_provider(provider_type)
        provider_config = {
            "provider_type": provider_type,
            "model_name": os.getenv("MODEL_NAME", provider_settings.get("default_model", "gpt-3.5-turbo"))
        }
    else:
        provider_type = "local"
        provider_settings = config_manager.get_llm_provider(provider_type)
        provider_config = {
            "provider_type": provider_type,
            "model_name": os.getenv("MODEL_NAME", provider_settings.get("default_model", "gemma3:latest")),
            "options": provider_settings.get("options", {"format": "json"})
        }
        
        # Add base URL for Ollama if specified
        if os.getenv("OLLAMA_BASE_URL"):
            provider_config["base_url"] = os.getenv("OLLAMA_BASE_URL")
    
    # Print agent configuration
    print(f"\n{'='*80}")
    print(f"AGENT CONFIGURATION")
    print(f"{'='*80}")
    print(f"Role: {role_name}")
    print(f"Description: {role_config.get('description', 'No description')}")
    print(f"Thinking Strategy: {thinking_strategy_name}")
    print(f"Strategy Description: {strategy_config.get('description', 'No description')}")
    print(f"LLM Provider: {provider_type}")
    print(f"Model: {provider_config.get('model_name', 'Unknown')}")
    
    # Create the agent
    agent = AdvancedAgent(
        role=getattr(AgentRole, role_name),
        name=f"{role_name.lower()}_agent",
        llm_provider_config=provider_config,
        thinking_strategy=getattr(ThinkingStrategy, thinking_strategy_name),
        system_prompt=role_config.get("prompt_template", "You are a helpful assistant."),
        expertise_domains={"problem_solving": 0.8, "critical_thinking": 0.7}
    )
    
    # Start the agent
    await agent.start()
    
    try:
        # Determine reasoning mode from configuration
        reasoning_mode_name = strategy_config.get("reasoning_mode", "SEQUENTIAL")
        reasoning_mode = getattr(ReasoningMode, reasoning_mode_name)
        
        print(f"\n{'='*80}")
        print(f"SOLVING PROBLEM USING {reasoning_mode_name} REASONING")
        print(f"{'='*80}")
        print(f"\nProblem: {problem}\n")
        
        # Use the appropriate reasoning mode
        reasoning_chain = await agent.reason_about_problem(
            problem=problem,
            reasoning_mode=reasoning_mode
        )
        
        # Extract conclusion
        conclusion = None
        for step in reversed(reasoning_chain.steps):
            if step.step_type in ["conclusion", "synthesis", "evaluation"]:
                conclusion = step.content
                break
        
        if not conclusion and reasoning_chain.steps:
            conclusion = reasoning_chain.steps[-1].content
        
        print(f"\n{'='*80}")
        print(f"SOLUTION")
        print(f"{'='*80}")
        print(conclusion)
        
    finally:
        # Stop the agent
        await agent.stop()

async def run_example():
    """Run the configuration-driven agent example"""
    # Define a problem to solve
    problem = """
    A city is experiencing frequent power outages due to an aging electrical grid. 
    The city has a limited budget of $10 million to address this issue. 
    What solutions would you recommend to improve reliability while staying within budget?
    """
    
    # Run agents with different roles and thinking strategies
    await run_config_driven_agent("PLANNER", "PLANNING", problem)
    print("\n\n")
    await run_config_driven_agent("RESEARCHER", "REFLECTIVE", problem)
    print("\n\n")
    await run_config_driven_agent("EXECUTOR", "REACTIVE", problem)

if __name__ == "__main__":
    asyncio.run(run_example())
