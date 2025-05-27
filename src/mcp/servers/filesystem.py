"""
FileSystem MCP Server

This module implements an MCP server for filesystem operations, providing
a safe and standardized interface for agents to interact with the file system.
"""

from typing import Dict, Any, List, Optional, Union, Set
import os
import shutil
import json
import logging
import asyncio
from pathlib import Path
import glob
import re

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class FileSystemMCPServer(MCPServer):
    """MCP Server for filesystem operations"""
    
    def __init__(self, allowed_directories: Optional[List[str]] = None):
        """Initialize the filesystem MCP server with allowed directories
        
        Args:
            allowed_directories: List of directories that are allowed to be accessed.
                                If None, the current directory will be allowed.
        """
        super().__init__(
            name="filesystem",
            description="MCP Server for filesystem operations"
        )
        
        # Set up allowed directories for security
        if allowed_directories is None:
            self.allowed_directories = [os.getcwd()]
        else:
            self.allowed_directories = [os.path.abspath(d) for d in allowed_directories]
        
        logger.info(f"FileSystem MCP Server initialized with allowed directories: {self.allowed_directories}")
    
    def _register_operations(self):
        """Register all file system operations"""
        self.register_operation(
            "read_file",
            self.read_file,
            "Read the contents of a file"
        )
        
        self.register_operation(
            "write_file",
            self.write_file,
            "Write content to a file"
        )
        
        self.register_operation(
            "create_directory",
            self.create_directory,
            "Create a new directory"
        )
        
        self.register_operation(
            "list_directory",
            self.list_directory,
            "List the contents of a directory"
        )
        
        self.register_operation(
            "directory_tree",
            self.directory_tree,
            "Get a recursive directory tree"
        )
        
        self.register_operation(
            "delete_file",
            self.delete_file,
            "Delete a file"
        )
        
        self.register_operation(
            "move_file",
            self.move_file,
            "Move or rename a file"
        )
        
        self.register_operation(
            "copy_file",
            self.copy_file,
            "Copy a file"
        )
        
        self.register_operation(
            "get_file_info",
            self.get_file_info,
            "Get information about a file"
        )
        
        self.register_operation(
            "search_files",
            self.search_files,
            "Search for files matching a pattern"
        )
        
        self.register_operation(
            "read_multiple_files",
            self.read_multiple_files,
            "Read multiple files at once"
        )
        
        self.register_operation(
            "list_allowed_directories",
            self.list_allowed_directories,
            "List the directories that are allowed to be accessed"
        )
        
        self.register_operation(
            "edit_file",
            self.edit_file,
            "Make line-based edits to a file"
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
    
    async def read_file(self, path: str) -> Dict[str, Any]:
        """Read the contents of a file
        
        Args:
            path: Path to the file
            
        Returns:
            Dictionary with the file contents
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the file exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"File {path} does not exist")
        
        # Check if it's a file
        if not os.path.isfile(path):
            raise ValueError(f"Path {path} is not a file")
        
        # Read the file
        try:
            with open(path, "r") as f:
                content = f.read()
                
            return {
                "path": path,
                "content": content,
                "size": os.path.getsize(path)
            }
        except Exception as e:
            raise RuntimeError(f"Error reading file {path}: {str(e)}")
    
    async def write_file(self, path: str, content: str) -> Dict[str, Any]:
        """Write content to a file
        
        Args:
            path: Path to the file
            content: Content to write
            
        Returns:
            Dictionary with the file path and size
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Create the directory if it doesn't exist
        directory = os.path.dirname(path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
        
        # Write the file
        try:
            with open(path, "w") as f:
                f.write(content)
                
            return {
                "path": path,
                "size": os.path.getsize(path)
            }
        except Exception as e:
            raise RuntimeError(f"Error writing file {path}: {str(e)}")
    
    async def create_directory(self, path: str) -> Dict[str, Any]:
        """Create a new directory
        
        Args:
            path: Path to the directory
            
        Returns:
            Dictionary with the directory path
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Create the directory
        try:
            os.makedirs(path, exist_ok=True)
            
            return {
                "path": path
            }
        except Exception as e:
            raise RuntimeError(f"Error creating directory {path}: {str(e)}")
    
    async def list_directory(self, path: str) -> Dict[str, Any]:
        """List the contents of a directory
        
        Args:
            path: Path to the directory
            
        Returns:
            Dictionary with the directory contents
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the directory exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory {path} does not exist")
        
        # Check if it's a directory
        if not os.path.isdir(path):
            raise ValueError(f"Path {path} is not a directory")
        
        # List the directory
        try:
            items = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                is_dir = os.path.isdir(item_path)
                
                items.append({
                    "name": item,
                    "path": item_path,
                    "type": "directory" if is_dir else "file",
                    "size": None if is_dir else os.path.getsize(item_path),
                    "modified": os.path.getmtime(item_path)
                })
            
            return {
                "path": path,
                "items": items
            }
        except Exception as e:
            raise RuntimeError(f"Error listing directory {path}: {str(e)}")
    
    async def directory_tree(self, path: str) -> Dict[str, Any]:
        """Get a recursive directory tree
        
        Args:
            path: Path to the directory
            
        Returns:
            Dictionary with the directory tree
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the directory exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory {path} does not exist")
        
        # Check if it's a directory
        if not os.path.isdir(path):
            raise ValueError(f"Path {path} is not a directory")
        
        # Get the directory tree
        def get_tree(dir_path):
            result = {
                "name": os.path.basename(dir_path),
                "type": "directory",
                "children": []
            }
            
            try:
                for item in os.listdir(dir_path):
                    item_path = os.path.join(dir_path, item)
                    is_dir = os.path.isdir(item_path)
                    
                    if is_dir:
                        result["children"].append(get_tree(item_path))
                    else:
                        result["children"].append({
                            "name": item,
                            "type": "file"
                        })
            except PermissionError:
                # Skip directories we can't access
                pass
            
            return result
        
        try:
            tree = get_tree(path)
            return {
                "path": path,
                "tree": tree
            }
        except Exception as e:
            raise RuntimeError(f"Error getting directory tree for {path}: {str(e)}")
    
    async def delete_file(self, path: str) -> Dict[str, Any]:
        """Delete a file
        
        Args:
            path: Path to the file
            
        Returns:
            Dictionary with the file path
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the file exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"File {path} does not exist")
        
        # Delete the file
        try:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            
            return {
                "path": path
            }
        except Exception as e:
            raise RuntimeError(f"Error deleting {path}: {str(e)}")
    
    async def move_file(self, source: str, destination: str) -> Dict[str, Any]:
        """Move or rename a file
        
        Args:
            source: Source path
            destination: Destination path
            
        Returns:
            Dictionary with the source and destination paths
        """
        # Security check
        if not self._is_path_allowed(source) or not self._is_path_allowed(destination):
            raise ValueError(f"One of the paths is not within allowed directories")
        
        # Check if the source exists
        if not os.path.exists(source):
            raise FileNotFoundError(f"Source {source} does not exist")
        
        # Check if the destination already exists
        if os.path.exists(destination):
            raise FileExistsError(f"Destination {destination} already exists")
        
        # Create the destination directory if needed
        dest_dir = os.path.dirname(destination)
        if dest_dir and not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)
        
        # Move the file
        try:
            shutil.move(source, destination)
            
            return {
                "source": source,
                "destination": destination
            }
        except Exception as e:
            raise RuntimeError(f"Error moving {source} to {destination}: {str(e)}")
    
    async def copy_file(self, source: str, destination: str) -> Dict[str, Any]:
        """Copy a file
        
        Args:
            source: Source path
            destination: Destination path
            
        Returns:
            Dictionary with the source and destination paths
        """
        # Security check
        if not self._is_path_allowed(source) or not self._is_path_allowed(destination):
            raise ValueError(f"One of the paths is not within allowed directories")
        
        # Check if the source exists
        if not os.path.exists(source):
            raise FileNotFoundError(f"Source {source} does not exist")
        
        # Create the destination directory if needed
        dest_dir = os.path.dirname(destination)
        if dest_dir and not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)
        
        # Copy the file
        try:
            if os.path.isdir(source):
                shutil.copytree(source, destination)
            else:
                shutil.copy2(source, destination)
            
            return {
                "source": source,
                "destination": destination
            }
        except Exception as e:
            raise RuntimeError(f"Error copying {source} to {destination}: {str(e)}")
    
    async def get_file_info(self, path: str) -> Dict[str, Any]:
        """Get information about a file
        
        Args:
            path: Path to the file
            
        Returns:
            Dictionary with file information
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the file exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"File {path} does not exist")
        
        # Get file information
        try:
            stat = os.stat(path)
            
            return {
                "path": path,
                "name": os.path.basename(path),
                "directory": os.path.dirname(path),
                "type": "directory" if os.path.isdir(path) else "file",
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "accessed": stat.st_atime,
                "permissions": stat.st_mode
            }
        except Exception as e:
            raise RuntimeError(f"Error getting file info for {path}: {str(e)}")
    
    async def search_files(self, path: str, pattern: str, exclude_patterns: Optional[List[str]] = None) -> Dict[str, Any]:
        """Search for files matching a pattern
        
        Args:
            path: Base path to search from
            pattern: Pattern to search for (glob syntax)
            exclude_patterns: Patterns to exclude
            
        Returns:
            Dictionary with matching files
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the directory exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"Directory {path} does not exist")
        
        # Check if it's a directory
        if not os.path.isdir(path):
            raise ValueError(f"Path {path} is not a directory")
        
        # Search for files
        try:
            matches = []
            
            for root, dirs, files in os.walk(path):
                # Skip excluded directories
                if exclude_patterns:
                    dirs[:] = [d for d in dirs if not any(re.match(ep, d) for ep in exclude_patterns)]
                
                # Check files against the pattern
                for file in files:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, path)
                    
                    # Skip excluded files
                    if exclude_patterns and any(re.match(ep, file) for ep in exclude_patterns):
                        continue
                    
                    # Check if the file matches the pattern
                    if re.match(pattern, file) or re.match(pattern, rel_path):
                        stat = os.stat(file_path)
                        matches.append({
                            "path": file_path,
                            "relative_path": rel_path,
                            "type": "file",
                            "size": stat.st_size,
                            "modified": stat.st_mtime
                        })
                
                # Also check directories against the pattern
                for dir_name in dirs:
                    dir_path = os.path.join(root, dir_name)
                    rel_path = os.path.relpath(dir_path, path)
                    
                    # Check if the directory matches the pattern
                    if re.match(pattern, dir_name) or re.match(pattern, rel_path):
                        stat = os.stat(dir_path)
                        matches.append({
                            "path": dir_path,
                            "relative_path": rel_path,
                            "type": "directory",
                            "size": None,
                            "modified": stat.st_mtime
                        })
            
            return {
                "base_path": path,
                "pattern": pattern,
                "matches": matches
            }
        except Exception as e:
            raise RuntimeError(f"Error searching files in {path}: {str(e)}")
    
    async def read_multiple_files(self, paths: List[str]) -> Dict[str, Any]:
        """Read multiple files at once
        
        Args:
            paths: List of file paths
            
        Returns:
            Dictionary with file contents
        """
        results = {}
        errors = {}
        
        for path in paths:
            # Security check
            if not self._is_path_allowed(path):
                errors[path] = f"Path {path} is not within allowed directories"
                continue
            
            # Check if the file exists
            if not os.path.exists(path):
                errors[path] = f"File {path} does not exist"
                continue
            
            # Check if it's a file
            if not os.path.isfile(path):
                errors[path] = f"Path {path} is not a file"
                continue
            
            # Read the file
            try:
                with open(path, "r") as f:
                    content = f.read()
                
                results[path] = {
                    "content": content,
                    "size": os.path.getsize(path)
                }
            except Exception as e:
                errors[path] = f"Error reading file: {str(e)}"
        
        return {
            "results": results,
            "errors": errors
        }
    
    async def list_allowed_directories(self) -> Dict[str, Any]:
        """List the directories that are allowed to be accessed
        
        Returns:
            Dictionary with allowed directories
        """
        return {
            "allowed_directories": self.allowed_directories
        }
    
    async def edit_file(self, path: str, edits: List[Dict[str, str]], dry_run: bool = False) -> Dict[str, Any]:
        """Make line-based edits to a file
        
        Args:
            path: Path to the file
            edits: List of edits, each with oldText and newText
            dry_run: If True, don't actually make the changes, just return the diff
            
        Returns:
            Dictionary with the diff or the file path
        """
        # Security check
        if not self._is_path_allowed(path):
            raise ValueError(f"Path {path} is not within allowed directories")
        
        # Check if the file exists
        if not os.path.exists(path):
            raise FileNotFoundError(f"File {path} does not exist")
        
        # Check if it's a file
        if not os.path.isfile(path):
            raise ValueError(f"Path {path} is not a file")
        
        # Read the file
        try:
            with open(path, "r") as f:
                content = f.read()
            
            # Create a diff
            original_content = content
            
            # Apply the edits
            for edit in edits:
                old_text = edit.get("oldText", "")
                new_text = edit.get("newText", "")
                
                # Check if we should allow multiple replacements
                allow_multiple = edit.get("allowMultiple", False)
                
                if allow_multiple:
                    content = content.replace(old_text, new_text)
                else:
                    # Make sure the old text appears exactly once
                    if content.count(old_text) != 1:
                        if dry_run:
                            # Just warn in dry run mode
                            logger.warning(f"Old text appears {content.count(old_text)} times in {path}")
                        else:
                            raise ValueError(f"Old text appears {content.count(old_text)} times in {path}")
                    
                    content = content.replace(old_text, new_text, 1)
            
            # Generate a diff
            diff = []
            old_lines = original_content.splitlines()
            new_lines = content.splitlines()
            
            # Simple diff algorithm
            import difflib
            diff_lines = list(difflib.unified_diff(
                old_lines,
                new_lines,
                fromfile=f"a/{os.path.basename(path)}",
                tofile=f"b/{os.path.basename(path)}",
                lineterm=""
            ))
            
            # If it's not a dry run, write the changes
            if not dry_run:
                with open(path, "w") as f:
                    f.write(content)
            
            return {
                "path": path,
                "dry_run": dry_run,
                "diff": "\n".join(diff_lines)
            }
        except Exception as e:
            raise RuntimeError(f"Error editing file {path}: {str(e)}")
