/*!
# Cognitive Services - Intelligence Empire

Advanced AI reasoning, decision-making, and memory systems for autonomous agents.
*/

use shared_types::*;
use reasoning::*;
use decision_engine::*;
use serde_json::Value;
use serde::{Serialize, Deserialize};

pub mod reasoning;
pub mod decision_engine; 
pub mod langraph;

pub use reasoning::*;
pub use decision_engine::*;
pub use langraph::*;

/// Main cognitive service for agent reasoning
#[derive(Debug)]
pub struct CognitiveService {
    pub reasoning_engine: ReasoningEngine,
    pub decision_engine: DecisionEngine,
    pub langraph_client: LangGraphClient,
    pub memory_store: MemoryStore,
}

impl CognitiveService {
    pub fn new() -> Self {
        Self {
            reasoning_engine: ReasoningEngine::new(),
            decision_engine: DecisionEngine::new(),
            langraph_client: LangGraphClient::new(),
            memory_store: MemoryStore::new(),
        }
    }

    /// Process reasoning request
    pub async fn process_reasoning(
        &mut self,
        request: ReasoningRequest,
    ) -> Result<ReasoningResponse> {
        // Get relevant memories
        let memories = self.memory_store.get_relevant_memories(&request.agent_id, &request.context).await?;
        
        // Use reasoning engine
        let decision = self.reasoning_engine.process_reasoning(
            &request.agent_id,
            &request.context,
            &request.agent_state,
            &memories[..],
            &request.request_type,
        ).await?;

        // Use decision engine for final decision
        let final_decision = self.decision_engine.make_decision(&decision).await?;

        // Store memory
        self.memory_store.store_memory(
            &request.agent_id,
            &format!("Reasoning: {}", request.context),
            &final_decision.reasoning,
            0.8,
        ).await?;

        Ok(ReasoningResponse {
            agent_id: request.agent_id,
            response: final_decision.reasoning,
            confidence: final_decision.confidence,
            suggested_mood: decision.suggested_mood,
            suggested_actions: final_decision.suggested_actions,
            processing_time_ms: 100, // Placeholder
        })
    }

    /// Process social learning event
    pub async fn process_social_learning(
        &mut self,
        event: SocialLearningEvent,
    ) -> Result<shared_types::SocialLearningResult> {
        // Use reasoning engine for social learning
        let result = self.reasoning_engine.process_social_learning(event).await?;
        Ok(result)
    }

    /// Get agent reasoning state
    pub async fn get_agent_reasoning_state(&self, agent_id: &AgentId) -> Result<AgentReasoningState> {
        let mut state = AgentReasoningState::default();
        
        // Add active reasoning if any
        if let Some(session) = self.reasoning_engine.get_active_session(agent_id) {
            state.active_reasoning_sessions.insert(*agent_id, session);
        }
        
        // Add recent decisions
        state.recent_decisions = self.decision_engine.get_recent_decisions(agent_id).await?;
        
        Ok(state)
    }

    /// Get relevant memories for agent
    pub async fn get_relevant_memories(
        &self,
        agent_id: &AgentId,
        context: &str,
    ) -> Result<Vec<ReasoningMemory>> {
        self.memory_store.get_relevant_memories(agent_id, context).await
    }

    /// Store new memory
    pub async fn store_memory(
        &mut self,
        agent_id: &AgentId,
        context: &str,
        content: &str,
        importance: f32,
    ) -> Result<()> {
        self.memory_store.store_memory(agent_id, context, content, importance).await
    }

    /// Update agent reasoning based on new information
    pub async fn update_reasoning(
        &mut self,
        agent_id: &AgentId,
        new_information: &str,
        context: &str,
    ) -> Result<()> {
        // Store the new information as memory
        self.memory_store.store_memory(agent_id, context, new_information, 0.7).await?;
        
        // Update reasoning patterns if needed
        self.reasoning_engine.update_patterns(agent_id, new_information).await?;
        
        Ok(())
    }

    /// Get reasoning patterns
    pub fn get_reasoning_patterns(&self) -> &[ReasoningPattern] {
        self.reasoning_engine.get_patterns()
    }

    /// Process LangGraph workflow
    pub async fn process_langgraph_workflow(
        &mut self,
        agent_id: &AgentId,
        workflow_type: &str,
        input_data: &str,
    ) -> Result<ReasoningDecision> {
        self.langraph_client.process_workflow(agent_id, workflow_type, input_data).await
    }
}

/// Memory store for agent memories
#[derive(Debug)]
pub struct MemoryStore {
    memories: std::collections::HashMap<AgentId, Vec<ReasoningMemory>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        Self {
            memories: std::collections::HashMap::new(),
        }
    }

    pub async fn get_relevant_memories(
        &self,
        agent_id: &AgentId,
        context: &str,
    ) -> Result<Vec<ReasoningMemory>> {
        let agent_memories = self.memories.get(agent_id).cloned().unwrap_or_default();
        
        // Simple relevance filtering based on context keywords
        let relevant_memories = agent_memories.into_iter()
            .filter(|memory| {
                memory.context.contains(context) || 
                memory.content.contains(context) ||
                memory.importance > 0.7
            })
            .collect();
        
        Ok(relevant_memories)
    }

    pub async fn store_memory(
        &mut self,
        agent_id: &AgentId,
        context: &str,
        content: &str,
        importance: f32,
    ) -> Result<()> {
        let memory = ReasoningMemory {
            id: uuid::Uuid::new_v4(),
            agent_id: *agent_id,
            context: context.to_string(),
            content: content.to_string(),
            importance,
            timestamp: chrono::Utc::now(),
        };
        
        self.memories.entry(*agent_id).or_insert_with(Vec::new).push(memory);
        Ok(())
    }
}

impl Default for CognitiveService {
    fn default() -> Self {
        Self::new()
    }
} 