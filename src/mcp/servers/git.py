"""
Git MCP Server

This module implements an MCP server for Git operations, providing
a standardized interface for agents to interact with Git repositories.
"""

from typing import Dict, Any, List, Optional, Union
import os
import logging
import asyncio
import subprocess
from pathlib import Path

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class GitMCPServer(MCPServer):
    """MCP Server for Git operations"""
    
    def __init__(self, allowed_directories: Optional[List[str]] = None):
        """Initialize the Git MCP server with allowed directories
        
        Args:
            allowed_directories: List of directories that are allowed to be accessed.
                                If None, the current directory will be allowed.
        """
        super().__init__(
            name="git",
            description="MCP Server for Git operations"
        )
        
        # Set up allowed directories for security
        if allowed_directories is None:
            self.allowed_directories = [os.getcwd()]
        else:
            self.allowed_directories = [os.path.abspath(d) for d in allowed_directories]
        
        logger.info(f"Git MCP Server initialized with allowed directories: {self.allowed_directories}")
    
    def _register_operations(self):
        """Register all Git operations"""
        self.register_operation(
            "git_status",
            self.git_status,
            "Shows the working tree status"
        )
        
        self.register_operation(
            "git_add",
            self.git_add,
            "Adds file contents to the staging area"
        )
        
        self.register_operation(
            "git_commit",
            self.git_commit,
            "Records changes to the repository"
        )
        
        self.register_operation(
            "git_checkout",
            self.git_checkout,
            "Switches branches"
        )
        
        self.register_operation(
            "git_create_branch",
            self.git_create_branch,
            "Creates a new branch from an optional base branch"
        )
        
        self.register_operation(
            "git_log",
            self.git_log,
            "Shows the commit logs"
        )
        
        self.register_operation(
            "git_diff",
            self.git_diff,
            "Shows differences between branches or commits"
        )
        
        self.register_operation(
            "git_diff_staged",
            self.git_diff_staged,
            "Shows changes that are staged for commit"
        )
        
        self.register_operation(
            "git_diff_unstaged",
            self.git_diff_unstaged,
            "Shows changes in the working directory that are not yet staged"
        )
        
        self.register_operation(
            "git_reset",
            self.git_reset,
            "Unstages all staged changes"
        )
        
        self.register_operation(
            "git_show",
            self.git_show,
            "Shows the contents of a commit"
        )
    
    def _is_path_allowed(self, path: str) -> bool:
        """Check if a path is within the allowed directories
        
        Args:
            path: The path to check
            
        Returns:
            True if the path is allowed, False otherwise
        """
        path = os.path.abspath(path)
        for allowed_dir in self.allowed_directories:
            if path.startswith(allowed_dir):
                return True
        return False
    
    async def _run_git_command(self, repo_path: str, command: List[str]) -> Dict[str, Any]:
        """Run a Git command in a specific repository
        
        Args:
            repo_path: Path to the Git repository
            command: Git command to run (without 'git')
            
        Returns:
            Dictionary with the command output
        """
        # Security check
        if not self._is_path_allowed(repo_path):
            raise ValueError(f"Repository path {repo_path} is not within allowed directories")
        
        # Check if the directory exists
        if not os.path.exists(repo_path):
            raise FileNotFoundError(f"Directory {repo_path} does not exist")
        
        # Check if it's a directory
        if not os.path.isdir(repo_path):
            raise ValueError(f"Path {repo_path} is not a directory")
        
        # Check if it's a Git repository
        git_dir = os.path.join(repo_path, ".git")
        if not os.path.exists(git_dir):
            raise ValueError(f"Path {repo_path} is not a Git repository")
        
        # Run the Git command
        try:
            full_command = ["git"] + command
            logger.info(f"Running Git command in {repo_path}: {' '.join(full_command)}")
            
            process = await asyncio.create_subprocess_exec(
                *full_command,
                cwd=repo_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_message = stderr.decode("utf-8", errors="replace").strip()
                raise RuntimeError(f"Git command failed: {error_message}")
            
            output = stdout.decode("utf-8", errors="replace").strip()
            
            return {
                "repo_path": repo_path,
                "command": " ".join(full_command),
                "output": output
            }
        except Exception as e:
            raise RuntimeError(f"Error running Git command: {str(e)}")
    
    async def git_status(self, repo_path: str) -> Dict[str, Any]:
        """Shows the working tree status
        
        Args:
            repo_path: Path to the Git repository
            
        Returns:
            Dictionary with the Git status
        """
        return await self._run_git_command(repo_path, ["status"])
    
    async def git_add(self, repo_path: str, files: List[str]) -> Dict[str, Any]:
        """Adds file contents to the staging area
        
        Args:
            repo_path: Path to the Git repository
            files: List of files to add
            
        Returns:
            Dictionary with the Git add output
        """
        # Check each file path
        for file_path in files:
            full_path = os.path.join(repo_path, file_path)
            if not self._is_path_allowed(full_path):
                raise ValueError(f"File path {full_path} is not within allowed directories")
        
        return await self._run_git_command(repo_path, ["add"] + files)
    
    async def git_commit(self, repo_path: str, message: str) -> Dict[str, Any]:
        """Records changes to the repository
        
        Args:
            repo_path: Path to the Git repository
            message: Commit message
            
        Returns:
            Dictionary with the Git commit output
        """
        return await self._run_git_command(repo_path, ["commit", "-m", message])
    
    async def git_checkout(self, repo_path: str, branch_name: str) -> Dict[str, Any]:
        """Switches branches
        
        Args:
            repo_path: Path to the Git repository
            branch_name: Branch to checkout
            
        Returns:
            Dictionary with the Git checkout output
        """
        return await self._run_git_command(repo_path, ["checkout", branch_name])
    
    async def git_create_branch(self, repo_path: str, branch_name: str, base_branch: Optional[str] = None) -> Dict[str, Any]:
        """Creates a new branch from an optional base branch
        
        Args:
            repo_path: Path to the Git repository
            branch_name: Name of the new branch
            base_branch: Base branch to create from (if None, use current branch)
            
        Returns:
            Dictionary with the Git branch output
        """
        if base_branch:
            return await self._run_git_command(repo_path, ["checkout", "-b", branch_name, base_branch])
        else:
            return await self._run_git_command(repo_path, ["checkout", "-b", branch_name])
    
    async def git_log(self, repo_path: str, max_count: int = 10) -> Dict[str, Any]:
        """Shows the commit logs
        
        Args:
            repo_path: Path to the Git repository
            max_count: Maximum number of commits to show
            
        Returns:
            Dictionary with the Git log output
        """
        return await self._run_git_command(repo_path, ["log", f"--max-count={max_count}", "--pretty=format:%h %s (%an, %ar)"])
    
    async def git_diff(self, repo_path: str, target: str) -> Dict[str, Any]:
        """Shows differences between branches or commits
        
        Args:
            repo_path: Path to the Git repository
            target: Branch or commit to diff against
            
        Returns:
            Dictionary with the Git diff output
        """
        return await self._run_git_command(repo_path, ["diff", target])
    
    async def git_diff_staged(self, repo_path: str) -> Dict[str, Any]:
        """Shows changes that are staged for commit
        
        Args:
            repo_path: Path to the Git repository
            
        Returns:
            Dictionary with the Git diff --staged output
        """
        return await self._run_git_command(repo_path, ["diff", "--staged"])
    
    async def git_diff_unstaged(self, repo_path: str) -> Dict[str, Any]:
        """Shows changes in the working directory that are not yet staged
        
        Args:
            repo_path: Path to the Git repository
            
        Returns:
            Dictionary with the Git diff output
        """
        return await self._run_git_command(repo_path, ["diff"])
    
    async def git_reset(self, repo_path: str) -> Dict[str, Any]:
        """Unstages all staged changes
        
        Args:
            repo_path: Path to the Git repository
            
        Returns:
            Dictionary with the Git reset output
        """
        return await self._run_git_command(repo_path, ["reset"])
    
    async def git_show(self, repo_path: str, revision: str) -> Dict[str, Any]:
        """Shows the contents of a commit
        
        Args:
            repo_path: Path to the Git repository
            revision: Revision to show
            
        Returns:
            Dictionary with the Git show output
        """
        return await self._run_git_command(repo_path, ["show", revision])
