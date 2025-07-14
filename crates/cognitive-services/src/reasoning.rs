/*!
# Reasoning Engine - Cognitive Services

Advanced reasoning patterns and decision-making logic for AI agents.
*/

use shared_types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Main reasoning engine for processing agent thoughts and decisions
#[derive(Debug, Clone)]
pub struct ReasoningEngine {
    pub reasoning_patterns: Vec<ReasoningPattern>,
    pub agent_states: HashMap<AgentId, AgentReasoningState>,
    pub memory_cache: HashMap<AgentId, Vec<String>>,
}

impl ReasoningEngine {
    pub fn new() -> Self {
        Self {
            reasoning_patterns: Self::initialize_patterns(),
            agent_states: HashMap::new(),
            memory_cache: HashMap::new(),
        }
    }

    /// Process reasoning request with full context
    pub async fn process_reasoning(
        &mut self,
        agent_id: &AgentId,
        context: &str,
        agent_state: &AgentState,
        memories: &[ReasoningMemory],
        request_type: &ReasoningType,
    ) -> Result<ReasoningDecision> {
        // Find best reasoning pattern first
        let pattern = self.select_reasoning_pattern(request_type, agent_state.focus / 100.0);
        
        // Get or create agent reasoning state
        let reasoning_capacity = if let Some(state) = self.agent_states.get(agent_id) {
            state.reasoning_capacity
        } else {
            0.8
        };
        
        // Create reasoning decision
        let decision = ReasoningDecision {
            agent_id: *agent_id,
            decision_type: format!("{:?}", request_type),
            reasoning: pattern.description.clone(),
            reasoning_explanation: self.generate_reasoning_explanation(agent_state, memories, pattern),
            confidence: (pattern.strength * reasoning_capacity).min(1.0),
            suggested_actions: pattern.get_suggested_actions(request_type),
            suggested_mood: Self::suggest_mood(request_type, pattern.strength),
            complexity_score: pattern.complexity_threshold,
            timestamp: Utc::now(),
        };

        // Now update the agent state
        let reasoning_state = self.agent_states.entry(*agent_id).or_insert_with(|| {
            AgentReasoningState {
                active_reasoning_sessions: HashMap::new(),
                recent_decisions: Vec::new(),
                learning_progress: HashMap::new(),
                current_focus: None,
                reasoning_capacity: 0.8,
                learning_rate: 0.6,
                social_learning_progress: HashMap::new(),
            }
        });

        // Store decision in agent state
        reasoning_state.recent_decisions.push(AgentDecision {
            agent_id: *agent_id,
            decision_type: format!("{:?}", request_type),
            timestamp: Utc::now(),
            confidence: decision.confidence,
            reasoning: decision.reasoning.clone(),
            outcome: None,
            current_goal: "".to_string(),
            decision_timer: 0.0,
            decision_interval: 5.0,
            last_action: "".to_string(),
            thinking: false,
        });

        // Update current focus
        reasoning_state.current_focus = Some(format!("{:?}", request_type));

        Ok(decision)
    }

    /// Process social learning between agents
    pub async fn process_social_learning(
        &mut self,
        event: SocialLearningEvent,
    ) -> Result<SocialLearningResult> {
        // Calculate effectiveness first
        let effectiveness = if let Some(existing_state) = self.agent_states.get(&event.target_agent) {
            self.calculate_learning_effectiveness(&event, existing_state)
        } else {
            let default_state = AgentReasoningState::default();
            self.calculate_learning_effectiveness(&event, &default_state)
        };
        
        // Update social learning progress
        let target_state = self.agent_states.entry(event.target_agent).or_insert_with(|| {
            AgentReasoningState::default()
        });
        target_state.social_learning_progress.insert(event.source_agent, effectiveness);

        Ok(SocialLearningResult {
            learning_effectiveness: effectiveness,
            knowledge_gained: event.knowledge_transferred,
            skill_improvements: vec!["Problem solving".to_string(), "Communication".to_string()],
            relationship_impact: effectiveness * 0.8,
        })
    }

    /// Get agent reasoning state
    pub async fn get_agent_state(&self, agent_id: &AgentId) -> Result<AgentReasoningState> {
        Ok(self.agent_states.get(agent_id).cloned().unwrap_or_default())
    }

    /// Get active reasoning session for an agent
    pub fn get_active_session(&self, agent_id: &AgentId) -> Option<String> {
        self.agent_states.get(agent_id)
            .and_then(|state| state.active_reasoning_sessions.get(agent_id).cloned())
    }

    /// Update reasoning patterns based on new information
    pub async fn update_patterns(&mut self, agent_id: &AgentId, new_information: &str) -> Result<()> {
        // Store information in memory cache
        self.memory_cache.entry(*agent_id).or_insert_with(Vec::new).push(new_information.to_string());
        Ok(())
    }

    /// Get reasoning patterns
    pub fn get_patterns(&self) -> &[ReasoningPattern] {
        &self.reasoning_patterns
    }

    /// Select the best reasoning pattern for the request
    fn select_reasoning_pattern(&self, request_type: &ReasoningType, complexity: f32) -> &ReasoningPattern {
        // Find patterns applicable to this request type
        self.reasoning_patterns
            .iter()
            .filter(|pattern| pattern.is_applicable(request_type, complexity))
            .max_by(|a, b| a.strength.partial_cmp(&b.strength).unwrap_or(std::cmp::Ordering::Equal))
            .unwrap_or(&self.reasoning_patterns[0])
    }

    /// Generate reasoning explanation
    fn generate_reasoning_explanation(
        &self,
        agent_state: &AgentState,
        memories: &[ReasoningMemory],
        pattern: &ReasoningPattern,
    ) -> String {
        let mut explanation = String::new();
        
        explanation.push_str(&format!("Agent reasoning using pattern: {}\n", pattern.name));
        explanation.push_str(&format!("Energy level: {:.1}%\n", agent_state.energy));
        explanation.push_str(&format!("Focus level: {:.1}%\n", agent_state.focus));
        explanation.push_str(&format!("Confidence: {:.1}%\n", agent_state.confidence));
        explanation.push_str(&format!("Relevant memories: {}\n", memories.len()));
        
        // Add pattern-specific reasoning
        match pattern.name.as_str() {
            "problem_solving" => {
                explanation.push_str("Breaking down the problem into smaller components:\n");
                explanation.push_str("1. Identify core issues\n");
                explanation.push_str("2. Generate potential solutions\n");
                explanation.push_str("3. Evaluate feasibility\n");
                explanation.push_str("4. Select optimal approach\n");
            }
            "creative_thinking" => {
                explanation.push_str("Applying creative thinking techniques:\n");
                explanation.push_str("- Brainstorming alternative approaches\n");
                explanation.push_str("- Combining ideas from different domains\n");
                explanation.push_str("- Challenging existing assumptions\n");
            }
            "collaboration" => {
                explanation.push_str("Considering collaborative opportunities:\n");
                explanation.push_str("- Identifying potential partners\n");
                explanation.push_str("- Assessing mutual benefits\n");
                explanation.push_str("- Planning coordination strategies\n");
            }
            _ => {
                explanation.push_str("Applying systematic reasoning approach.\n");
            }
        }
        
        explanation
    }

    /// Suggest mood based on reasoning type
    fn suggest_mood(request_type: &ReasoningType, confidence: f32) -> Option<Mood> {
        match request_type {
            ReasoningType::TaskExecution => {
                if confidence > 0.8 { Some(Mood::Focused) } else { Some(Mood::Contemplative) }
            }
            ReasoningType::SocialInteraction => Some(Mood::Collaborative),
            ReasoningType::Learning => Some(Mood::Curious),
            ReasoningType::ProblemSolving => Some(Mood::Contemplative),
            ReasoningType::CreativeThinking => Some(Mood::Creative),
            ReasoningType::Collaboration => Some(Mood::Collaborative),
        }
    }

    /// Calculate learning effectiveness
    fn calculate_learning_effectiveness(
        &self,
        event: &SocialLearningEvent,
        target_state: &AgentReasoningState,
    ) -> f32 {
        let mut effectiveness = 0.5; // Base effectiveness
        
        // Adjust based on target agent's learning capacity
        if target_state.reasoning_capacity > 0.8 {
            effectiveness += 0.3;
        }
        
        // Adjust based on interaction type
        match event.interaction_type.as_str() {
            "mentorship" => effectiveness += 0.2,
            "collaboration" => effectiveness += 0.15,
            "knowledge_sharing" => effectiveness += 0.1,
            _ => {}
        }
        
        // Get source agent capacity if available
        if let Some(source) = self.agent_states.get(&event.source_agent) {
            effectiveness += source.reasoning_capacity * 0.3;
        }
        
        effectiveness.min(1.0)
    }

    /// Initialize default reasoning patterns
    fn initialize_patterns() -> Vec<ReasoningPattern> {
        vec![
            ReasoningPattern {
                id: uuid::Uuid::new_v4(),
                name: "problem_solving".to_string(),
                description: "Systematic approach to breaking down and solving complex problems".to_string(),
                strength: 0.8,
                complexity_threshold: 0.6,
                applicable_types: vec![ReasoningType::ProblemSolving, ReasoningType::TaskExecution],
                suggested_actions: vec![
                    "Analyze the problem".to_string(),
                    "Generate solutions".to_string(),
                    "Evaluate options".to_string(),
                    "Implement solution".to_string(),
                ],
            },
            ReasoningPattern {
                id: uuid::Uuid::new_v4(),
                name: "creative_thinking".to_string(),
                description: "Innovative and creative approach to generating new ideas".to_string(),
                strength: 0.7,
                complexity_threshold: 0.5,
                applicable_types: vec![ReasoningType::CreativeThinking, ReasoningType::Learning],
                suggested_actions: vec![
                    "Brainstorm ideas".to_string(),
                    "Explore alternatives".to_string(),
                    "Combine concepts".to_string(),
                    "Prototype solutions".to_string(),
                ],
            },
            ReasoningPattern {
                id: uuid::Uuid::new_v4(),
                name: "collaboration".to_string(),
                description: "Collaborative approach focusing on team coordination and communication".to_string(),
                strength: 0.6,
                complexity_threshold: 0.4,
                applicable_types: vec![ReasoningType::Collaboration, ReasoningType::SocialInteraction],
                suggested_actions: vec![
                    "Identify stakeholders".to_string(),
                    "Facilitate communication".to_string(),
                    "Coordinate efforts".to_string(),
                    "Share knowledge".to_string(),
                ],
            },
        ]
    }
}

/// Reasoning pattern for different types of thinking
#[derive(Debug, Clone)]
pub struct ReasoningPattern {
    pub id: uuid::Uuid,
    pub name: String,
    pub description: String,
    pub strength: f32,
    pub complexity_threshold: f32,
    pub applicable_types: Vec<ReasoningType>,
    pub suggested_actions: Vec<String>,
}

impl ReasoningPattern {
    /// Check if pattern is applicable to request type and complexity
    pub fn is_applicable(&self, request_type: &ReasoningType, complexity: f32) -> bool {
        self.applicable_types.contains(request_type) && complexity >= self.complexity_threshold
    }

    pub fn get_suggested_actions(&self, _request_type: &ReasoningType) -> Vec<String> {
        self.suggested_actions.clone()
    }
} 