"""
Direct problem-solving test using Ollama

This script directly tests Ollama's ability to solve the power grid problem
without going through the agent framework.
"""

import asyncio
import os
from dotenv import load_dotenv
import ollama
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def test_direct_problem_solving():
    """Test Ollama's ability to solve the power grid problem directly"""
    model_name = os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip()
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    print(f"\n===== DIRECT PROBLEM-SOLVING TEST =====")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    # Define the power grid problem directly
    grid_problem = """
    A city is experiencing frequent power outages due to an aging electrical grid. 
    The city has a limited budget of $10 million to address this issue. 
    What solutions would you recommend to improve reliability while staying within budget?
    """
    
    client = ollama.AsyncClient(host=base_url)
    
    try:
        print("\nSending the power grid problem directly to Ollama...")
        print("\nProblem:", grid_problem)
        
        # Send a single, clear message with the problem
        print("\nGenerating response (streaming)...")
        full_response = ""
        chunk_count = 0
        progress_markers = ["▫", "▪", "□", "■"]
        
        # Show initial progress indicator
        print("Ollama generating: ", end="", flush=True)
        
        # Use streaming for better user experience
        async for chunk in await client.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant with expertise in urban infrastructure and power grid management."},
                {"role": "user", "content": grid_problem.strip()}
            ],
            stream=True
        ):
            chunk_count += 1
            
            if hasattr(chunk, 'message') and hasattr(chunk.message, 'content'):
                # Append chunk content
                full_response += chunk.message.content
                
                # Show progress indicators
                if chunk_count % 20 == 0:
                    marker = progress_markers[chunk_count // 20 % len(progress_markers)]
                    print(marker, end="", flush=True)
        
        print(" Done!")
        print(f"\nReceived {chunk_count} chunks. Response length: {len(full_response)}")
        print("\n=== RESPONSE START ===\n")
        print(full_response)
        print("\n=== RESPONSE END ===")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(test_direct_problem_solving())
