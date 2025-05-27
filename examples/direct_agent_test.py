"""
Direct test for agent integration with Ollama

This script directly tests an agent with the power grid problem, bypassing 
the complex agent framework to verify the Ollama integration is working properly.
"""

import asyncio
import os
from dotenv import load_dotenv
import logging
import sys
import inspect
import ollama

# Add the src directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

from src.core.llm import LocalLLMProvider, OpenAIProvider

async def test_agent_direct():
    """Test a simplified agent with Ollama directly"""
    model_name = os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip()
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    print(f"\n===== DIRECT AGENT TEST =====")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    # Create LLM provider
    llm = LocalLLMProvider(
        base_url=base_url,
        model_name=model_name,
        options={"temperature": 0.7}  # Optional settings
    )
    
    # Define the power grid problem directly
    grid_problem = """
    A city is experiencing frequent power outages due to an aging electrical grid. 
    The city has a limited budget of $10 million to address this issue. 
    What solutions would you recommend to improve reliability while staying within budget?
    """
    
    # Simplified system prompt for an infrastructure expert agent
    system_prompt = """You are an infrastructure expert specializing in power grid management and urban planning.
    Provide detailed, practical solutions to infrastructure problems."""
    
    print("\nSending the power grid problem to the LocalLLMProvider...")
    print("\nProblem:", grid_problem)
    
    # Inspect the _format_messages method to understand its behavior
    print("\nInspecting _format_messages method:")
    print(inspect.getsource(llm._format_messages))
    
    # Format messages manually to see what's happening
    formatted_messages = llm._format_messages([{"role": "user", "content": grid_problem}], system_prompt)
    print("\nManually formatted messages:")
    for msg in formatted_messages:
        print(f"- Role: {msg.get('role')}, Content: {msg.get('content')[:50]}...")
    
    try:
        # Generate a response with the LocalLLMProvider
        print("\nGenerating response (streaming)...")
        response = await llm.generate(
            messages=[{"role": "user", "content": grid_problem}],
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=1000
        )
        
        print("\n=== RESPONSE START ===\n")
        print(response.content)
        print("\n=== RESPONSE END ===")
        print(f"\nMetadata: {response.metadata}")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(test_agent_direct())
