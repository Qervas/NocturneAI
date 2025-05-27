"""
Stream Test for Ollama

Tests both streaming and non-streaming modes with Ollama.
"""

import asyncio
import os
import logging
from dotenv import load_dotenv
import ollama

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def test_non_streaming():
    """Test Ollama with streaming disabled"""
    model_name = os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip()
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    print(f"\n===== NON-STREAMING TEST =====")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    client = ollama.AsyncClient(host=base_url)
    
    try:
        print("\nSending non-streaming request...")
        response = await client.chat(
            model=model_name,
            messages=[{"role": "user", "content": "What are the top 3 ways to improve an electrical grid?"}],
            stream=False
        )
        
        print(f"\nResponse received! Content length: {len(response.message.content)}")
        print(f"\nFirst 200 chars: {response.message.content[:200]}...")
        
    except Exception as e:
        print(f"\nError with non-streaming request: {str(e)}")
        print(f"Error type: {type(e)}")

async def test_streaming():
    """Test Ollama with streaming enabled"""
    model_name = os.getenv("MODEL_NAME", "gemma3:latest").split('#')[0].strip()
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    print(f"\n===== STREAMING TEST =====")
    print(f"Model: {model_name}")
    print(f"Base URL: {base_url}")
    
    client = ollama.AsyncClient(host=base_url)
    
    try:
        print("\nSending streaming request...")
        full_response = ""
        chunk_count = 0
        
        # Use the async generator from the streaming response
        async for chunk in await client.chat(
            model=model_name,
            messages=[{"role": "user", "content": "What are the top 3 ways to improve an electrical grid?"}],
            stream=True
        ):
            chunk_count += 1
            if hasattr(chunk, 'message') and hasattr(chunk.message, 'content'):
                # Append the chunk content
                full_response += chunk.message.content
                
                # Print progress indicator
                if chunk_count % 10 == 0:
                    print(".", end="", flush=True)
        
        print(f"\n\nStreaming complete! Received {chunk_count} chunks.")
        print(f"Total content length: {len(full_response)}")
        print(f"\nFirst 200 chars: {full_response[:200]}...")
        
    except Exception as e:
        print(f"\nError with streaming request: {str(e)}")
        print(f"Error type: {type(e)}")

async def main():
    await test_non_streaming()
    await test_streaming()

if __name__ == "__main__":
    asyncio.run(main())
