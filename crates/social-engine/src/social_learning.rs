/*!
# Social Learning System

Handles agent-to-agent social learning and knowledge transfer
*/

use crate::*;
use shared_types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Social learning system for agents
pub struct SocialLearningSystem {
    learning_records: HashMap<AgentId, Vec<LearningRecord>>,
    knowledge_graph: KnowledgeGraph,
}

impl SocialLearningSystem {
    pub fn new() -> Self {
        Self {
            learning_records: HashMap::new(),
            knowledge_graph: KnowledgeGraph::new(),
        }
    }

    /// Process social learning interaction
    pub async fn process_interaction(
        &mut self,
        source_agent: AgentId,
        target_agent: AgentId,
        interaction_type: &SocialInteractionType,
        context: &str,
    ) -> Result<SocialLearningResult> {
        // Calculate learning effectiveness
        let effectiveness = self.calculate_learning_effectiveness(source_agent, target_agent, interaction_type);
        
        // Generate learning result
        Ok(SocialLearningResult {
            learning_effectiveness: effectiveness,
            knowledge_gained: format!("Gained knowledge from {} interaction", interaction_type.to_string()),
            skill_improvements: vec!["Communication".to_string()],
            relationship_impact: effectiveness * 0.5,
        })
    }

    /// Get learning progress for an agent
    pub async fn get_learning_progress(&self, agent_id: AgentId) -> Result<LearningProgress> {
        let records = self.learning_records.get(&agent_id).cloned().unwrap_or_default();
        
        Ok(LearningProgress {
            agent_id,
            total_learning_events: records.len(),
            skill_levels: HashMap::new(),
            knowledge_areas: vec![],
            recent_learning: records.into_iter().take(5).collect(),
        })
    }

    /// Get total learning events
    pub async fn get_total_learning_events(&self) -> Result<usize> {
        Ok(self.learning_records.values().map(|v| v.len()).sum())
    }

    /// Recommend learning opportunities
    pub async fn recommend_learning_opportunities(&self, agent_id: AgentId) -> Result<Vec<LearningOpportunity>> {
        Ok(vec![
            LearningOpportunity {
                mentor_agent: Uuid::new_v4(),
                reason: "Complementary skills".to_string(),
                potential_benefit: 0.8,
                confidence: 0.7,
            }
        ])
    }

    /// Calculate learning effectiveness
    fn calculate_learning_effectiveness(
        &self,
        _source_agent: AgentId,
        _target_agent: AgentId,
        interaction_type: &SocialInteractionType,
    ) -> f32 {
        match interaction_type {
            SocialInteractionType::Mentorship => 0.9,
            SocialInteractionType::Teaching => 0.8,
            SocialInteractionType::Collaboration => 0.7,
            SocialInteractionType::KnowledgeSharing => 0.6,
            _ => 0.5,
        }
    }
}

/// Learning record for an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningRecord {
    pub id: Uuid,
    pub agent_id: AgentId,
    pub mentor_agent: AgentId,
    pub knowledge_area: String,
    pub learning_type: LearningType,
    pub effectiveness: f32,
    pub timestamp: DateTime<Utc>,
}

/// Learning progress for an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningProgress {
    pub agent_id: AgentId,
    pub total_learning_events: usize,
    pub skill_levels: HashMap<String, f32>,
    pub knowledge_areas: Vec<String>,
    pub recent_learning: Vec<LearningRecord>,
}

/// Learning opportunity recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningOpportunity {
    pub mentor_agent: AgentId,
    pub reason: String,
    pub potential_benefit: f32,
    pub confidence: f32,
}

/// Types of learning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LearningType {
    SkillDevelopment,
    KnowledgeTransfer,
    ExperienceSharing,
    ProblemSolving,
}

/// Knowledge graph for tracking knowledge relationships
pub struct KnowledgeGraph {
    nodes: HashMap<String, KnowledgeNode>,
    connections: Vec<KnowledgeConnection>,
}

impl KnowledgeGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            connections: Vec::new(),
        }
    }
}

/// Knowledge node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeNode {
    pub id: String,
    pub knowledge_area: String,
    pub expertise_level: f32,
    pub associated_agents: Vec<AgentId>,
}

/// Knowledge connection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeConnection {
    pub from_node: String,
    pub to_node: String,
    pub connection_strength: f32,
    pub connection_type: String,
}

impl Default for SocialLearningSystem {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for SocialInteractionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SocialInteractionType::Collaboration => write!(f, "collaboration"),
            SocialInteractionType::Mentorship => write!(f, "mentorship"),
            SocialInteractionType::KnowledgeSharing => write!(f, "knowledge_sharing"),
            SocialInteractionType::ProblemSolving => write!(f, "problem_solving"),
            SocialInteractionType::CreativeSession => write!(f, "creative_session"),
            SocialInteractionType::FormalMeeting => write!(f, "formal_meeting"),
            SocialInteractionType::CasualChat => write!(f, "casual_chat"),
            SocialInteractionType::PeerReview => write!(f, "peer_review"),
            SocialInteractionType::Teaching => write!(f, "teaching"),
            SocialInteractionType::Learning => write!(f, "learning"),
        }
    }
} 