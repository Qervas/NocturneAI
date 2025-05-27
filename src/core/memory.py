from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import os
import json
import hashlib

class Memory(BaseModel):
    """Represents a single memory entry"""
    id: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    importance: float = 0.5  # 0.0 to 1.0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }

class MemoryStore:
    """Manages agent memories"""
    
    def __init__(self, persist_path: Optional[str] = None):
        self.memories: Dict[str, Memory] = {}
        self.persist_path = persist_path
        self._load()
    
    def add(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Memory:
        """Add a new memory"""
        if metadata is None:
            metadata = {}
            
        # Generate a unique ID based on content and metadata
        content_hash = hashlib.sha256(
            (content + json.dumps(metadata, sort_keys=True)).encode()
        ).hexdigest()
        
        memory = Memory(
            id=content_hash,
            content=content,
            metadata=metadata
        )
        
        self.memories[memory.id] = memory
        self._save()
        return memory
    
    def get(self, memory_id: str) -> Optional[Memory]:
        """Retrieve a memory by ID"""
        memory = self.memories.get(memory_id)
        if memory:
            memory.last_accessed = datetime.now(timezone.utc)
        return memory
    
    def search(self, query: str, limit: int = 5) -> List[Memory]:
        """Search memories by content"""
        # In a real implementation, you'd use a vector database for semantic search
        # For now, we'll do a simple substring match
        query = query.lower()
        results = []
        
        for memory in self.memories.values():
            if query in memory.content.lower():
                results.append(memory)
                
        # Sort by relevance (in a real implementation, this would be more sophisticated)
        results.sort(key=lambda m: m.importance, reverse=True)
        
        # Update last_accessed for retrieved memories
        for memory in results[:limit]:
            memory.last_accessed = datetime.now(timezone.utc)
            
        return results[:limit]
    
    def _save(self) -> None:
        """Save memories to disk"""
        if not self.persist_path:
            return
            
        try:
            with open(self.persist_path, 'w') as f:
                data = [m.dict() for m in self.memories.values()]
                json.dump(data, f, default=str)
        except Exception as e:
            print(f"Error saving memories: {e}")
    
    def _load(self) -> None:
        """Load memories from disk"""
        if not (self.persist_path and os.path.exists(self.persist_path)):
            return
            
        try:
            with open(self.persist_path, 'r') as f:
                data = json.load(f)
                for item in data:
                    # Convert string timestamps back to datetime objects
                    if 'created_at' in item and isinstance(item['created_at'], str):
                        item['created_at'] = datetime.fromisoformat(item['created_at'])
                    if 'last_accessed' in item and isinstance(item['last_accessed'], str):
                        item['last_accessed'] = datetime.fromisoformat(item['last_accessed'])
                    memory = Memory(**item)
                    self.memories[memory.id] = memory
        except Exception as e:
            print(f"Error loading memories: {e}")
    
    def clear(self) -> None:
        """Clear all memories"""
        self.memories = {}
        self._save()
