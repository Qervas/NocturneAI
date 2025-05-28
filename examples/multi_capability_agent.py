#!/usr/bin/env python3
"""
NocturneAI - Multi-Capability Agent Example

This example demonstrates how a single ModularAgent can use multiple capabilities
to perform a simple task. It showcases the flexibility of the modular architecture
and how capabilities can be composed to create a powerful agent.
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
from typing import Dict, Any, Set

# Add the parent directory to the path so we can import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import components
from src.agents.core.types import AgentRole, AgentCapability, MessageType, Message
from src.agents.core.modular_agent import ModularAgent
from src.llm import get_llm_provider, BaseLLMProvider
from src.tools.web_search import WebSearchTool


def create_llm_provider() -> BaseLLMProvider:
    """Create an LLM provider based on environment variables"""
    # Try to use OpenAI if API key is available
    if os.getenv("OPENAI_API_KEY"):
        logger.info("Using OpenAI provider")
        model_name = os.getenv("MODEL_NAME", "gpt-3.5-turbo")
        return get_llm_provider("openai", model_name=model_name)
    
    # Use Ollama as default
    else:
        logger.info("Using Ollama provider")
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        model_name = os.getenv("MODEL_NAME", "llama3")
        return get_llm_provider("local", model_name=model_name, base_url=ollama_url)


async def create_multi_capability_agent() -> ModularAgent:
    """
    Create a ModularAgent with multiple capabilities.
    
    This demonstrates how a single agent can be composed with various capabilities
    to create a powerful, flexible system.
    """
    # Create LLM provider
    llm_provider = create_llm_provider()
    
    # Create the agent with no capabilities initially
    agent = ModularAgent(
        name="MultiCapabilityAgent",
        role=AgentRole.ASSISTANT,
        llm_provider=llm_provider,
        capabilities=set()
    )
    
    # Import capability classes
    from src.agents.capabilities.thinking import GraphThinking
    from src.agents.capabilities.memory import SimpleMemory
    from src.agents.capabilities.tool_use import MCPToolUse
    from src.agents.capabilities.planning import PlanningCapability
    from src.agents.capabilities.reflection import SelfReflection
    from src.agents.capabilities.communication import BasicCommunication
    from src.agents.capabilities.research import WebSearchResearch
    
    # Add thinking capability for reasoning
    thinking_capability = GraphThinking()
    agent.add_capability(thinking_capability)
    
    # Add memory capability for storing information
    memory_capability = SimpleMemory()
    agent.add_capability(memory_capability)
    
    # Add tool use capability for using external tools
    tools = [WebSearchTool()]
    tool_use_capability = MCPToolUse(tools=tools)
    agent.add_capability(tool_use_capability)
    
    # Add planning capability for planning tasks
    planning_capability = PlanningCapability()
    agent.add_capability(planning_capability)
    
    # Add reflection capability for self-improvement
    reflection_capability = SelfReflection()
    agent.add_capability(reflection_capability)
    
    # Add communication capability for agent interaction
    communication_capability = BasicCommunication(agent_id=agent.agent_id)
    agent.add_capability(communication_capability)
    
    # Add research capability for information gathering
    research_capability = WebSearchResearch()
    agent.add_capability(research_capability)
    
    # Initialize the agent
    await agent.initialize()
    
    logger.info(f"Created agent with capabilities: {', '.join(str(cap) for cap in agent.capabilities)}")
    return agent


async def perform_simple_task(agent: ModularAgent, task: str) -> Dict[str, Any]:
    """
    Have the agent perform a simple task that utilizes multiple capabilities.
    
    Args:
        agent: The ModularAgent to use
        task: The task description
        
    Returns:
        A dictionary containing the task results
    """
    logger.info(f"Starting task: {task}")
    
    # First, have the agent think about the task
    logger.info("Agent is thinking about the task...")
    thinking_capability = agent.get_capability("GraphThinking")
    thinking_result = await thinking_capability.think(context=f"I need to {task}. How should I approach this?")
    
    # Then, have the agent create a plan
    logger.info("Agent is planning the task...")
    plan_capability = agent.get_capability("PlanningCapability")
    plan = await plan_capability.create_plan(goal=task)
    
    # Execute the plan using research and tool capabilities
    logger.info("Agent is executing the plan...")
    
    # Store steps in memory
    memory_capability = agent.get_capability("SimpleMemory")
    await memory_capability.remember(f"Task: {task}", f"Worked on task: {task}")
    await memory_capability.remember(f"Plan", plan)
    
    # Use research capability to gather information
    research_capability = agent.get_capability("WebSearchResearch")
    research_results = await research_capability.search(query=task)
    
    # Reflect on the process and results
    logger.info("Agent is reflecting on the results...")
    reflection_capability = agent.get_capability("SelfReflection")
    # Record experience for reflection
    await reflection_capability.record_experience({
        "thought_process": thinking_result,
        "actions_taken": [
            f"Created plan with {len(plan['steps'])} steps",
            f"Executed research on '{task}'"
        ],
        "outcomes": research_results
    })
    
    # Now perform reflection based on recorded experiences
    reflection = await reflection_capability.reflect()
    
    # Generate a response using the communication capability
    logger.info("Agent is generating a response...")
    communication_capability = agent.get_capability("BasicCommunication")
    # Create a message to send
    message = Message(
        type=MessageType.INFO,
        sender_id=agent.id,
        receiver_id="user",  # Sending to the user
        content=f"I've analyzed the task: {task}\n\nBased on my research, I can provide this information:\n{research_results}"
    )
    
    # Send the message
    response = await communication_capability.send_message(message)
    
    # Return the combined results
    return {
        "task": task,
        "thinking": thinking_result,
        "plan": plan,
        "research": research_results,
        "reflection": reflection,
        "response": response
    }


async def main():
    """Main entry point"""
    try:
        # Create the multi-capability agent
        agent = await create_multi_capability_agent()
        
        # Ask for a task
        task = input("Enter a task for the agent: ")
        if not task:
            task = "Summarize the latest developments in quantum computing"
            print(f"Using default task: {task}")
        
        # Perform the task
        results = await perform_simple_task(agent, task)
        
        # Display results
        print("\n===== TASK RESULTS =====")
        print(f"Task: {results['task']}")
        print("\nThinking Process:")
        print(results['thinking'])
        print("\nPlan:")
        print(results['plan'])
        print("\nResearch Results:")
        print(results['research'])
        print("\nReflection:")
        print(results['reflection'])
        print("\nFinal Response:")
        print(results['response'])
        
        # Clean up
        await agent.cleanup()
        
        return 0
    
    except KeyboardInterrupt:
        logger.info("Program interrupted by user")
        return 1
    except Exception as e:
        logger.exception(f"Error in main program: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
