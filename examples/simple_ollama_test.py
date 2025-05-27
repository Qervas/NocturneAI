"""
Simple Ollama Package Test

This script tests the ollama Python package directly with proper message formatting.
"""

import asyncio
import os
from dotenv import load_dotenv
import ollama

# Load environment variables
load_dotenv()

async def test_ollama_package():
    """Test the ollama Python package directly"""
    model_name = os.getenv("MODEL_NAME", "gemma3:latest")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Clean up model name
    if '#' in model_name:
        model_name = model_name.split('#')[0].strip()
    else:
        model_name = model_name.strip()
    
    print(f"Testing ollama Python package")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    # Create client
    client = ollama.AsyncClient(host=base_url)
    
    # Power grid problem
    grid_problem = """
    A city is experiencing frequent power outages due to an aging electrical grid. 
    The city has a limited budget of $10 million to address this issue. 
    What solutions would you recommend to improve reliability while staying within budget?
    """
    
    # System prompt for an infrastructure expert
    system_prompt = "You are an infrastructure expert specializing in power grid management and urban planning."
    
    # Properly formatted messages
    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": grid_problem
        }
    ]
    
    print("\nSending properly formatted request...")
    
    try:
        response = await client.chat(
            model=model_name,
            messages=messages,
            options={"temperature": 0.7}
        )
        
        print("\nSuccess! Response received:")
        print(f"\nResponse content: {response.message.content}")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print(f"Error type: {type(e)}")
        
    print("\nTest complete!")

if __name__ == "__main__":
    asyncio.run(test_ollama_package())
