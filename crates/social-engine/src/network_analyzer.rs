/*!
# Network Analyzer

Analyzes agent network structure and provides insights
*/

use crate::*;
use shared_types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Network analyzer for agent social networks
pub struct NetworkAnalyzer {
    network_metrics: HashMap<AgentId, AgentNetworkMetrics>,
    network_history: Vec<NetworkSnapshot>,
}

impl NetworkAnalyzer {
    pub fn new() -> Self {
        Self {
            network_metrics: HashMap::new(),
            network_history: Vec::new(),
        }
    }

    /// Update network metrics after an interaction
    pub async fn update_network_metrics(
        &mut self,
        source_agent: AgentId,
        target_agent: AgentId,
        interaction_type: &SocialInteractionType,
    ) -> Result<()> {
        // Update metrics for source agent
        let source_metrics = self.network_metrics.entry(source_agent).or_insert_with(|| {
            AgentNetworkMetrics::new(source_agent)
        });
        source_metrics.update_for_interaction(interaction_type);

        // Update metrics for target agent
        let target_metrics = self.network_metrics.entry(target_agent).or_insert_with(|| {
            AgentNetworkMetrics::new(target_agent)
        });
        target_metrics.update_for_interaction(interaction_type);

        Ok(())
    }

    /// Get network impact of an interaction
    pub async fn get_network_impact(
        &self,
        source_agent: AgentId,
        target_agent: AgentId,
    ) -> Result<NetworkImpact> {
        Ok(NetworkImpact {
            centrality_change: 0.01,
            clustering_change: 0.005,
            betweenness_change: 0.008,
            influence_change: 0.02,
        })
    }

    /// Get agent network metrics
    pub async fn get_agent_metrics(&self, agent_id: AgentId) -> Result<AgentNetworkMetrics> {
        Ok(self.network_metrics.get(&agent_id).cloned().unwrap_or_else(|| {
            AgentNetworkMetrics::new(agent_id)
        }))
    }

    /// Recommend new connections for an agent
    pub async fn recommend_connections(&self, agent_id: AgentId) -> Result<Vec<ConnectionRecommendation>> {
        Ok(vec![
            ConnectionRecommendation {
                target_agent: Uuid::new_v4(),
                reason: "Complementary network position".to_string(),
                potential_benefit: 0.7,
                confidence: 0.6,
            }
        ])
    }

    /// Get most influential agents
    pub async fn get_most_influential_agents(&self) -> Result<Vec<InfluentialAgent>> {
        let mut agents: Vec<_> = self.network_metrics.iter()
            .map(|(agent_id, metrics)| InfluentialAgent {
                agent_id: *agent_id,
                influence_score: metrics.influence_score,
                centrality: metrics.centrality,
                active_relationships: metrics.active_relationships,
            })
            .collect();

        agents.sort_by(|a, b| b.influence_score.partial_cmp(&a.influence_score).unwrap_or(std::cmp::Ordering::Equal));
        Ok(agents.into_iter().take(10).collect())
    }

    /// Get collaboration clusters
    pub async fn get_collaboration_clusters(&self) -> Result<Vec<CollaborationCluster>> {
        Ok(vec![
            CollaborationCluster {
                cluster_id: Uuid::new_v4(),
                agents: vec![Uuid::new_v4(), Uuid::new_v4()],
                collaboration_strength: 0.8,
                focus_areas: vec!["AI Development".to_string(), "Research".to_string()],
            }
        ])
    }
}

/// Agent network metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentNetworkMetrics {
    pub agent_id: AgentId,
    pub centrality: f32,
    pub betweenness: f32,
    pub clustering_coefficient: f32,
    pub influence_score: f32,
    pub active_relationships: usize,
    pub network_reach: usize,
    pub last_updated: DateTime<Utc>,
}

impl AgentNetworkMetrics {
    pub fn new(agent_id: AgentId) -> Self {
        Self {
            agent_id,
            centrality: 0.0,
            betweenness: 0.0,
            clustering_coefficient: 0.0,
            influence_score: 0.0,
            active_relationships: 0,
            network_reach: 0,
            last_updated: Utc::now(),
        }
    }

    pub fn update_for_interaction(&mut self, interaction_type: &SocialInteractionType) {
        let impact = match interaction_type {
            SocialInteractionType::Collaboration => 0.1,
            SocialInteractionType::Mentorship => 0.08,
            SocialInteractionType::KnowledgeSharing => 0.06,
            _ => 0.03,
        };

        self.centrality = (self.centrality + impact * 0.5).min(1.0);
        self.influence_score = (self.influence_score + impact).min(1.0);
        self.active_relationships += 1;
        self.last_updated = Utc::now();
    }
}

/// Network impact of an interaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkImpact {
    pub centrality_change: f32,
    pub clustering_change: f32,
    pub betweenness_change: f32,
    pub influence_change: f32,
}

/// Connection recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionRecommendation {
    pub target_agent: AgentId,
    pub reason: String,
    pub potential_benefit: f32,
    pub confidence: f32,
}

/// Network snapshot for historical analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSnapshot {
    pub timestamp: DateTime<Utc>,
    pub total_agents: usize,
    pub total_connections: usize,
    pub network_density: f32,
    pub average_clustering: f32,
}

impl Default for NetworkAnalyzer {
    fn default() -> Self {
        Self::new()
    }
} 