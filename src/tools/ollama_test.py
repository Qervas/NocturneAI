"""
Test script for Ollama API integration

This script tests the basic Ollama API integration to ensure
we're formatting requests correctly.
"""

import asyncio
import aiohttp
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_ollama_api():
    """Test the Ollama API with a simple chat message"""
    # Get Ollama base URL from environment
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.getenv("MODEL_NAME", "gemma3:latest")
    
    # Clean up model name - remove any comments or extra whitespace
    if '#' in model_name:
        model_name = model_name.split('#')[0].strip()
    else:
        model_name = model_name.strip()
    
    print(f"Testing Ollama API with model: {model_name}")
    print(f"Using base URL: {base_url}")
    
    # Prepare a simple message
    data = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "stream": False,
        "options": {
            "temperature": 0.7,
            "format": "json"
        }
    }
    
    print("\nSending request with data:")
    print(json.dumps(data, indent=2))
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{base_url}/api/chat",
                json=data,
                timeout=10
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print("\nSuccess! Received response:")
                    print(json.dumps(result, indent=2))
                else:
                    error_text = await response.text()
                    print(f"\nError: Received status code {response.status}")
                    print(f"Error message: {error_text}")
                    
    except Exception as e:
        print(f"\nException occurred: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ollama_api())
