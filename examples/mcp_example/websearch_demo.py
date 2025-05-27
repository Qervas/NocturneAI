#!/usr/bin/env python3
"""
WebSearch MCP Demo

This script demonstrates how to use the MCP WebSearch server to search the web.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.mcp import MCPRegistry
from src.mcp.servers.websearch import WebSearchMCPServer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def run_websearch_demo():
    """Run the MCP WebSearch demo"""
    # Create the MCP registry
    registry = MCPRegistry()
    
    # Initialize the WebSearch MCP server
    # Note: For real usage, you would provide API keys
    websearch_server = WebSearchMCPServer()
    
    # Register the server with the registry
    registry.register_server(websearch_server)
    
    print("=== WebSearch MCP Demo ===")
    
    # Test search queries
    search_queries = [
        "latest advancements in artificial intelligence",
        "python async programming best practices",
        "climate change impact on oceans"
    ]
    
    for query in search_queries:
        print(f"\nSearching for: '{query}'")
        try:
            response = await registry.execute(
                "websearch",
                "fallback_search",
                query=query,
                num_results=3
            )
            
            if response.status == "success":
                print(f"Found {len(response.result['results'])} results:")
                
                for i, result in enumerate(response.result['results'], 1):
                    print(f"\n{i}. {result['title']}")
                    print(f"   URL: {result['url']}")
                    print(f"   Snippet: {result['snippet'][:100]}...")
            else:
                print(f"Search failed: {response.error}")
        except Exception as e:
            print(f"Error executing search: {str(e)}")
    
    # Close the aiohttp session
    await websearch_server.cleanup()
    
    print("\nWebSearch MCP Demo completed!")

if __name__ == "__main__":
    asyncio.run(run_websearch_demo())
