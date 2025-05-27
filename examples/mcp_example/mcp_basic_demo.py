#!/usr/bin/env python3
"""
MCP Basic Demo

This script demonstrates how to use the MCP framework to perform
basic operations using various MCP servers.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.mcp import MCPRegistry
from src.mcp.servers.filesystem import FileSystemMCPServer
from src.mcp.servers.git import GitMCPServer
from src.mcp.servers.memory import MemoryMCPServer
from src.mcp.servers.network import NetworkMCPServer
from src.mcp.servers.tool import ToolMCPServer, Tool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Example tool implementation
class TimeCheckTool(Tool):
    """Tool to check the current time"""
    
    def __init__(self):
        super().__init__(
            name="check_time",
            description="Check the current time"
        )
    
    async def execute(self, timezone: str = "UTC") -> dict:
        """Execute the time check tool
        
        Args:
            timezone: Timezone to check time in
            
        Returns:
            Dictionary with the current time
        """
        import datetime
        import pytz
        
        try:
            tz = pytz.timezone(timezone)
            current_time = datetime.datetime.now(tz)
            
            return {
                "timezone": timezone,
                "time": current_time.strftime("%Y-%m-%d %H:%M:%S %Z%z"),
                "timestamp": current_time.timestamp()
            }
        except pytz.exceptions.UnknownTimeZoneError:
            return {
                "error": f"Unknown timezone: {timezone}",
                "available_timezones": pytz.all_timezones[:10]  # First 10 timezones
            }

class WeatherCheckTool(Tool):
    """Tool to check the weather"""
    
    def __init__(self):
        super().__init__(
            name="check_weather",
            description="Check the weather for a location"
        )
    
    async def execute(self, location: str) -> dict:
        """Execute the weather check tool
        
        Args:
            location: Location to check weather for
            
        Returns:
            Dictionary with the weather information
        """
        # This is a mock implementation
        import random
        
        conditions = ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"]
        temperature = random.randint(0, 35)  # Celsius
        
        return {
            "location": location,
            "condition": random.choice(conditions),
            "temperature": temperature,
            "units": "Celsius",
            "humidity": random.randint(30, 90)
        }

async def run_demo():
    """Run the MCP demo"""
    # Create the MCP registry
    registry = MCPRegistry()
    
    # Create temp directory for demo files
    demo_dir = Path(__file__).parent / "demo_files"
    os.makedirs(demo_dir, exist_ok=True)
    
    # Create memory directory
    memory_dir = Path(__file__).parent / "demo_memory"
    os.makedirs(memory_dir, exist_ok=True)
    
    # Initialize MCP servers
    filesystem_server = FileSystemMCPServer(allowed_directories=[str(demo_dir)])
    git_server = GitMCPServer(allowed_directories=[str(demo_dir)])
    memory_server = MemoryMCPServer(str(memory_dir))
    network_server = NetworkMCPServer(allowed_domains=["api.github.com", "httpbin.org"])
    tool_server = ToolMCPServer()
    
    # Register servers with the registry
    registry.register_server(filesystem_server)
    registry.register_server(git_server)
    registry.register_server(memory_server)
    registry.register_server(network_server)
    registry.register_server(tool_server)
    
    # Register tools with the tool server
    tool_server.register_tool(TimeCheckTool())
    tool_server.register_tool(WeatherCheckTool())
    
    # List all registered servers
    print("=== Registered MCP Servers ===")
    for server_name in registry.list_servers():
        print(f"- {server_name}")
    print()
    
    # === Filesystem operations ===
    print("=== Filesystem Operations ===")
    
    # Create a file
    print("Creating a file...")
    response = await registry.execute(
        "filesystem",
        "write_file",
        path=str(demo_dir / "hello.txt"),
        content="Hello, MCP World!\n\nThis is a test file created by the MCP demo."
    )
    print(f"File created: {response.result['path']}")
    
    # Read the file
    print("\nReading the file...")
    response = await registry.execute(
        "filesystem",
        "read_file",
        path=str(demo_dir / "hello.txt")
    )
    print(f"File content:\n{response.result['content']}")
    
    # Create a directory
    print("\nCreating a directory...")
    response = await registry.execute(
        "filesystem",
        "create_directory",
        path=str(demo_dir / "subdir")
    )
    print(f"Directory created: {response.result['path']}")
    
    # List the directory
    print("\nListing the directory...")
    response = await registry.execute(
        "filesystem",
        "list_directory",
        path=str(demo_dir)
    )
    print("Directory contents:")
    for item in response.result["items"]:
        print(f"- {item['name']} ({item['type']})")
    
    # === Memory operations ===
    print("\n=== Memory Operations ===")
    
    # Create entities
    print("Creating entities...")
    response = await registry.execute(
        "memory",
        "create_entities",
        entities=[
            {
                "name": "Alice",
                "entityType": "Person",
                "observations": [
                    "Alice is a software engineer",
                    "Alice likes Python programming"
                ]
            },
            {
                "name": "Bob",
                "entityType": "Person",
                "observations": [
                    "Bob is a data scientist",
                    "Bob works with Alice"
                ]
            },
            {
                "name": "Project X",
                "entityType": "Project",
                "observations": [
                    "Project X is a machine learning project",
                    "Project X uses Python and TensorFlow"
                ]
            }
        ]
    )
    print("Entities created:")
    for entity in response.result["created_entities"]:
        print(f"- {entity['name']} ({entity['entityType']})")
    
    # Create relations
    print("\nCreating relations...")
    response = await registry.execute(
        "memory",
        "create_relations",
        relations=[
            {
                "from": "Alice",
                "to": "Project X",
                "relationType": "works on"
            },
            {
                "from": "Bob",
                "to": "Project X",
                "relationType": "works on"
            }
        ]
    )
    print("Relations created:")
    for relation in response.result["created_relations"]:
        print(f"- {relation['from']} {relation['relationType']} {relation['to']}")
    
    # Search for nodes
    print("\nSearching for nodes...")
    response = await registry.execute(
        "memory",
        "search_nodes",
        query="Python"
    )
    print("Search results:")
    for entity in response.result["entities"]:
        print(f"- {entity['name']} ({entity['entityType']})")
        print("  Observations:")
        for obs in entity["observations"]:
            print(f"  * {obs}")
    
    # === Network operations ===
    print("\n=== Network Operations ===")
    
    # Make an HTTP GET request
    print("Making an HTTP GET request...")
    try:
        response = await registry.execute(
            "network",
            "http_get",
            url="https://httpbin.org/get",
            params={"param1": "value1", "param2": "value2"}
        )
        print(f"Response status: {response.result['status']}")
        print(f"Response data: {response.result['data']}")
    except Exception as e:
        print(f"Error making HTTP request: {str(e)}")
    
    # === Tool operations ===
    print("\n=== Tool Operations ===")
    
    # List available tools
    print("Listing available tools...")
    response = await registry.execute(
        "tool",
        "list_tools"
    )
    print("Available tools:")
    for name, definition in response.result["tools"].items():
        print(f"- {name}: {definition['description']}")
    
    # Execute the time check tool
    print("\nExecuting the time check tool...")
    response = await registry.execute(
        "tool",
        "execute_tool",
        tool_name="check_time",
        parameters={"timezone": "America/New_York"}
    )
    print(f"Current time: {response.result['result']['time']}")
    
    # Execute the weather check tool
    print("\nExecuting the weather check tool...")
    response = await registry.execute(
        "tool",
        "execute_tool",
        tool_name="check_weather",
        parameters={"location": "New York"}
    )
    print(f"Weather in {response.result['result']['location']}:")
    print(f"Condition: {response.result['result']['condition']}")
    print(f"Temperature: {response.result['result']['temperature']}°C")
    print(f"Humidity: {response.result['result']['humidity']}%")
    
    print("\nMCP Demo completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_demo())
