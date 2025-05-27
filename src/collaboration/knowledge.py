"""
Knowledge graph for shared information between agents.

This module provides a simple knowledge graph implementation that enables
agents to share, retrieve, and reason about information collectively.
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone
import logging
import json
from enum import Enum, auto

logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Types of entities in the knowledge graph"""
    CONCEPT = auto()
    AGENT = auto()
    TASK = auto()
    RESOURCE = auto()
    ARTIFACT = auto()
    GOAL = auto()
    EVENT = auto()
    OTHER = auto()

class Entity(BaseModel):
    """
    An entity in the knowledge graph.
    
    Entities represent nodes in the graph with properties and metadata.
    They can be concepts, objects, agents, or any other type of entity.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: EntityType
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence: float = 1.0  # 0.0-1.0, representing confidence in this entity's correctness
    source: str = "system"  # Which agent or system component created this entity
    
    def update_property(self, key: str, value: Any) -> None:
        """Update a property and the updated_at timestamp"""
        self.properties[key] = value
        self.updated_at = datetime.now(timezone.utc)
    
    def merge(self, other: 'Entity') -> None:
        """Merge another entity's properties into this one"""
        if self.id != other.id and self.name != other.name:
            raise ValueError("Cannot merge entities with different IDs or names")
        
        # Keep all properties from both entities
        for key, value in other.properties.items():
            if key not in self.properties:
                self.properties[key] = value
            else:
                # If property exists in both, keep the one with higher confidence
                if other.confidence > self.confidence:
                    self.properties[key] = value
        
        # Update metadata
        self.updated_at = datetime.now(timezone.utc)
        
        # Take the higher confidence
        if other.confidence > self.confidence:
            self.confidence = other.confidence

class RelationshipType(Enum):
    """Types of relationships in the knowledge graph"""
    IS_A = auto()
    HAS_A = auto()
    PART_OF = auto()
    DEPENDS_ON = auto()
    CREATED_BY = auto()
    ASSIGNED_TO = auto()
    RELATED_TO = auto()
    PRECEDES = auto()
    CAUSES = auto()
    CONTRADICTS = auto()
    OTHER = auto()

class Relationship(BaseModel):
    """
    A relationship between entities in the knowledge graph.
    
    Relationships represent edges in the graph, connecting entities
    with labeled, directional connections.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str  # ID of the source entity
    target_id: str  # ID of the target entity
    type: RelationshipType
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence: float = 1.0  # 0.0-1.0, representing confidence in this relationship
    bidirectional: bool = False  # Whether the relationship applies in both directions
    source_agent: str = "system"  # Which agent created this relationship
    
    def update_property(self, key: str, value: Any) -> None:
        """Update a property and the updated_at timestamp"""
        self.properties[key] = value
        self.updated_at = datetime.now(timezone.utc)

class KnowledgeGraph:
    """
    A knowledge graph for storing and retrieving shared information.
    
    This class provides methods for adding, querying, and reasoning about
    information stored in a graph structure of entities and relationships.
    """
    
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.entity_relationships: Dict[str, List[str]] = {}  # Entity ID -> Relationship IDs
        
        # Index for faster lookups
        self.entity_name_index: Dict[str, str] = {}  # Entity name -> Entity ID
        self.entity_type_index: Dict[EntityType, List[str]] = {}  # Entity type -> Entity IDs
        
        # Metadata
        self.creation_time = datetime.now(timezone.utc)
        self.last_modified = self.creation_time
    
    def add_entity(self, entity: Entity) -> str:
        """Add an entity to the knowledge graph"""
        # Check if entity with same name already exists
        if entity.name in self.entity_name_index:
            existing_id = self.entity_name_index[entity.name]
            existing_entity = self.entities[existing_id]
            
            # Merge the entities
            existing_entity.merge(entity)
            logger.info(f"Merged entity '{entity.name}' with existing entity")
            
            return existing_id
        
        # Add the new entity
        self.entities[entity.id] = entity
        self.entity_name_index[entity.name] = entity.id
        
        # Update type index
        if entity.type not in self.entity_type_index:
            self.entity_type_index[entity.type] = []
        self.entity_type_index[entity.type].append(entity.id)
        
        # Initialize relationships list
        self.entity_relationships[entity.id] = []
        
        # Update metadata
        self.last_modified = datetime.now(timezone.utc)
        
        logger.info(f"Added entity '{entity.name}' to knowledge graph")
        return entity.id
    
    def add_relationship(self, relationship: Relationship) -> str:
        """Add a relationship to the knowledge graph"""
        # Ensure both entities exist
        if relationship.source_id not in self.entities:
            raise ValueError(f"Source entity {relationship.source_id} does not exist")
        if relationship.target_id not in self.entities:
            raise ValueError(f"Target entity {relationship.target_id} does not exist")
        
        # Add the relationship
        self.relationships[relationship.id] = relationship
        
        # Update entity-relationship indices
        self.entity_relationships[relationship.source_id].append(relationship.id)
        if relationship.bidirectional:
            self.entity_relationships[relationship.target_id].append(relationship.id)
        
        # Update metadata
        self.last_modified = datetime.now(timezone.utc)
        
        logger.info(f"Added relationship between '{self.entities[relationship.source_id].name}' and '{self.entities[relationship.target_id].name}'")
        return relationship.id
    
    def get_entity_by_id(self, entity_id: str) -> Optional[Entity]:
        """Get an entity by its ID"""
        return self.entities.get(entity_id)
    
    def get_entity_by_name(self, name: str) -> Optional[Entity]:
        """Get an entity by its name"""
        entity_id = self.entity_name_index.get(name)
        if entity_id:
            return self.entities.get(entity_id)
        return None
    
    def get_entities_by_type(self, entity_type: EntityType) -> List[Entity]:
        """Get all entities of a specific type"""
        entity_ids = self.entity_type_index.get(entity_type, [])
        return [self.entities[entity_id] for entity_id in entity_ids]
    
    def get_relationship_by_id(self, relationship_id: str) -> Optional[Relationship]:
        """Get a relationship by its ID"""
        return self.relationships.get(relationship_id)
    
    def get_relationships_for_entity(self, entity_id: str) -> List[Relationship]:
        """Get all relationships for a specific entity"""
        relationship_ids = self.entity_relationships.get(entity_id, [])
        return [self.relationships[rel_id] for rel_id in relationship_ids]
    
    def get_related_entities(self, entity_id: str, relationship_type: Optional[RelationshipType] = None) -> List[Entity]:
        """Get all entities related to a specific entity, optionally filtered by relationship type"""
        related_entities = []
        
        for rel_id in self.entity_relationships.get(entity_id, []):
            relationship = self.relationships[rel_id]
            
            # Skip if relationship type doesn't match
            if relationship_type and relationship.type != relationship_type:
                continue
            
            # Determine the related entity ID
            related_id = relationship.target_id if relationship.source_id == entity_id else relationship.source_id
            
            # Add the related entity
            related_entities.append(self.entities[related_id])
        
        return related_entities
    
    def query(self, properties: Dict[str, Any], entity_type: Optional[EntityType] = None) -> List[Entity]:
        """
        Query entities based on properties and type
        
        This simple query implementation checks for exact matches on properties.
        In a real implementation, this would be more sophisticated.
        """
        results = []
        
        # Get the relevant entity IDs based on type
        if entity_type:
            entity_ids = self.entity_type_index.get(entity_type, [])
        else:
            entity_ids = list(self.entities.keys())
        
        # Check each entity for property matches
        for entity_id in entity_ids:
            entity = self.entities[entity_id]
            match = True
            
            for key, value in properties.items():
                if key not in entity.properties or entity.properties[key] != value:
                    match = False
                    break
            
            if match:
                results.append(entity)
        
        return results
    
    def path_between(self, start_id: str, end_id: str, max_depth: int = 5) -> Optional[List[Tuple[str, str]]]:
        """
        Find a path between two entities in the graph
        
        Returns a list of tuples (entity_id, relationship_id) representing the path,
        or None if no path exists within the specified maximum depth.
        """
        if start_id not in self.entities or end_id not in self.entities:
            return None
        
        # Use breadth-first search
        visited = set([start_id])
        queue = [(start_id, [])]  # (entity_id, path_so_far)
        
        while queue and len(visited) <= max_depth:
            current_id, path = queue.pop(0)
            
            # Check each relationship
            for rel_id in self.entity_relationships.get(current_id, []):
                relationship = self.relationships[rel_id]
                
                # Determine the next entity
                next_id = relationship.target_id if relationship.source_id == current_id else relationship.source_id
                
                # Skip if we've already visited this entity
                if next_id in visited:
                    continue
                
                # Create the new path
                new_path = path + [(current_id, rel_id)]
                
                # Check if we've reached the end
                if next_id == end_id:
                    return new_path + [(next_id, None)]
                
                # Add to the queue
                visited.add(next_id)
                queue.append((next_id, new_path))
        
        return None
    
    def export_to_json(self) -> str:
        """Export the knowledge graph to JSON"""
        export_data = {
            "entities": {entity_id: entity.dict() for entity_id, entity in self.entities.items()},
            "relationships": {rel_id: rel.dict() for rel_id, rel in self.relationships.items()},
            "metadata": {
                "creation_time": self.creation_time.isoformat(),
                "last_modified": self.last_modified.isoformat(),
                "entity_count": len(self.entities),
                "relationship_count": len(self.relationships)
            }
        }
        
        return json.dumps(export_data, indent=2)
    
    @classmethod
    def import_from_json(cls, json_data: str) -> 'KnowledgeGraph':
        """Import a knowledge graph from JSON"""
        import_data = json.loads(json_data)
        
        graph = cls()
        
        # Import entities
        for entity_id, entity_data in import_data["entities"].items():
            # Convert dates back to datetime objects
            entity_data["created_at"] = datetime.fromisoformat(entity_data["created_at"])
            entity_data["updated_at"] = datetime.fromisoformat(entity_data["updated_at"])
            
            # Convert type back to enum
            entity_data["type"] = EntityType[entity_data["type"]]
            
            entity = Entity(**entity_data)
            graph.entities[entity_id] = entity
            graph.entity_name_index[entity.name] = entity_id
            
            # Update type index
            if entity.type not in graph.entity_type_index:
                graph.entity_type_index[entity.type] = []
            graph.entity_type_index[entity.type].append(entity_id)
            
            # Initialize relationships list
            graph.entity_relationships[entity_id] = []
        
        # Import relationships
        for rel_id, rel_data in import_data["relationships"].items():
            # Convert dates back to datetime objects
            rel_data["created_at"] = datetime.fromisoformat(rel_data["created_at"])
            rel_data["updated_at"] = datetime.fromisoformat(rel_data["updated_at"])
            
            # Convert type back to enum
            rel_data["type"] = RelationshipType[rel_data["type"]]
            
            relationship = Relationship(**rel_data)
            graph.relationships[rel_id] = relationship
            
            # Update entity-relationship indices
            graph.entity_relationships[relationship.source_id].append(rel_id)
            if relationship.bidirectional:
                graph.entity_relationships[relationship.target_id].append(rel_id)
        
        # Import metadata
        graph.creation_time = datetime.fromisoformat(import_data["metadata"]["creation_time"])
        graph.last_modified = datetime.fromisoformat(import_data["metadata"]["last_modified"])
        
        return graph
