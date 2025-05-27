"""
Memory capabilities for NocturneAI agents.

This module implements various memory systems that enable agents
to store and retrieve information over time.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set, Union
from datetime import datetime
import json
import uuid
import os
import sqlite3
import aiofiles
from pathlib import Path

from ..core.types import AgentCapability
from .base import MemoryCapability

logger = logging.getLogger(__name__)


class SimpleMemory(MemoryCapability):
    """
    Simple in-memory storage for agent memory.
    
    This capability provides basic key-value storage that persists
    only for the lifetime of the agent.
    """
    
    CAPABILITY = AgentCapability.MEMORY
    
    def __init__(self, **config):
        """
        Initialize the simple memory capability.
        
        Args:
            **config: Configuration parameters
        """
        super().__init__(**config)
        self.memory: Dict[str, Any] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}
    
    async def remember(self, key: str, value: Any = None) -> Any:
        """
        Store or retrieve a value from the agent's memory.
        
        Args:
            key: Key to store or retrieve
            value: Value to store (if None, retrieves the value)
            
        Returns:
            The stored or retrieved value
        """
        if value is None:
            # Retrieve value
            return self.memory.get(key)
        
        # Store value
        self.memory[key] = value
        
        # Update metadata
        self.metadata[key] = {
            'updated_at': datetime.now().isoformat(),
            'type': type(value).__name__
        }
        
        return value
    
    async def forget(self, key: str) -> bool:
        """
        Remove a value from the agent's memory.
        
        Args:
            key: Key to remove
            
        Returns:
            True if the value was removed, False otherwise
        """
        if key in self.memory:
            del self.memory[key]
            if key in self.metadata:
                del self.metadata[key]
            return True
        return False
    
    async def get_keys(self) -> List[str]:
        """
        Get all keys in the agent's memory.
        
        Returns:
            List of keys
        """
        return list(self.memory.keys())
    
    async def get_metadata(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific key.
        
        Args:
            key: Key to get metadata for
            
        Returns:
            Metadata for the key, or None if not found
        """
        return self.metadata.get(key)
    
    async def get_all_with_metadata(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all memory entries with their metadata.
        
        Returns:
            Dictionary mapping keys to dictionaries with 'value' and 'metadata' fields
        """
        result = {}
        for key in self.memory:
            result[key] = {
                'value': self.memory[key],
                'metadata': self.metadata.get(key, {})
            }
        return result
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        self.memory.clear()
        self.metadata.clear()
        await super().cleanup()


class PersistentMemory(MemoryCapability):
    """
    Persistent memory capability that stores data to disk.
    
    This capability provides key-value storage that persists
    between agent sessions by storing data to disk.
    """
    
    CAPABILITY = AgentCapability.MEMORY
    
    def __init__(self, **config):
        """
        Initialize the persistent memory capability.
        
        Args:
            **config: Configuration parameters
                storage_dir: Directory to store memory files (default: 'agent_memory')
                agent_id: ID of the agent (default: None, will be set during initialization)
                auto_save: Whether to auto-save on updates (default: True)
                save_interval: Time between auto-saves in seconds (default: 60)
        """
        super().__init__(**config)
        self.storage_dir = config.get('storage_dir', 'agent_memory')
        self.agent_id = config.get('agent_id')
        self.auto_save = config.get('auto_save', True)
        self.save_interval = config.get('save_interval', 60)
        
        self.memory: Dict[str, Any] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}
        self.last_save_time = None
        self.save_task = None
        self.running = False
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        # Set agent ID if not provided
        if not self.agent_id:
            self.agent_id = agent.id
        
        # Create storage directory if it doesn't exist
        os.makedirs(os.path.join(self.storage_dir, self.agent_id), exist_ok=True)
        
        # Load memory from disk
        await self._load_memory()
        
        # Start auto-save task if enabled
        if self.auto_save:
            self.running = True
            self.save_task = asyncio.create_task(self._auto_save_loop())
    
    async def remember(self, key: str, value: Any = None) -> Any:
        """
        Store or retrieve a value from the agent's memory.
        
        Args:
            key: Key to store or retrieve
            value: Value to store (if None, retrieves the value)
            
        Returns:
            The stored or retrieved value
        """
        if value is None:
            # Retrieve value
            return self.memory.get(key)
        
        # Store value
        self.memory[key] = value
        
        # Update metadata
        self.metadata[key] = {
            'updated_at': datetime.now().isoformat(),
            'type': type(value).__name__
        }
        
        # Save if auto-save is disabled
        if not self.auto_save:
            await self._save_memory()
        
        return value
    
    async def forget(self, key: str) -> bool:
        """
        Remove a value from the agent's memory.
        
        Args:
            key: Key to remove
            
        Returns:
            True if the value was removed, False otherwise
        """
        if key in self.memory:
            del self.memory[key]
            if key in self.metadata:
                del self.metadata[key]
            
            # Save if auto-save is disabled
            if not self.auto_save:
                await self._save_memory()
            
            return True
        return False
    
    async def get_keys(self) -> List[str]:
        """
        Get all keys in the agent's memory.
        
        Returns:
            List of keys
        """
        return list(self.memory.keys())
    
    async def get_metadata(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific key.
        
        Args:
            key: Key to get metadata for
            
        Returns:
            Metadata for the key, or None if not found
        """
        return self.metadata.get(key)
    
    async def get_all_with_metadata(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all memory entries with their metadata.
        
        Returns:
            Dictionary mapping keys to dictionaries with 'value' and 'metadata' fields
        """
        result = {}
        for key in self.memory:
            result[key] = {
                'value': self.memory[key],
                'metadata': self.metadata.get(key, {})
            }
        return result
    
    async def save(self) -> bool:
        """
        Save memory to disk.
        
        Returns:
            True if the save was successful, False otherwise
        """
        return await self._save_memory()
    
    async def _save_memory(self) -> bool:
        """Save memory to disk"""
        try:
            # Prepare data
            data = {
                'memory': self.memory,
                'metadata': self.metadata,
                'saved_at': datetime.now().isoformat()
            }
            
            # Serialize data
            json_data = json.dumps(data, default=self._json_serialize)
            
            # Save to file
            memory_file = os.path.join(self.storage_dir, self.agent_id, 'memory.json')
            async with aiofiles.open(memory_file, 'w') as f:
                await f.write(json_data)
            
            self.last_save_time = datetime.now()
            logger.debug(f"Saved memory for agent {self.agent_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error saving memory for agent {self.agent_id}: {str(e)}", exc_info=True)
            return False
    
    async def _load_memory(self) -> bool:
        """Load memory from disk"""
        try:
            memory_file = os.path.join(self.storage_dir, self.agent_id, 'memory.json')
            
            # Check if file exists
            if not os.path.exists(memory_file):
                logger.debug(f"No memory file found for agent {self.agent_id}")
                return False
            
            # Load from file
            async with aiofiles.open(memory_file, 'r') as f:
                json_data = await f.read()
            
            # Parse data
            data = json.loads(json_data)
            
            self.memory = data.get('memory', {})
            self.metadata = data.get('metadata', {})
            
            logger.debug(f"Loaded memory for agent {self.agent_id}")
            return True
        except Exception as e:
            logger.error(f"Error loading memory for agent {self.agent_id}: {str(e)}", exc_info=True)
            return False
    
    async def _auto_save_loop(self) -> None:
        """Auto-save loop for periodic saving"""
        try:
            while self.running:
                await asyncio.sleep(self.save_interval)
                if self.memory:
                    await self._save_memory()
        except asyncio.CancelledError:
            logger.debug(f"Auto-save task cancelled for agent {self.agent_id}")
        except Exception as e:
            logger.error(f"Error in auto-save loop for agent {self.agent_id}: {str(e)}", exc_info=True)
    
    def _json_serialize(self, obj):
        """JSON serialization helper for complex objects"""
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        if isinstance(obj, (set, frozenset)):
            return list(obj)
        raise TypeError(f"Type {type(obj)} not serializable")
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        # Stop auto-save task
        if self.save_task:
            self.running = False
            self.save_task.cancel()
            try:
                await self.save_task
            except asyncio.CancelledError:
                pass
        
        # Save memory one last time
        await self._save_memory()
        
        # Clear memory
        self.memory.clear()
        self.metadata.clear()
        
        await super().cleanup()


class VectorMemory(MemoryCapability):
    """
    Vector-based memory system for semantic storage and retrieval.
    
    This capability enables storage and retrieval of information based on
    semantic similarity rather than exact key matching.
    """
    
    CAPABILITY = AgentCapability.MEMORY
    
    def __init__(self, **config):
        """
        Initialize the vector memory capability.
        
        Args:
            **config: Configuration parameters
                storage_dir: Directory to store vector database (default: 'agent_memory')
                agent_id: ID of the agent (default: None, will be set during initialization)
                embedding_model: Model to use for embeddings (default: None, will use agent's LLM)
                dimension: Dimension of embeddings (default: 1536)
                similarity_threshold: Threshold for similarity matches (default: 0.75)
        """
        super().__init__(**config)
        self.storage_dir = config.get('storage_dir', 'agent_memory')
        self.agent_id = config.get('agent_id')
        self.embedding_model = config.get('embedding_model')
        self.dimension = config.get('dimension', 1536)
        self.similarity_threshold = config.get('similarity_threshold', 0.75)
        
        self.conn = None
        self.memory_items = {}
        self.db_path = None
    
    async def initialize(self, agent) -> None:
        """Initialize the capability with the agent"""
        await super().initialize(agent)
        
        # Set agent ID if not provided
        if not self.agent_id:
            self.agent_id = agent.id
        
        # Create storage directory if it doesn't exist
        agent_dir = os.path.join(self.storage_dir, self.agent_id)
        os.makedirs(agent_dir, exist_ok=True)
        
        # Set database path
        self.db_path = os.path.join(agent_dir, 'vector_memory.db')
        
        # Initialize database
        await self._init_database()
        
        # Load existing items
        await self._load_items()
    
    async def _init_database(self) -> None:
        """Initialize the SQLite database"""
        # Connect to database
        self.conn = sqlite3.connect(self.db_path)
        
        # Create tables if they don't exist
        cursor = self.conn.cursor()
        
        # Items table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            key TEXT,
            value TEXT,
            created_at TEXT,
            updated_at TEXT,
            metadata TEXT
        )
        ''')
        
        # Vectors table
        cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS vectors (
            id TEXT PRIMARY KEY,
            item_id TEXT,
            vector BLOB,
            FOREIGN KEY (item_id) REFERENCES items (id)
        )
        ''')
        
        self.conn.commit()
    
    async def _load_items(self) -> None:
        """Load existing items from database"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT id, key, value, metadata FROM items')
        
        for row in cursor.fetchall():
            item_id, key, value_str, metadata_str = row
            try:
                value = json.loads(value_str)
                metadata = json.loads(metadata_str)
                
                self.memory_items[key] = {
                    'id': item_id,
                    'value': value,
                    'metadata': metadata
                }
            except json.JSONDecodeError:
                logger.warning(f"Failed to decode item {item_id} for key {key}")
    
    async def remember(self, key: str, value: Any = None) -> Any:
        """
        Store or retrieve a value from the agent's memory.
        
        Args:
            key: Key to store or retrieve
            value: Value to store (if None, retrieves the value)
            
        Returns:
            The stored or retrieved value
        """
        if value is None:
            # Retrieve value
            item = self.memory_items.get(key)
            return item['value'] if item else None
        
        # Store value
        item_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        # Create metadata
        metadata = {
            'created_at': now,
            'updated_at': now,
            'type': type(value).__name__
        }
        
        # Convert value to string for storage
        value_str = json.dumps(value, default=self._json_serialize)
        metadata_str = json.dumps(metadata, default=self._json_serialize)
        
        # Store in database
        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT OR REPLACE INTO items (id, key, value, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?, ?)',
            (item_id, key, value_str, now, now, metadata_str)
        )
        
        # Generate and store vector embedding
        if isinstance(value, (str, list, dict)):
            # Convert value to string for embedding
            if isinstance(value, (list, dict)):
                text = json.dumps(value)
            else:
                text = value
                
            # Get embedding
            embedding = await self._get_embedding(text)
            
            if embedding:
                # Store embedding
                cursor.execute(
                    'INSERT OR REPLACE INTO vectors (id, item_id, vector) VALUES (?, ?, ?)',
                    (str(uuid.uuid4()), item_id, self._serialize_vector(embedding))
                )
        
        self.conn.commit()
        
        # Update in-memory cache
        self.memory_items[key] = {
            'id': item_id,
            'value': value,
            'metadata': metadata
        }
        
        return value
    
    async def forget(self, key: str) -> bool:
        """
        Remove a value from the agent's memory.
        
        Args:
            key: Key to remove
            
        Returns:
            True if the value was removed, False otherwise
        """
        if key not in self.memory_items:
            return False
        
        item_id = self.memory_items[key]['id']
        
        # Remove from database
        cursor = self.conn.cursor()
        
        # Remove vectors first due to foreign key constraint
        cursor.execute('DELETE FROM vectors WHERE item_id = ?', (item_id,))
        
        # Remove item
        cursor.execute('DELETE FROM items WHERE id = ?', (item_id,))
        
        self.conn.commit()
        
        # Remove from in-memory cache
        del self.memory_items[key]
        
        return True
    
    async def get_keys(self) -> List[str]:
        """
        Get all keys in the agent's memory.
        
        Returns:
            List of keys
        """
        return list(self.memory_items.keys())
    
    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for items semantically similar to the query.
        
        Args:
            query: The search query
            limit: Maximum number of results to return
            
        Returns:
            List of matching items with similarity scores
        """
        # Get query embedding
        query_embedding = await self._get_embedding(query)
        if not query_embedding:
            return []
        
        # Search for similar items
        cursor = self.conn.cursor()
        cursor.execute('SELECT item_id, vector FROM vectors')
        
        results = []
        for row in cursor.fetchall():
            item_id, vector_blob = row
            
            # Deserialize vector
            vector = self._deserialize_vector(vector_blob)
            
            # Calculate similarity
            similarity = self._cosine_similarity(query_embedding, vector)
            
            # Check if above threshold
            if similarity >= self.similarity_threshold:
                results.append((item_id, similarity))
        
        # Sort by similarity (descending)
        results.sort(key=lambda x: x[1], reverse=True)
        
        # Limit results
        results = results[:limit]
        
        # Get item details
        items = []
        for item_id, similarity in results:
            cursor.execute('SELECT key, value, metadata FROM items WHERE id = ?', (item_id,))
            row = cursor.fetchone()
            
            if row:
                key, value_str, metadata_str = row
                try:
                    value = json.loads(value_str)
                    metadata = json.loads(metadata_str)
                    
                    items.append({
                        'key': key,
                        'value': value,
                        'metadata': metadata,
                        'similarity': similarity
                    })
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode item {item_id}")
        
        return items
    
    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Get embedding for text"""
        try:
            if self.embedding_model:
                # Use specified embedding model
                pass  # TODO: Implement embedding model interface
            elif self.agent and hasattr(self.agent.llm_provider, 'get_embedding'):
                # Use agent's LLM provider
                return await self.agent.llm_provider.get_embedding(text)
            else:
                logger.warning("No embedding model available")
                return None
        except Exception as e:
            logger.error(f"Error getting embedding: {str(e)}", exc_info=True)
            return None
    
    def _serialize_vector(self, vector: List[float]) -> bytes:
        """Serialize vector to bytes"""
        return json.dumps(vector).encode()
    
    def _deserialize_vector(self, blob: bytes) -> List[float]:
        """Deserialize vector from bytes"""
        return json.loads(blob.decode())
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must have the same dimension")
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0
        
        return dot_product / (norm1 * norm2)
    
    def _json_serialize(self, obj):
        """JSON serialization helper for complex objects"""
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        if isinstance(obj, (set, frozenset)):
            return list(obj)
        raise TypeError(f"Type {type(obj)} not serializable")
    
    async def cleanup(self) -> None:
        """Clean up the capability"""
        if self.conn:
            self.conn.close()
            self.conn = None
        
        self.memory_items.clear()
        
        await super().cleanup()
