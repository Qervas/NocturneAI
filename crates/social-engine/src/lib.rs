/*!
# Social Engine

Agent relationships, social learning, and network dynamics.
*/

use shared_types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub use shared_types::*;

// Re-export for convenience
pub use relationship_manager::*;
pub use social_learning::*;
pub use network_analyzer::*;

pub mod relationship_manager;
pub mod social_learning;
pub mod network_analyzer;

/// Main social engine that manages all agent relationships and social dynamics
pub struct SocialEngine {
    pub relationship_manager: RelationshipManager,
    pub social_learning_system: SocialLearningSystem,
    pub network_analyzer: NetworkAnalyzer,
    pub social_events: Vec<SocialEvent>,
}

impl SocialEngine {
    pub fn new() -> Self {
        Self {
            relationship_manager: RelationshipManager::new(),
            social_learning_system: SocialLearningSystem::new(),
            network_analyzer: NetworkAnalyzer::new(),
            social_events: Vec::new(),
        }
    }

    /// Process a social interaction between agents
    pub async fn process_social_interaction(
        &mut self,
        source_agent: AgentId,
        target_agent: AgentId,
        interaction_type: SocialInteractionType,
        context: &str,
    ) -> Result<SocialInteractionResult> {
        // Create an AgentInteraction from the parameters
        let interaction = AgentInteraction {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            participants: vec![source_agent, target_agent],
            interaction_type: format!("{:?}", interaction_type),
            content: context.to_string(),
            outcome: InteractionOutcome::Successful,
        };
        
        // Update relationship based on interaction
        let relationship_update = self.relationship_manager.update_relationship(&interaction).await?;

        // Process social learning
        let learning_result = self.social_learning_system.process_interaction(
            source_agent,
            target_agent,
            &interaction_type,
            context,
        ).await?;

        // Update network metrics
        self.network_analyzer.update_network_metrics(
            source_agent,
            target_agent,
            &interaction_type,
        ).await?;

        // Record social event
        let social_event = SocialEvent {
            id: Uuid::new_v4(),
            source_agent,
            target_agent,
            interaction_type: interaction_type.clone(),
            context: context.to_string(),
            timestamp: Utc::now(),
            learning_outcome: learning_result.clone(),
            relationship_impact: (relationship_update.new_strength - relationship_update.old_strength).abs(),
        };
        self.social_events.push(social_event);

        Ok(SocialInteractionResult {
            relationship_update,
            learning_result,
            network_impact: self.network_analyzer.get_network_impact(source_agent, target_agent).await?,
        })
    }

    /// Get agent's social network
    pub async fn get_agent_network(&self, agent_id: AgentId) -> Result<AgentSocialNetwork> {
        let relationships = self.relationship_manager.get_agent_relationships(agent_id).await?;
        let learning_progress = self.social_learning_system.get_learning_progress(agent_id).await?;
        let network_metrics = self.network_analyzer.get_agent_metrics(agent_id).await?;

        Ok(AgentSocialNetwork {
            agent_id,
            relationships,
            learning_progress,
            network_metrics,
            social_influence: self.calculate_social_influence(agent_id).await?,
        })
    }

    /// Calculate social influence score for an agent
    async fn calculate_social_influence(&self, agent_id: AgentId) -> Result<f32> {
        let relationships = self.relationship_manager.get_agent_relationships(agent_id).await?;
        let network_metrics = self.network_analyzer.get_agent_metrics(agent_id).await?;
        
        // Base influence from relationship strength
        let relationship_influence: f32 = relationships.iter()
            .map(|r| {
                // Calculate influence multiplier based on connection type
                let connection_multiplier = match r.connection_type {
                    ConnectionType::Mentorship => 1.2,
                    ConnectionType::Collaboration => 1.1,
                    ConnectionType::Professional => 1.0,
                    ConnectionType::Learning => 0.8,
                    ConnectionType::Friendship => 0.9,
                    ConnectionType::DataSharing => 0.7,
                    ConnectionType::Consultation => 0.8,
                    ConnectionType::Competition => 0.6,
                };
                r.strength * connection_multiplier
            })
            .sum();
        
        // Network position influence
        let network_influence = network_metrics.centrality * 0.3 + network_metrics.betweenness * 0.2;
        
        // Recent activity influence
        let recent_activity = self.social_events.iter()
            .filter(|e| e.source_agent == agent_id || e.target_agent == agent_id)
            .filter(|e| (Utc::now() - e.timestamp).num_hours() < 24)
            .count() as f32 * 0.1;
        
        Ok((relationship_influence + network_influence + recent_activity).min(1.0))
    }

    /// Get social recommendations for an agent
    pub async fn get_social_recommendations(&self, agent_id: AgentId) -> Result<Vec<SocialRecommendation>> {
        let mut recommendations = Vec::new();
        
        // Get agent's current network
        let agent_network = self.get_agent_network(agent_id).await?;
        
        // Recommend new connections based on network analysis
        let connection_recommendations = self.network_analyzer.recommend_connections(agent_id).await?;
        for conn in connection_recommendations {
            recommendations.push(SocialRecommendation {
                recommendation_type: SocialRecommendationType::NewConnection,
                target_agent: conn.target_agent,
                reason: conn.reason,
                potential_benefit: conn.potential_benefit,
                confidence: conn.confidence,
            });
        }
        
        // Recommend learning opportunities
        let learning_recommendations = self.social_learning_system.recommend_learning_opportunities(agent_id).await?;
        for learning in learning_recommendations {
            recommendations.push(SocialRecommendation {
                recommendation_type: SocialRecommendationType::LearningOpportunity,
                target_agent: learning.mentor_agent,
                reason: learning.reason,
                potential_benefit: learning.potential_benefit,
                confidence: learning.confidence,
            });
        }
        
        // Recommend collaboration opportunities
        let collaboration_recommendations = self.recommend_collaborations(agent_id).await?;
        recommendations.extend(collaboration_recommendations);
        
        // Sort by potential benefit
        recommendations.sort_by(|a, b| b.potential_benefit.partial_cmp(&a.potential_benefit).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(recommendations)
    }

    /// Recommend collaboration opportunities
    async fn recommend_collaborations(&self, agent_id: AgentId) -> Result<Vec<SocialRecommendation>> {
        let mut recommendations = Vec::new();
        
        // Find agents with complementary skills
        let agent_relationships = self.relationship_manager.get_agent_relationships(agent_id).await?;
        
        for relationship in agent_relationships {
            if relationship.connection_type == ConnectionType::Collaboration 
                && relationship.strength > 0.6 {
                recommendations.push(SocialRecommendation {
                    recommendation_type: SocialRecommendationType::Collaboration,
                    target_agent: relationship.other_agent_id,
                    reason: "Strong collaboration history and complementary skills".to_string(),
                    potential_benefit: relationship.strength * 0.8,
                    confidence: 0.85,
                });
            }
        }
        
        Ok(recommendations)
    }

    /// Get social analytics for the entire network
    pub async fn get_network_analytics(&self) -> Result<NetworkAnalytics> {
        let total_relationships = self.relationship_manager.get_total_relationships().await?;
        let total_agents = self.relationship_manager.get_total_agents().await?;
        let learning_events = self.social_learning_system.get_total_learning_events().await?;
        
        let network_density = if total_agents > 1 {
            total_relationships as f32 / ((total_agents * (total_agents - 1)) as f32 / 2.0)
        } else {
            0.0
        };
        
        Ok(NetworkAnalytics {
            total_agents,
            total_relationships,
            network_density,
            learning_events,
            average_relationship_strength: self.relationship_manager.get_average_relationship_strength().await?,
            most_influential_agents: self.network_analyzer.get_most_influential_agents().await?,
            collaboration_clusters: self.network_analyzer.get_collaboration_clusters().await?,
        })
    }
}

/// Result of a social interaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialInteractionResult {
    pub relationship_update: RelationshipUpdate,
    pub learning_result: SocialLearningResult,
    pub network_impact: NetworkImpact,
}

/// Agent's complete social network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSocialNetwork {
    pub agent_id: AgentId,
    pub relationships: Vec<AgentRelationship>,
    pub learning_progress: LearningProgress,
    pub network_metrics: AgentNetworkMetrics,
    pub social_influence: f32,
}

/// Social recommendation for an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialRecommendation {
    pub recommendation_type: SocialRecommendationType,
    pub target_agent: AgentId,
    pub reason: String,
    pub potential_benefit: f32,
    pub confidence: f32,
}

/// Types of social recommendations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SocialRecommendationType {
    NewConnection,
    LearningOpportunity,
    Collaboration,
    Mentorship,
    KnowledgeSharing,
}

/// Social event record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialEvent {
    pub id: Uuid,
    pub source_agent: AgentId,
    pub target_agent: AgentId,
    pub interaction_type: SocialInteractionType,
    pub context: String,
    pub timestamp: DateTime<Utc>,
    pub learning_outcome: SocialLearningResult,
    pub relationship_impact: f32,
}

/// Types of social interactions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SocialInteractionType {
    Collaboration,
    Mentorship,
    KnowledgeSharing,
    ProblemSolving,
    CreativeSession,
    FormalMeeting,
    CasualChat,
    PeerReview,
    Teaching,
    Learning,
}

/// Network analytics for the entire system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkAnalytics {
    pub total_agents: usize,
    pub total_relationships: usize,
    pub network_density: f32,
    pub learning_events: usize,
    pub average_relationship_strength: f32,
    pub most_influential_agents: Vec<InfluentialAgent>,
    pub collaboration_clusters: Vec<CollaborationCluster>,
}

/// Influential agent in the network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfluentialAgent {
    pub agent_id: AgentId,
    pub influence_score: f32,
    pub centrality: f32,
    pub active_relationships: usize,
}

/// Collaboration cluster in the network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationCluster {
    pub cluster_id: Uuid,
    pub agents: Vec<AgentId>,
    pub collaboration_strength: f32,
    pub focus_areas: Vec<String>,
}

/// Default implementation
impl Default for SocialEngine {
    fn default() -> Self {
        Self::new()
    }
} 