"""
Direct Ollama API Integration Test

This script provides a simple, direct test of the Ollama API
to ensure we can communicate with local models correctly.
"""

import asyncio
import aiohttp
import json
import os
import logging
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def test_ollama_direct():
    """Direct test of Ollama API"""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.getenv("MODEL_NAME", "gemma3:latest")
    
    # Clean up model name
    if '#' in model_name:
        model_name = model_name.split('#')[0].strip()
    else:
        model_name = model_name.strip()
    
    print(f"Testing direct connection to Ollama API")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    # Simple message for the model
    data = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "What are 3 effective strategies for improving an electrical grid?"}
        ]
    }
    
    print("\nSending request...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{base_url}/api/chat",
                json=data,
                timeout=60
            ) as response:
                if response.status == 200:
                    # Read the response as text since it might be NDJSON format
                    response_text = await response.text()
                    print("\nSuccess! Response received.")
                    
                    try:
                        # First try parsing as a single JSON object
                        result = json.loads(response_text)
                        if "message" in result and "content" in result["message"]:
                            print("\nResponse content:")
                            print(result["message"]["content"])
                        else:
                            print("\nUnexpected response format:")
                            print(json.dumps(result, indent=2))
                    except json.JSONDecodeError:
                        # If that fails, try handling as NDJSON (newline-delimited JSON)
                        print("\nProcessing as NDJSON format...")
                        last_response = None
                        for line in response_text.strip().split("\n"):
                            if line.strip():
                                try:
                                    chunk = json.loads(line)
                                    last_response = chunk
                                except json.JSONDecodeError:
                                    print(f"Failed to parse line: {line}")
                        
                        if last_response:
                            if "message" in last_response and "content" in last_response["message"]:
                                print("\nResponse content:")
                                print(last_response["message"]["content"])
                            else:
                                print("\nFinal response chunk:")
                                print(json.dumps(last_response, indent=2))
                else:
                    error_text = await response.text()
                    print(f"\nError: Received status {response.status}")
                    print(f"Error message: {error_text}")
    except Exception as e:
        print(f"\nException: {str(e)}")

async def main():
    await test_ollama_direct()

if __name__ == "__main__":
    asyncio.run(main())
