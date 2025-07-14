/*!
# Relationship Manager - Social Engine

Manages relationships between agents including connection types, 
relationship strength, and dynamic relationship evolution.
*/

use shared_types::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Manages relationships between agents
#[derive(Debug, Clone)]
pub struct RelationshipManager {
    pub relationships: HashMap<AgentId, Vec<AgentRelationship>>,
    pub connection_history: Vec<ConnectionEvent>,
    pub relationship_configs: RelationshipConfigs,
}

impl RelationshipManager {
    pub fn new() -> Self {
        Self {
            relationships: HashMap::new(),
            connection_history: Vec::new(),
            relationship_configs: RelationshipConfigs::default(),
        }
    }

    /// Update relationship based on interaction
    pub async fn update_relationship(
        &mut self,
        interaction: &AgentInteraction,
    ) -> Result<RelationshipUpdate> {
        let participants = &interaction.participants;
        if participants.len() != 2 {
            return Err(IntelligenceError::Generic("Interaction must have exactly 2 participants".to_string()));
        }

        let agent1_id = participants[0];
        let agent2_id = participants[1];

        // Calculate strength change first
        let strength_change = self.calculate_strength_change(interaction);

        // Get or create relationship
        let (old_strength, new_strength, connection_type) = {
            let relationship = self.get_or_create_relationship(agent1_id, agent2_id).await?;
            let old_strength = relationship.strength;
            
            // Update relationship
            relationship.strength = (relationship.strength + strength_change).clamp(0.0, 1.0);
            relationship.last_interaction = interaction.timestamp;
            relationship.interaction_count += 1;

            // Check if connection type should evolve and do it inline
            if relationship.strength > 0.9 && relationship.interaction_count > 10 {
                relationship.connection_type = match relationship.connection_type {
                    ConnectionType::Professional => ConnectionType::Friendship,
                    ConnectionType::Mentorship => ConnectionType::Collaboration,
                    ConnectionType::Competition => ConnectionType::Professional,
                    ConnectionType::DataSharing => ConnectionType::Collaboration,
                    ConnectionType::Consultation => ConnectionType::Mentorship,
                    _ => relationship.connection_type.clone(),
                };
            }

            (old_strength, relationship.strength, relationship.connection_type.clone())
        };

        // Record connection event
        self.connection_history.push(ConnectionEvent {
            id: Uuid::new_v4(),
            agent1_id,
            agent2_id,
            event_type: ConnectionEventType::StrengthChanged,
            timestamp: Utc::now(),
            strength_change,
        });

        Ok(RelationshipUpdate {
            agent1_id,
            agent2_id,
            old_strength,
            new_strength,
            connection_type,
        })
    }

    /// Get or create relationship between two agents
    async fn get_or_create_relationship(
        &mut self,
        agent1_id: AgentId,
        agent2_id: AgentId,
    ) -> Result<&mut AgentRelationship> {
        // Check if relationship already exists
        let relationship_exists = self.relationships.get(&agent1_id)
            .map(|relationships| relationships.iter().any(|r| r.other_agent_id == agent2_id))
            .unwrap_or(false);

        if relationship_exists {
            return Ok(self.relationships.get_mut(&agent1_id).unwrap()
                .iter_mut()
                .find(|r| r.other_agent_id == agent2_id)
                .unwrap());
        }

        // Create new relationship
        let new_relationship = AgentRelationship {
            id: Uuid::new_v4(),
            agent_id: agent1_id,
            other_agent_id: agent2_id,
            connection_type: ConnectionType::Professional,
            strength: 0.1,
            established_at: Utc::now(),
            last_interaction: Utc::now(),
            interaction_count: 0,
        };

        // Also create reverse relationship
        let reverse_relationship = AgentRelationship {
            id: Uuid::new_v4(),
            agent_id: agent2_id,
            other_agent_id: agent1_id,
            connection_type: ConnectionType::Professional,
            strength: 0.1,
            established_at: Utc::now(),
            last_interaction: Utc::now(),
            interaction_count: 0,
        };

        self.relationships.entry(agent1_id).or_insert_with(Vec::new).push(new_relationship);
        self.relationships.entry(agent2_id).or_insert_with(Vec::new).push(reverse_relationship);

        Ok(self.relationships.get_mut(&agent1_id).unwrap().last_mut().unwrap())
    }

    /// Get agent relationships
    pub async fn get_agent_relationships(&self, agent_id: AgentId) -> Result<Vec<AgentRelationship>> {
        Ok(self.relationships.get(&agent_id).cloned().unwrap_or_default())
    }

    /// Get total relationships count
    pub async fn get_total_relationships(&self) -> Result<usize> {
        Ok(self.relationships.values().map(|v| v.len()).sum())
    }

    /// Get total agents count
    pub async fn get_total_agents(&self) -> Result<usize> {
        Ok(self.relationships.keys().count())
    }

    /// Get average relationship strength
    pub async fn get_average_relationship_strength(&self) -> Result<f32> {
        let all_relationships: Vec<&AgentRelationship> = self.relationships.values().flat_map(|v| v.iter()).collect();
        
        if all_relationships.is_empty() {
            return Ok(0.0);
        }

        let total_strength: f32 = all_relationships.iter().map(|r| r.strength).sum();
        Ok(total_strength / all_relationships.len() as f32)
    }

    /// Calculate strength change from interaction
    fn calculate_strength_change(&self, interaction: &AgentInteraction) -> f32 {
        let base_change = match interaction.outcome {
            InteractionOutcome::Successful => 0.1,
            InteractionOutcome::Partial => 0.05,
            InteractionOutcome::Failed => -0.05,
            InteractionOutcome::Pending => 0.0,
        };

        // Modify based on interaction type
        let type_modifier = match interaction.interaction_type.as_str() {
            "collaboration" => 1.5,
            "mentorship" => 1.3,
            "competition" => 0.8,
            "data_sharing" => 1.2,
            "consultation" => 1.1,
            _ => 1.0,
        };

        base_change * type_modifier
    }

    /// Evolve connection type based on relationship strength
    fn evolve_connection_type(&mut self, relationship: &mut AgentRelationship) {
        if relationship.strength > 0.9 && relationship.interaction_count > 10 {
            relationship.connection_type = match relationship.connection_type {
                ConnectionType::Professional => ConnectionType::Friendship,
                ConnectionType::Mentorship => ConnectionType::Collaboration,
                ConnectionType::Competition => ConnectionType::Professional,
                ConnectionType::DataSharing => ConnectionType::Collaboration,
                ConnectionType::Consultation => ConnectionType::Mentorship,
                _ => relationship.connection_type.clone(),
            };
        }
    }
}

/// Relationship update result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipUpdate {
    pub agent1_id: AgentId,
    pub agent2_id: AgentId,
    pub old_strength: f32,
    pub new_strength: f32,
    pub connection_type: ConnectionType,
}

/// Agent relationship data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRelationship {
    pub id: AgentId,
    pub agent_id: AgentId,
    pub other_agent_id: AgentId,
    pub connection_type: ConnectionType,
    pub strength: f32,
    pub established_at: DateTime<Utc>,
    pub last_interaction: DateTime<Utc>,
    pub interaction_count: u32,
}

/// Connection event for tracking relationship changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionEvent {
    pub id: AgentId,
    pub agent1_id: AgentId,
    pub agent2_id: AgentId,
    pub event_type: ConnectionEventType,
    pub timestamp: DateTime<Utc>,
    pub strength_change: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionEventType {
    Established,
    StrengthChanged,
    TypeChanged,
    Dissolved,
}

/// Configuration for relationship dynamics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipConfigs {
    pub max_strength: f32,
    pub min_strength: f32,
    pub decay_rate: f32,
    pub evolution_threshold: f32,
}

impl Default for RelationshipConfigs {
    fn default() -> Self {
        Self {
            max_strength: 1.0,
            min_strength: 0.0,
            decay_rate: 0.001,
            evolution_threshold: 0.8,
        }
    }
}

/// Calculate relationship strength based on interaction history
impl AgentRelationship {
    pub fn calculate_dynamic_strength(&self) -> f32 {
        // Base strength from stored value
        let mut strength = self.strength;

        // Time-based decay
        let days_since_last_interaction = (Utc::now() - self.last_interaction).num_days();
        let decay_factor = 1.0 - (days_since_last_interaction as f32 * 0.01);
        strength *= decay_factor.max(0.5);

        // Interaction frequency boost
        let frequency_boost = (self.interaction_count as f32 / 100.0).min(0.2);
        strength += frequency_boost;

        // Connection type modifier
        let type_modifier = match self.connection_type {
            ConnectionType::Friendship => 1.2,
            ConnectionType::Collaboration => 1.1,
            ConnectionType::Mentorship => 1.0,
            ConnectionType::Professional => 0.9,
            ConnectionType::Learning => 0.8,
            ConnectionType::Competition => 0.4,
            ConnectionType::DataSharing => 0.9,
            ConnectionType::Consultation => 0.8,
        };

        (strength * type_modifier).clamp(0.0, 1.0)
    }
} 