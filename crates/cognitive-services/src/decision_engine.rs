/*!
# Decision Engine

Advanced decision making and action planning for AI agents
*/

use crate::*;
use shared_types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Decision engine for making intelligent agent decisions
#[derive(Debug)]
pub struct DecisionEngine {
    decision_criteria: Vec<DecisionCriterion>,
    decision_history: HashMap<AgentId, Vec<DecisionRecord>>,
    action_templates: HashMap<String, ActionTemplate>,
}

impl DecisionEngine {
    pub fn new() -> Self {
        Self {
            decision_criteria: Self::create_default_criteria(),
            decision_history: HashMap::new(),
            action_templates: Self::create_action_templates(),
        }
    }

    /// Make a decision based on reasoning result
    pub async fn make_decision(
        &mut self,
        reasoning_result: &ReasoningDecision,
    ) -> Result<ReasoningDecision> {
        // Evaluate decision criteria
        let criteria_scores = self.evaluate_criteria(reasoning_result);
        
        // Calculate decision confidence
        let decision_confidence = self.calculate_decision_confidence(&criteria_scores, reasoning_result);
        
        // Generate action plan
        let action_plan = self.generate_action_plan(reasoning_result, &criteria_scores).await?;
        
        // Create final decision
        let mut final_decision = reasoning_result.clone();
        final_decision.confidence = decision_confidence;
        final_decision.suggested_actions = action_plan;
        
        // Add decision insights
        final_decision.reasoning_explanation.push_str("\n\n--- Decision Analysis ---\n");
        final_decision.reasoning_explanation.push_str(&self.format_decision_insights(&criteria_scores));
        
        // Store decision in history
        let decision_record = DecisionRecord {
            id: uuid::Uuid::new_v4(),
            agent_id: final_decision.agent_id,
            decision: final_decision.clone(),
            criteria_scores,
            final_confidence: decision_confidence,
            timestamp: Utc::now(),
            outcome: None,
        };
        
        self.decision_history.entry(final_decision.agent_id)
            .or_insert_with(Vec::new)
            .push(decision_record);
        
        Ok(final_decision)
    }

    /// Get recent decisions for an agent
    pub async fn get_recent_decisions(&self, agent_id: &AgentId) -> Result<Vec<AgentDecision>> {
        let recent_decisions = self.decision_history.get(agent_id)
            .map(|records| {
                records.iter()
                    .take(10) // Get last 10 decisions
                    .map(|record| AgentDecision {
                        agent_id: record.agent_id,
                        decision_type: record.decision.decision_type.clone(),
                        timestamp: record.timestamp,
                        confidence: record.final_confidence,
                        reasoning: record.decision.reasoning.clone(),
                        outcome: record.outcome.as_ref().map(|o| format!("{:?}", o)),
                        current_goal: "".to_string(),
                        decision_timer: 0.0,
                        decision_interval: 5.0,
                        last_action: "".to_string(),
                        thinking: false,
                    })
                    .collect()
            })
            .unwrap_or_default();
        
        Ok(recent_decisions)
    }

    /// Evaluate all decision criteria
    fn evaluate_criteria(&self, reasoning_result: &ReasoningDecision) -> Vec<CriterionScore> {
        self.decision_criteria.iter()
            .map(|criterion| {
                let score = criterion.evaluate(reasoning_result);
                CriterionScore {
                    criterion_name: criterion.name.clone(),
                    score,
                    weight: criterion.weight,
                    reasoning: criterion.get_reasoning(score),
                }
            })
            .collect()
    }

    /// Calculate overall decision confidence
    fn calculate_decision_confidence(
        &self,
        criteria_scores: &[CriterionScore],
        reasoning_result: &ReasoningDecision,
    ) -> f32 {
        // Weighted average of criteria scores
        let weighted_sum: f32 = criteria_scores.iter()
            .map(|score| score.score * score.weight)
            .sum();
        let total_weight: f32 = criteria_scores.iter()
            .map(|score| score.weight)
            .sum();
        
        let criteria_confidence = if total_weight > 0.0 {
            weighted_sum / total_weight
        } else {
            0.5
        };
        
        // Combine with original reasoning confidence
        let combined_confidence = (reasoning_result.confidence * 0.6) + (criteria_confidence * 0.4);
        
        // Apply complexity adjustment
        let complexity_factor = if reasoning_result.complexity_score > 0.8 {
            0.9 // High complexity reduces confidence slightly
        } else if reasoning_result.complexity_score > 0.5 {
            0.95
        } else {
            1.0
        };
        
        (combined_confidence * complexity_factor).min(1.0)
    }

    /// Generate action plan based on decision
    async fn generate_action_plan(
        &self,
        reasoning_result: &ReasoningDecision,
        criteria_scores: &[CriterionScore],
    ) -> Result<Vec<String>> {
        let mut action_plan = reasoning_result.suggested_actions.clone();
        
        // Add criterion-specific actions
        for score in criteria_scores {
            if score.score > 0.7 {
                action_plan.extend(self.get_actions_for_criterion(&score.criterion_name));
            }
        }
        
        // Add complexity-based actions
        if reasoning_result.complexity_score > 0.8 {
            action_plan.extend(vec![
                "Break down into smaller steps".to_string(),
                "Seek expert consultation".to_string(),
                "Create detailed implementation plan".to_string(),
            ]);
        }
        
        // Add confidence-based actions
        if reasoning_result.confidence < 0.6 {
            action_plan.extend(vec![
                "Gather more information".to_string(),
                "Validate assumptions".to_string(),
                "Consider alternative approaches".to_string(),
            ]);
        }
        
        // Remove duplicates and prioritize
        let mut unique_actions: Vec<String> = action_plan.into_iter()
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        
        // Sort by priority (complexity and importance)
        unique_actions.sort_by(|a, b| {
            let priority_a = self.get_action_priority(a);
            let priority_b = self.get_action_priority(b);
            priority_b.partial_cmp(&priority_a).unwrap_or(std::cmp::Ordering::Equal)
        });
        
        Ok(unique_actions)
    }

    /// Get actions for a specific criterion
    fn get_actions_for_criterion(&self, criterion_name: &str) -> Vec<String> {
        match criterion_name {
            "feasibility" => vec![
                "Assess resource requirements".to_string(),
                "Identify potential obstacles".to_string(),
                "Create contingency plans".to_string(),
            ],
            "impact" => vec![
                "Define success metrics".to_string(),
                "Identify key stakeholders".to_string(),
                "Plan communication strategy".to_string(),
            ],
            "risk" => vec![
                "Conduct risk assessment".to_string(),
                "Develop mitigation strategies".to_string(),
                "Create monitoring systems".to_string(),
            ],
            "efficiency" => vec![
                "Optimize resource allocation".to_string(),
                "Streamline processes".to_string(),
                "Automate repetitive tasks".to_string(),
            ],
            "innovation" => vec![
                "Explore creative alternatives".to_string(),
                "Challenge conventional approaches".to_string(),
                "Research emerging technologies".to_string(),
            ],
            "collaboration" => vec![
                "Engage team members".to_string(),
                "Share knowledge and insights".to_string(),
                "Coordinate joint efforts".to_string(),
            ],
            _ => vec!["Consider all relevant factors".to_string()],
        }
    }

    /// Get action priority score
    fn get_action_priority(&self, action: &str) -> f32 {
        // Higher priority for fundamental actions
        if action.contains("plan") || action.contains("assess") || action.contains("identify") {
            0.9
        } else if action.contains("implement") || action.contains("execute") || action.contains("create") {
            0.8
        } else if action.contains("optimize") || action.contains("improve") || action.contains("enhance") {
            0.7
        } else if action.contains("monitor") || action.contains("track") || action.contains("review") {
            0.6
        } else {
            0.5
        }
    }

    /// Format decision insights for display
    fn format_decision_insights(&self, criteria_scores: &[CriterionScore]) -> String {
        let mut insights = String::new();
        
        insights.push_str("Decision criteria evaluation:\n");
        for score in criteria_scores {
            insights.push_str(&format!(
                "- {}: {:.2} ({})\n",
                score.criterion_name,
                score.score,
                score.reasoning
            ));
        }
        
        // Add overall assessment
        let avg_score: f32 = criteria_scores.iter().map(|s| s.score).sum::<f32>() / criteria_scores.len() as f32;
        insights.push_str(&format!("\nOverall assessment: {:.2}\n", avg_score));
        
        if avg_score > 0.8 {
            insights.push_str("Decision highly recommended for implementation.\n");
        } else if avg_score > 0.6 {
            insights.push_str("Decision recommended with careful consideration.\n");
        } else {
            insights.push_str("Decision requires further analysis and refinement.\n");
        }
        
        insights
    }

    /// Create default decision criteria
    fn create_default_criteria() -> Vec<DecisionCriterion> {
        vec![
            DecisionCriterion {
                name: "feasibility".to_string(),
                weight: 0.25,
                description: "How practical and achievable is this decision?".to_string(),
                evaluation_logic: Box::new(|result| {
                    let base_score = 0.7;
                    let confidence_factor = result.confidence * 0.3;
                    let complexity_factor = (1.0 - result.complexity_score) * 0.2;
                    (base_score + confidence_factor + complexity_factor).min(1.0)
                }),
            },
            DecisionCriterion {
                name: "impact".to_string(),
                weight: 0.3,
                description: "What is the potential positive impact of this decision?".to_string(),
                evaluation_logic: Box::new(|result| {
                    let base_score = 0.6f32;
                    let confidence_bonus = if result.confidence > 0.8 { 0.2f32 } else { 0.1f32 };
                    let complexity_bonus = if result.complexity_score > 0.6 { 0.2f32 } else { 0.0f32 };
                    (base_score + confidence_bonus + complexity_bonus).min(1.0f32)
                }),
            },
            DecisionCriterion {
                name: "risk".to_string(),
                weight: 0.2,
                description: "What are the potential risks and how manageable are they?".to_string(),
                evaluation_logic: Box::new(|result| {
                    let base_score = 0.8;
                    let confidence_factor = result.confidence * 0.2;
                    let complexity_penalty = result.complexity_score * 0.1;
                    (base_score + confidence_factor - complexity_penalty).max(0.0).min(1.0)
                }),
            },
            DecisionCriterion {
                name: "efficiency".to_string(),
                weight: 0.15,
                description: "How efficiently can this decision be implemented?".to_string(),
                evaluation_logic: Box::new(|result| {
                    let base_score = 0.7;
                    let action_bonus = if result.suggested_actions.len() > 5 { 0.1 } else { 0.2 };
                    let complexity_factor = (1.0 - result.complexity_score) * 0.2;
                    (base_score + action_bonus + complexity_factor).min(1.0)
                }),
            },
            DecisionCriterion {
                name: "innovation".to_string(),
                weight: 0.1,
                description: "Does this decision promote innovation and creativity?".to_string(),
                evaluation_logic: Box::new(|result| {
                    let base_score = 0.5f32;
                    let creativity_bonus = if result.suggested_mood.as_ref() == Some(&Mood::Creative) { 0.3f32 } else { 0.0f32 };
                    let complexity_bonus = if result.complexity_score > 0.7 { 0.2f32 } else { 0.0f32 };
                    (base_score + creativity_bonus + complexity_bonus).min(1.0f32)
                }),
            },
        ]
    }

    /// Create action templates
    fn create_action_templates() -> HashMap<String, ActionTemplate> {
        let mut templates = HashMap::new();
        
        templates.insert("planning".to_string(), ActionTemplate {
            name: "Planning".to_string(),
            description: "Create detailed plans and strategies".to_string(),
            priority: 0.9,
            estimated_duration: 60,
            required_skills: vec!["strategic_thinking".to_string(), "analysis".to_string()],
        });
        
        templates.insert("implementation".to_string(), ActionTemplate {
            name: "Implementation".to_string(),
            description: "Execute plans and deliver results".to_string(),
            priority: 0.8,
            estimated_duration: 180,
            required_skills: vec!["execution".to_string(), "project_management".to_string()],
        });
        
        templates.insert("collaboration".to_string(), ActionTemplate {
            name: "Collaboration".to_string(),
            description: "Work with team members and stakeholders".to_string(),
            priority: 0.7,
            estimated_duration: 120,
            required_skills: vec!["communication".to_string(), "teamwork".to_string()],
        });
        
        templates.insert("learning".to_string(), ActionTemplate {
            name: "Learning".to_string(),
            description: "Acquire new knowledge and skills".to_string(),
            priority: 0.6,
            estimated_duration: 90,
            required_skills: vec!["learning_agility".to_string(), "curiosity".to_string()],
        });
        
        templates
    }
}

/// Decision criterion for evaluating options
pub struct DecisionCriterion {
    pub name: String,
    pub weight: f32,
    pub description: String,
    pub evaluation_logic: Box<dyn Fn(&ReasoningDecision) -> f32 + Send + Sync>,
}

impl std::fmt::Debug for DecisionCriterion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DecisionCriterion")
            .field("name", &self.name)
            .field("weight", &self.weight)
            .field("description", &self.description)
            .field("evaluation_logic", &"<function>")
            .finish()
    }
}

impl DecisionCriterion {
    pub fn evaluate(&self, reasoning_result: &ReasoningDecision) -> f32 {
        (self.evaluation_logic)(reasoning_result)
    }
    
    pub fn get_reasoning(&self, score: f32) -> String {
        if score > 0.8 {
            format!("{}: Excellent alignment with criteria", self.name)
        } else if score > 0.6 {
            format!("{}: Good alignment with criteria", self.name)
        } else if score > 0.4 {
            format!("{}: Moderate alignment with criteria", self.name)
        } else {
            format!("{}: Poor alignment with criteria", self.name)
        }
    }
}

/// Score for a decision criterion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CriterionScore {
    pub criterion_name: String,
    pub score: f32,
    pub weight: f32,
    pub reasoning: String,
}

/// Template for generating actions
#[derive(Debug, Clone)]
pub struct ActionTemplate {
    pub name: String,
    pub description: String,
    pub priority: f32,
    pub estimated_duration: u64, // in minutes
    pub required_skills: Vec<String>,
}

/// Record of a decision made
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionRecord {
    pub id: uuid::Uuid,
    pub agent_id: AgentId,
    pub decision: ReasoningDecision,
    pub criteria_scores: Vec<CriterionScore>,
    pub final_confidence: f32,
    pub timestamp: DateTime<Utc>,
    pub outcome: Option<DecisionOutcome>,
}

/// Outcome of a decision after implementation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionOutcome {
    pub success: bool,
    pub actual_impact: f32,
    pub lessons_learned: Vec<String>,
    pub effectiveness_score: f32,
    pub completion_time: u64,
}

impl Default for DecisionEngine {
    fn default() -> Self {
        Self::new()
    }
} 