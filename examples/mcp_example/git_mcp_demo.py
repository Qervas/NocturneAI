#!/usr/bin/env python3
"""
Git MCP Demo

This script demonstrates how to use the MCP Git server to perform
version control operations on a repository.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
import shutil

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.mcp import MCPRegistry
from src.mcp.servers.filesystem import FileSystemMCPServer
from src.mcp.servers.git import GitMCPServer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def run_git_demo():
    """Run the MCP Git demo"""
    # Create the MCP registry
    registry = MCPRegistry()
    
    # Create demo directory
    demo_dir = Path(__file__).parent / "demo_git_repo"
    
    # Remove if it exists to start fresh
    if os.path.exists(demo_dir):
        shutil.rmtree(demo_dir)
    
    os.makedirs(demo_dir, exist_ok=True)
    
    # Initialize MCP servers
    filesystem_server = FileSystemMCPServer(allowed_directories=[str(demo_dir)])
    git_server = GitMCPServer(allowed_directories=[str(demo_dir)])
    
    # Register servers with the registry
    registry.register_server(filesystem_server)
    registry.register_server(git_server)
    
    print("=== Git MCP Demo ===")
    
    # Step 1: Initialize a Git repository
    print("\n1. Initializing Git repository...")
    
    # First, we'll use a normal subprocess call to initialize the repository
    # since the Git MCP server doesn't have a git init operation
    process = await asyncio.create_subprocess_exec(
        "git", "init",
        cwd=str(demo_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode == 0:
        print(f"Repository initialized: {stdout.decode().strip()}")
    else:
        print(f"Error initializing repository: {stderr.decode().strip()}")
        return
    
    # Configure git user for the demo
    process = await asyncio.create_subprocess_exec(
        "git", "config", "user.name", "MCP Demo",
        cwd=str(demo_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    await process.communicate()
    
    process = await asyncio.create_subprocess_exec(
        "git", "config", "user.email", "mcp@example.com",
        cwd=str(demo_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    await process.communicate()
    
    # Step 2: Create a file using the filesystem MCP server
    print("\n2. Creating a file...")
    response = await registry.execute(
        "filesystem",
        "write_file",
        path=str(demo_dir / "README.md"),
        content="# Git MCP Demo\n\nThis is a demo repository for testing the Git MCP server."
    )
    print(f"Created file: {response.result['path']}")
    
    # Step 3: Check Git status
    print("\n3. Checking Git status...")
    response = await registry.execute(
        "git",
        "git_status",
        repo_path=str(demo_dir)
    )
    print(f"Git status:\n{response.result['output']}")
    
    # Step 4: Add the file to the staging area
    print("\n4. Adding file to staging area...")
    response = await registry.execute(
        "git",
        "git_add",
        repo_path=str(demo_dir),
        files=["README.md"]
    )
    print(f"Git add result:\n{response.result['output']}")
    
    # Step 5: Check Git status again
    print("\n5. Checking Git status after staging...")
    response = await registry.execute(
        "git",
        "git_status",
        repo_path=str(demo_dir)
    )
    print(f"Git status:\n{response.result['output']}")
    
    # Step 6: Commit the changes
    print("\n6. Committing changes...")
    response = await registry.execute(
        "git",
        "git_commit",
        repo_path=str(demo_dir),
        message="Initial commit"
    )
    print(f"Git commit result:\n{response.result['output']}")
    
    # Step 7: Check Git log
    print("\n7. Checking Git log...")
    response = await registry.execute(
        "git",
        "git_log",
        repo_path=str(demo_dir)
    )
    print(f"Git log:\n{response.result['output']}")
    
    # Step 8: Create a new branch
    print("\n8. Creating a new branch...")
    response = await registry.execute(
        "git",
        "git_create_branch",
        repo_path=str(demo_dir),
        branch_name="feature"
    )
    print(f"Git branch result:\n{response.result['output']}")
    
    # Step 9: Modify the file
    print("\n9. Modifying the file in the feature branch...")
    response = await registry.execute(
        "filesystem",
        "write_file",
        path=str(demo_dir / "README.md"),
        content="# Git MCP Demo\n\nThis is a demo repository for testing the Git MCP server.\n\n## Feature Branch\n\nThis content was added in the feature branch."
    )
    print(f"Modified file: {response.result['path']}")
    
    # Step 10: Check diff
    print("\n10. Checking diff of the changes...")
    response = await registry.execute(
        "git",
        "git_diff_unstaged",
        repo_path=str(demo_dir)
    )
    print(f"Git diff:\n{response.result['output']}")
    
    # Step 11: Stage and commit changes
    print("\n11. Staging changes...")
    response = await registry.execute(
        "git",
        "git_add",
        repo_path=str(demo_dir),
        files=["README.md"]
    )
    print(f"Git add result:\n{response.result['output']}")
    
    print("\n12. Committing changes in feature branch...")
    response = await registry.execute(
        "git",
        "git_commit",
        repo_path=str(demo_dir),
        message="Update README in feature branch"
    )
    print(f"Git commit result:\n{response.result['output']}")
    
    # Step 13: Switch back to master branch
    print("\n13. Switching back to master branch...")
    response = await registry.execute(
        "git",
        "git_checkout",
        repo_path=str(demo_dir),
        branch_name="master"
    )
    print(f"Git checkout result:\n{response.result['output']}")
    
    # Step 14: Read file content to verify it's the original version
    print("\n14. Reading file in master branch...")
    response = await registry.execute(
        "filesystem",
        "read_file",
        path=str(demo_dir / "README.md")
    )
    print(f"File content in master branch:\n{response.result['content']}")
    
    # Step 15: Compare the branches
    print("\n15. Comparing branches...")
    response = await registry.execute(
        "git",
        "git_diff",
        repo_path=str(demo_dir),
        target="feature"
    )
    print(f"Diff between master and feature branches:\n{response.result['output']}")
    
    print("\nGit MCP Demo completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_git_demo())
