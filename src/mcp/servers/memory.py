"""
Memory MCP Server

This module implements an MCP server for memory operations, providing
a persistent storage mechanism for agent knowledge, observations, and experiences.
"""

from typing import Dict, Any, List, Optional, Union, Set
import os
import json
import logging
import asyncio
from pathlib import Path
import uuid
from datetime import datetime
import sqlite3
import re

from ..base import MCPServer, MCPRequest, MCPResponse, MCPStatus

logger = logging.getLogger(__name__)

class MemoryMCPServer(MCPServer):
    """MCP Server for memory operations"""
    
    def __init__(self, memory_path: str):
        """Initialize the memory MCP server with a storage path
        
        Args:
            memory_path: Path where memory data will be stored
        """
        super().__init__(
            name="memory",
            description="MCP Server for memory operations and knowledge graph"
        )
        
        self.memory_path = os.path.abspath(memory_path)
        os.makedirs(self.memory_path, exist_ok=True)
        
        # Initialize the database
        self.db_path = os.path.join(self.memory_path, "memory.db")
        self._init_database()
        
        logger.info(f"Memory MCP Server initialized with storage path: {self.memory_path}")
    
    def _register_operations(self):
        """Register all memory operations"""
        self.register_operation(
            "create_entities",
            self.create_entities,
            "Create multiple new entities in the knowledge graph"
        )
        
        self.register_operation(
            "delete_entities",
            self.delete_entities,
            "Delete multiple entities and their associated relations from the knowledge graph"
        )
        
        self.register_operation(
            "add_observations",
            self.add_observations,
            "Add new observations to existing entities in the knowledge graph"
        )
        
        self.register_operation(
            "delete_observations",
            self.delete_observations,
            "Delete specific observations from entities in the knowledge graph"
        )
        
        self.register_operation(
            "create_relations",
            self.create_relations,
            "Create multiple new relations between entities in the knowledge graph"
        )
        
        self.register_operation(
            "delete_relations",
            self.delete_relations,
            "Delete multiple relations from the knowledge graph"
        )
        
        self.register_operation(
            "search_nodes",
            self.search_nodes,
            "Search for nodes in the knowledge graph based on a query"
        )
        
        self.register_operation(
            "open_nodes",
            self.open_nodes,
            "Open specific nodes in the knowledge graph by their names"
        )
        
        self.register_operation(
            "read_graph",
            self.read_graph,
            "Read the entire knowledge graph"
        )
    
    def _init_database(self):
        """Initialize the database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            entity_type TEXT,
            created_at TIMESTAMP
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS observations (
            id TEXT PRIMARY KEY,
            entity_id TEXT,
            content TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (entity_id) REFERENCES entities (id)
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS relations (
            id TEXT PRIMARY KEY,
            from_entity_id TEXT,
            to_entity_id TEXT,
            relation_type TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (from_entity_id) REFERENCES entities (id),
            FOREIGN KEY (to_entity_id) REFERENCES entities (id),
            UNIQUE (from_entity_id, to_entity_id, relation_type)
        )
        """)
        
        # Create indexes for faster lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_entity_name ON entities (name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_entity_type ON entities (entity_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_observation_entity ON observations (entity_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_relation_from ON relations (from_entity_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_relation_to ON relations (to_entity_id)")
        
        conn.commit()
        conn.close()
    
    async def create_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create multiple new entities in the knowledge graph
        
        Args:
            entities: List of entities to create
                     Each entity should have name, entityType, and observations
            
        Returns:
            Dictionary with created entity IDs
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        created_entities = []
        
        try:
            for entity_data in entities:
                entity_id = str(uuid.uuid4())
                name = entity_data.get("name")
                entity_type = entity_data.get("entityType")
                observations = entity_data.get("observations", [])
                
                if not name or not entity_type:
                    raise ValueError("Entity must have a name and entityType")
                
                # Check if entity with this name already exists
                cursor.execute("SELECT id FROM entities WHERE name = ?", (name,))
                existing = cursor.fetchone()
                
                if existing:
                    raise ValueError(f"Entity with name '{name}' already exists")
                
                # Create the entity
                cursor.execute(
                    "INSERT INTO entities (id, name, entity_type, created_at) VALUES (?, ?, ?, ?)",
                    (entity_id, name, entity_type, datetime.now().isoformat())
                )
                
                # Add observations
                for obs in observations:
                    obs_id = str(uuid.uuid4())
                    cursor.execute(
                        "INSERT INTO observations (id, entity_id, content, created_at) VALUES (?, ?, ?, ?)",
                        (obs_id, entity_id, obs, datetime.now().isoformat())
                    )
                
                created_entities.append({
                    "id": entity_id,
                    "name": name,
                    "entityType": entity_type,
                    "observationCount": len(observations)
                })
            
            conn.commit()
            
            return {
                "created_entities": created_entities
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error creating entities: {str(e)}")
        finally:
            conn.close()
    
    async def delete_entities(self, entityNames: List[str]) -> Dict[str, Any]:
        """Delete multiple entities and their associated relations from the knowledge graph
        
        Args:
            entityNames: List of entity names to delete
            
        Returns:
            Dictionary with deleted entity names
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        deleted_entities = []
        
        try:
            for name in entityNames:
                # Get the entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (name,))
                entity = cursor.fetchone()
                
                if not entity:
                    logger.warning(f"Entity '{name}' not found, skipping deletion")
                    continue
                
                entity_id = entity[0]
                
                # Delete related observations
                cursor.execute("DELETE FROM observations WHERE entity_id = ?", (entity_id,))
                
                # Delete related relations
                cursor.execute("DELETE FROM relations WHERE from_entity_id = ? OR to_entity_id = ?", (entity_id, entity_id))
                
                # Delete the entity
                cursor.execute("DELETE FROM entities WHERE id = ?", (entity_id,))
                
                deleted_entities.append(name)
            
            conn.commit()
            
            return {
                "deleted_entities": deleted_entities
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error deleting entities: {str(e)}")
        finally:
            conn.close()
    
    async def add_observations(self, observations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Add new observations to existing entities in the knowledge graph
        
        Args:
            observations: List of observations to add
                          Each observation should have entityName and contents
            
        Returns:
            Dictionary with added observation counts
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        results = []
        
        try:
            for obs_data in observations:
                entity_name = obs_data.get("entityName")
                contents = obs_data.get("contents", [])
                
                if not entity_name:
                    raise ValueError("Observation must have an entityName")
                
                # Get the entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (entity_name,))
                entity = cursor.fetchone()
                
                if not entity:
                    raise ValueError(f"Entity '{entity_name}' not found")
                
                entity_id = entity[0]
                
                # Add observations
                for content in contents:
                    obs_id = str(uuid.uuid4())
                    cursor.execute(
                        "INSERT INTO observations (id, entity_id, content, created_at) VALUES (?, ?, ?, ?)",
                        (obs_id, entity_id, content, datetime.now().isoformat())
                    )
                
                results.append({
                    "entityName": entity_name,
                    "addedCount": len(contents)
                })
            
            conn.commit()
            
            return {
                "results": results
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error adding observations: {str(e)}")
        finally:
            conn.close()
    
    async def delete_observations(self, deletions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Delete specific observations from entities in the knowledge graph
        
        Args:
            deletions: List of deletions to perform
                       Each deletion should have entityName and observations
            
        Returns:
            Dictionary with deleted observation counts
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        results = []
        
        try:
            for deletion in deletions:
                entity_name = deletion.get("entityName")
                observations = deletion.get("observations", [])
                
                if not entity_name:
                    raise ValueError("Deletion must have an entityName")
                
                # Get the entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (entity_name,))
                entity = cursor.fetchone()
                
                if not entity:
                    raise ValueError(f"Entity '{entity_name}' not found")
                
                entity_id = entity[0]
                
                # Delete observations
                deleted_count = 0
                for obs in observations:
                    cursor.execute(
                        "DELETE FROM observations WHERE entity_id = ? AND content = ?",
                        (entity_id, obs)
                    )
                    deleted_count += cursor.rowcount
                
                results.append({
                    "entityName": entity_name,
                    "deletedCount": deleted_count
                })
            
            conn.commit()
            
            return {
                "results": results
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error deleting observations: {str(e)}")
        finally:
            conn.close()
    
    async def create_relations(self, relations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create multiple new relations between entities in the knowledge graph
        
        Args:
            relations: List of relations to create
                       Each relation should have from, to, and relationType
            
        Returns:
            Dictionary with created relation IDs
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        created_relations = []
        
        try:
            for relation_data in relations:
                from_name = relation_data.get("from")
                to_name = relation_data.get("to")
                relation_type = relation_data.get("relationType")
                
                if not from_name or not to_name or not relation_type:
                    raise ValueError("Relation must have from, to, and relationType")
                
                # Get the from entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (from_name,))
                from_entity = cursor.fetchone()
                
                if not from_entity:
                    raise ValueError(f"From entity '{from_name}' not found")
                
                from_id = from_entity[0]
                
                # Get the to entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (to_name,))
                to_entity = cursor.fetchone()
                
                if not to_entity:
                    raise ValueError(f"To entity '{to_name}' not found")
                
                to_id = to_entity[0]
                
                # Check if relation already exists
                cursor.execute(
                    "SELECT id FROM relations WHERE from_entity_id = ? AND to_entity_id = ? AND relation_type = ?",
                    (from_id, to_id, relation_type)
                )
                existing = cursor.fetchone()
                
                if existing:
                    logger.warning(f"Relation '{from_name} {relation_type} {to_name}' already exists, skipping")
                    continue
                
                # Create the relation
                relation_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO relations (id, from_entity_id, to_entity_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)",
                    (relation_id, from_id, to_id, relation_type, datetime.now().isoformat())
                )
                
                created_relations.append({
                    "id": relation_id,
                    "from": from_name,
                    "to": to_name,
                    "relationType": relation_type
                })
            
            conn.commit()
            
            return {
                "created_relations": created_relations
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error creating relations: {str(e)}")
        finally:
            conn.close()
    
    async def delete_relations(self, relations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Delete multiple relations from the knowledge graph
        
        Args:
            relations: List of relations to delete
                       Each relation should have from, to, and relationType
            
        Returns:
            Dictionary with deleted relation counts
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        deleted_count = 0
        
        try:
            for relation_data in relations:
                from_name = relation_data.get("from")
                to_name = relation_data.get("to")
                relation_type = relation_data.get("relationType")
                
                if not from_name or not to_name or not relation_type:
                    raise ValueError("Relation must have from, to, and relationType")
                
                # Get the from entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (from_name,))
                from_entity = cursor.fetchone()
                
                if not from_entity:
                    logger.warning(f"From entity '{from_name}' not found, skipping deletion")
                    continue
                
                from_id = from_entity[0]
                
                # Get the to entity ID
                cursor.execute("SELECT id FROM entities WHERE name = ?", (to_name,))
                to_entity = cursor.fetchone()
                
                if not to_entity:
                    logger.warning(f"To entity '{to_name}' not found, skipping deletion")
                    continue
                
                to_id = to_entity[0]
                
                # Delete the relation
                cursor.execute(
                    "DELETE FROM relations WHERE from_entity_id = ? AND to_entity_id = ? AND relation_type = ?",
                    (from_id, to_id, relation_type)
                )
                
                deleted_count += cursor.rowcount
            
            conn.commit()
            
            return {
                "deleted_count": deleted_count
            }
        except Exception as e:
            conn.rollback()
            raise RuntimeError(f"Error deleting relations: {str(e)}")
        finally:
            conn.close()
    
    async def search_nodes(self, query: str) -> Dict[str, Any]:
        """Search for nodes in the knowledge graph based on a query
        
        Args:
            query: The search query to match against entity names, types, and observation content
            
        Returns:
            Dictionary with matching entities
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        entities = []
        
        try:
            # Search in entity names and types
            cursor.execute(
                "SELECT id, name, entity_type FROM entities WHERE name LIKE ? OR entity_type LIKE ?",
                (f"%{query}%", f"%{query}%")
            )
            
            entity_matches = cursor.fetchall()
            entity_ids = set(e[0] for e in entity_matches)
            
            # Search in observations
            cursor.execute(
                "SELECT DISTINCT entity_id FROM observations WHERE content LIKE ?",
                (f"%{query}%",)
            )
            
            obs_matches = cursor.fetchall()
            obs_entity_ids = set(e[0] for e in obs_matches)
            
            # Combine all matched entity IDs
            all_entity_ids = entity_ids.union(obs_entity_ids)
            
            # Get full entity details
            for entity_id in all_entity_ids:
                cursor.execute(
                    "SELECT name, entity_type FROM entities WHERE id = ?",
                    (entity_id,)
                )
                
                entity = cursor.fetchone()
                
                if not entity:
                    continue
                
                name, entity_type = entity
                
                # Get observations
                cursor.execute(
                    "SELECT content FROM observations WHERE entity_id = ?",
                    (entity_id,)
                )
                
                obs_rows = cursor.fetchall()
                observations = [row[0] for row in obs_rows]
                
                # Get relations where this entity is the source
                cursor.execute(
                    """
                    SELECT r.relation_type, e.name
                    FROM relations r
                    JOIN entities e ON r.to_entity_id = e.id
                    WHERE r.from_entity_id = ?
                    """,
                    (entity_id,)
                )
                
                outgoing_relations = [{"type": row[0], "to": row[1]} for row in cursor.fetchall()]
                
                # Get relations where this entity is the target
                cursor.execute(
                    """
                    SELECT r.relation_type, e.name
                    FROM relations r
                    JOIN entities e ON r.from_entity_id = e.id
                    WHERE r.to_entity_id = ?
                    """,
                    (entity_id,)
                )
                
                incoming_relations = [{"type": row[0], "from": row[1]} for row in cursor.fetchall()]
                
                entities.append({
                    "id": entity_id,
                    "name": name,
                    "entityType": entity_type,
                    "observations": observations,
                    "outgoingRelations": outgoing_relations,
                    "incomingRelations": incoming_relations
                })
            
            return {
                "query": query,
                "entities": entities
            }
        except Exception as e:
            raise RuntimeError(f"Error searching nodes: {str(e)}")
        finally:
            conn.close()
    
    async def open_nodes(self, names: List[str]) -> Dict[str, Any]:
        """Open specific nodes in the knowledge graph by their names
        
        Args:
            names: List of entity names to retrieve
            
        Returns:
            Dictionary with the requested entities
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        entities = []
        
        try:
            for name in names:
                cursor.execute(
                    "SELECT id, entity_type FROM entities WHERE name = ?",
                    (name,)
                )
                
                entity = cursor.fetchone()
                
                if not entity:
                    logger.warning(f"Entity '{name}' not found")
                    continue
                
                entity_id, entity_type = entity
                
                # Get observations
                cursor.execute(
                    "SELECT content FROM observations WHERE entity_id = ?",
                    (entity_id,)
                )
                
                obs_rows = cursor.fetchall()
                observations = [row[0] for row in obs_rows]
                
                # Get relations where this entity is the source
                cursor.execute(
                    """
                    SELECT r.relation_type, e.name
                    FROM relations r
                    JOIN entities e ON r.to_entity_id = e.id
                    WHERE r.from_entity_id = ?
                    """,
                    (entity_id,)
                )
                
                outgoing_relations = [{"type": row[0], "to": row[1]} for row in cursor.fetchall()]
                
                # Get relations where this entity is the target
                cursor.execute(
                    """
                    SELECT r.relation_type, e.name
                    FROM relations r
                    JOIN entities e ON r.from_entity_id = e.id
                    WHERE r.to_entity_id = ?
                    """,
                    (entity_id,)
                )
                
                incoming_relations = [{"type": row[0], "from": row[1]} for row in cursor.fetchall()]
                
                entities.append({
                    "id": entity_id,
                    "name": name,
                    "entityType": entity_type,
                    "observations": observations,
                    "outgoingRelations": outgoing_relations,
                    "incomingRelations": incoming_relations
                })
            
            return {
                "entities": entities
            }
        except Exception as e:
            raise RuntimeError(f"Error opening nodes: {str(e)}")
        finally:
            conn.close()
    
    async def read_graph(self) -> Dict[str, Any]:
        """Read the entire knowledge graph
        
        Returns:
            Dictionary with all entities and relations
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get all entities
            cursor.execute("SELECT id, name, entity_type FROM entities")
            entity_rows = cursor.fetchall()
            
            entities = []
            entity_map = {}  # For quick lookup when building relations
            
            for entity_id, name, entity_type in entity_rows:
                # Get observations for this entity
                cursor.execute(
                    "SELECT content FROM observations WHERE entity_id = ?",
                    (entity_id,)
                )
                
                obs_rows = cursor.fetchall()
                observations = [row[0] for row in obs_rows]
                
                entity = {
                    "id": entity_id,
                    "name": name,
                    "entityType": entity_type,
                    "observations": observations,
                    "outgoingRelations": [],
                    "incomingRelations": []
                }
                
                entities.append(entity)
                entity_map[entity_id] = entity
            
            # Get all relations
            cursor.execute(
                """
                SELECT r.id, r.from_entity_id, r.to_entity_id, r.relation_type,
                       e1.name as from_name, e2.name as to_name
                FROM relations r
                JOIN entities e1 ON r.from_entity_id = e1.id
                JOIN entities e2 ON r.to_entity_id = e2.id
                """
            )
            
            relation_rows = cursor.fetchall()
            relations = []
            
            for relation_id, from_id, to_id, relation_type, from_name, to_name in relation_rows:
                relation = {
                    "id": relation_id,
                    "from": from_name,
                    "to": to_name,
                    "relationType": relation_type
                }
                
                relations.append(relation)
                
                # Add to entity's relations
                if from_id in entity_map:
                    entity_map[from_id]["outgoingRelations"].append({
                        "type": relation_type,
                        "to": to_name
                    })
                
                if to_id in entity_map:
                    entity_map[to_id]["incomingRelations"].append({
                        "type": relation_type,
                        "from": from_name
                    })
            
            return {
                "entities": entities,
                "relations": relations
            }
        except Exception as e:
            raise RuntimeError(f"Error reading graph: {str(e)}")
        finally:
            conn.close()
