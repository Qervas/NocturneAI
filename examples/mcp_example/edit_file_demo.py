#!/usr/bin/env python3
"""
MCP Edit File Demo

This script demonstrates how to use the MCP filesystem server to perform
precise multi-line editing operations on files.
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def run_edit_file_demo():
    """Run the MCP edit file demo"""
    # Create the MCP registry
    registry = MCPRegistry()
    
    # Create demo directory
    demo_dir = Path(__file__).parent / "demo_files"
    os.makedirs(demo_dir, exist_ok=True)
    
    # Initialize the filesystem MCP server
    filesystem_server = FileSystemMCPServer(allowed_directories=[str(demo_dir)])
    
    # Register the server with the registry
    registry.register_server(filesystem_server)
    
    # Create a sample file with code for editing
    code_file_path = demo_dir / "sample_code.py"
    sample_code = """#!/usr/bin/env python3
# Sample code file for edit demonstration

def calculate_sum(a, b):
    # This function calculates the sum of two numbers
    return a + b

def calculate_difference(a, b):
    # This function calculates the difference between two numbers
    return a - b

def main():
    # Main function
    print("Starting calculation...")
    
    x = 10
    y = 5
    
    print(f"Sum of {x} and {y} is {calculate_sum(x, y)}")
    print(f"Difference of {x} and {y} is {calculate_difference(x, y)}")

if __name__ == "__main__":
    main()
"""
    
    # Write the initial file
    print("=== Creating sample code file ===")
    response = await registry.execute(
        "filesystem",
        "write_file",
        path=str(code_file_path),
        content=sample_code
    )
    print(f"Created file: {response.result['path']}")
    
    # Perform multiple edits on the file
    print("\n=== Performing multiple edits ===")
    
    # First, let's do a dry run to preview changes
    print("Dry run (preview changes):")
    response = await registry.execute(
        "filesystem",
        "edit_file",
        path=str(code_file_path),
        edits=[
            # Edit 1: Replace the sum function with a new implementation
            {
                "oldText": "def calculate_sum(a, b):\n    # This function calculates the sum of two numbers\n    return a + b",
                "newText": "def calculate_sum(a, b):\n    # This function calculates the sum of two numbers\n    # Updated to include logging\n    print(f\"Calculating sum of {a} and {b}\")\n    return a + b",
                "allowMultiple": False
            },
            # Edit 2: Replace the main function with a more complex version
            {
                "oldText": "def main():\n    # Main function\n    print(\"Starting calculation...\")\n    \n    x = 10\n    y = 5\n    \n    print(f\"Sum of {x} and {y} is {calculate_sum(x, y)}\")\n    print(f\"Difference of {x} and {y} is {calculate_difference(x, y)}\")",
                "newText": "def main():\n    # Main function with enhanced output\n    print(\"Starting enhanced calculation...\")\n    \n    x = 10\n    y = 5\n    z = 7\n    \n    print(f\"Sum of {x} and {y} is {calculate_sum(x, y)}\")\n    print(f\"Difference of {x} and {y} is {calculate_difference(x, y)}\")\n    print(f\"Sum of all numbers is {calculate_sum(x, calculate_sum(y, z))}\")",
                "allowMultiple": False
            },
            # Edit 3: Add a new function
            {
                "oldText": "def calculate_difference(a, b):\n    # This function calculates the difference between two numbers\n    return a - b",
                "newText": "def calculate_difference(a, b):\n    # This function calculates the difference between two numbers\n    return a - b\n\ndef calculate_product(a, b):\n    # This function calculates the product of two numbers\n    return a * b",
                "allowMultiple": False
            }
        ],
        dry_run=True
    )
    print(f"Diff preview:\n{response.result['diff']}")
    
    # Now, let's apply the changes
    print("\nApplying changes:")
    response = await registry.execute(
        "filesystem",
        "edit_file",
        path=str(code_file_path),
        edits=[
            # Edit 1: Replace the sum function with a new implementation
            {
                "oldText": "def calculate_sum(a, b):\n    # This function calculates the sum of two numbers\n    return a + b",
                "newText": "def calculate_sum(a, b):\n    # This function calculates the sum of two numbers\n    # Updated to include logging\n    print(f\"Calculating sum of {a} and {b}\")\n    return a + b",
                "allowMultiple": False
            },
            # Edit 2: Replace the main function with a more complex version
            {
                "oldText": "def main():\n    # Main function\n    print(\"Starting calculation...\")\n    \n    x = 10\n    y = 5\n    \n    print(f\"Sum of {x} and {y} is {calculate_sum(x, y)}\")\n    print(f\"Difference of {x} and {y} is {calculate_difference(x, y)}\")",
                "newText": "def main():\n    # Main function with enhanced output\n    print(\"Starting enhanced calculation...\")\n    \n    x = 10\n    y = 5\n    z = 7\n    \n    print(f\"Sum of {x} and {y} is {calculate_sum(x, y)}\")\n    print(f\"Difference of {x} and {y} is {calculate_difference(x, y)}\")\n    print(f\"Sum of all numbers is {calculate_sum(x, calculate_sum(y, z))}\")",
                "allowMultiple": False
            },
            # Edit 3: Add a new function
            {
                "oldText": "def calculate_difference(a, b):\n    # This function calculates the difference between two numbers\n    return a - b",
                "newText": "def calculate_difference(a, b):\n    # This function calculates the difference between two numbers\n    return a - b\n\ndef calculate_product(a, b):\n    # This function calculates the product of two numbers\n    return a * b",
                "allowMultiple": False
            }
        ],
        dry_run=False
    )
    print(f"Changes applied:\n{response.result['diff']}")
    
    # Read the updated file
    print("\n=== Reading the updated file ===")
    response = await registry.execute(
        "filesystem",
        "read_file",
        path=str(code_file_path)
    )
    print(f"Updated file content:\n{response.result['content']}")
    
    print("\nEdit file demo completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_edit_file_demo())
