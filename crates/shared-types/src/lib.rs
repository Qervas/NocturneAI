/*!
# Shared Types for Intelligence Empire

Common types, components, and resources used across the entire application.
*/

use bevy::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// Re-export UUID for convenience
pub use uuid::Uuid as AgentId;

/// Basic agent profile with personality and expertise
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentProfile {
    pub id: AgentId,
    pub name: String,
    pub role: String,
    pub description: String,
    pub avatar_emoji: String,
    pub color_theme: ColorTheme,
    pub personality: PersonalityTraits,
    pub expertise_areas: Vec<String>,
    pub communication_style: CommunicationStyle,
    pub autonomy_level: AutonomyLevel,
    pub created_at: DateTime<Utc>,
}

/// Current state of an agent
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentState {
    pub energy: f32,           // 0-100
    pub focus: f32,            // 0-100
    pub confidence: f32,       // 0-100
    pub stress: f32,           // 0-100
    pub sociability: f32,      // 0-100
    pub creativity: f32,       // 0-100
    pub mood: Mood,
    pub current_task: Option<String>,
    pub is_active: bool,
    pub interaction_count: u32,
    pub last_activity: DateTime<Utc>,
}

/// Agent's position and movement data
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentTransform {
    pub position: Vec2,
    pub target_position: Vec2,
    pub scale: f32,
    pub rotation: f32,
    pub is_moving: bool,
    pub move_speed: f32,
}

/// Visual representation for cute agents
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct CuteAgentVisual {
    pub emoji: String,
    pub base_size: f32,
    pub glow_color: Color,
    pub pulse_speed: f32,
    pub pulse_phase: f32,
    pub bounce_offset: f32,
    pub sparkle_timer: f32,
    pub personality_aura: Color,
    pub interaction_glow: f32,
    pub thought_bubble_offset: Vec2,
}

impl Default for CuteAgentVisual {
    fn default() -> Self {
        Self {
            emoji: "🤖".to_string(),
            base_size: 1.0,
            glow_color: Color::WHITE,
            pulse_speed: 2.0,
            pulse_phase: 0.0,
            bounce_offset: 0.0,
            sparkle_timer: 0.0,
            personality_aura: Color::rgba(1.0, 1.0, 1.0, 0.3),
            interaction_glow: 0.0,
            thought_bubble_offset: Vec2::new(0.0, 80.0),
        }
    }
}

/// Component for sparkle effects around agents
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct SparkleEffect {
    pub position: Vec2,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
    pub max_lifetime: f32,
    pub twinkle_speed: f32,
    pub orbit_radius: f32,
    pub orbit_speed: f32,
    pub orbit_phase: f32,
}

/// Component for agent aura effects
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentAura {
    pub color: Color,
    pub intensity: f32,
    pub pulse_speed: f32,
    pub max_radius: f32,
    pub current_radius: f32,
}

/// Connection between agents with relationship data
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentConnection {
    pub id: AgentId,
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub connection_type: ConnectionType,
    pub strength: f32,         // 0.0-1.0
    pub created_at: DateTime<Utc>,
}

/// Color themes for agent personalities
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ColorTheme {
    Ocean,
    Sunset,
    Forest,
    Galaxy,
    Coral,
    Lavender,
    Cherry,
    Mint,
    Gold,
}

impl ColorTheme {
    pub fn primary_color(&self) -> Color {
        match self {
            ColorTheme::Ocean => Color::rgb(0.2, 0.6, 0.9),
            ColorTheme::Sunset => Color::rgb(0.9, 0.5, 0.2),
            ColorTheme::Forest => Color::rgb(0.3, 0.7, 0.4),
            ColorTheme::Galaxy => Color::rgb(0.6, 0.3, 0.9),
            ColorTheme::Coral => Color::rgb(0.9, 0.4, 0.5),
            ColorTheme::Lavender => Color::rgb(0.7, 0.5, 0.9),
            ColorTheme::Cherry => Color::rgb(0.8, 0.2, 0.4),
            ColorTheme::Mint => Color::rgb(0.4, 0.8, 0.6),
            ColorTheme::Gold => Color::rgb(0.9, 0.7, 0.2),
        }
    }

    pub fn secondary_color(&self) -> Color {
        match self {
            ColorTheme::Ocean => Color::rgb(0.1, 0.3, 0.5),
            ColorTheme::Sunset => Color::rgb(0.6, 0.3, 0.1),
            ColorTheme::Forest => Color::rgb(0.2, 0.4, 0.2),
            ColorTheme::Galaxy => Color::rgb(0.3, 0.1, 0.5),
            ColorTheme::Coral => Color::rgb(0.5, 0.2, 0.3),
            ColorTheme::Lavender => Color::rgb(0.4, 0.3, 0.5),
            ColorTheme::Cherry => Color::rgb(0.5, 0.1, 0.2),
            ColorTheme::Mint => Color::rgb(0.2, 0.5, 0.3),
            ColorTheme::Gold => Color::rgb(0.6, 0.4, 0.1),
        }
    }
}

/// Personality traits that influence agent behavior
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PersonalityTraits {
    pub openness: f32,          // 0.0-1.0
    pub conscientiousness: f32, // 0.0-1.0
    pub extraversion: f32,      // 0.0-1.0
    pub agreeableness: f32,     // 0.0-1.0
    pub neuroticism: f32,       // 0.0-1.0
    pub curiosity: f32,         // 0.0-1.0
    pub collaboration: f32,     // 0.0-1.0
    pub innovation: f32,        // 0.0-1.0
    pub empathy: f32,           // 0.0-1.0
}

impl Default for PersonalityTraits {
    fn default() -> Self {
        Self {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.3,
            curiosity: 0.6,
            collaboration: 0.7,
            innovation: 0.5,
            empathy: 0.6,
        }
    }
}

/// Current mood affects agent decisions and interactions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Mood {
    Focused,
    Creative,
    Analytical,
    Collaborative,
    Innovative,
    Contemplative,
    Energetic,
    Calm,
    Stressed,
    Excited,
    Curious,
    Tired,
    Confident,
    Happy,
}

impl Mood {
    pub fn emoji(&self) -> &str {
        match self {
            Mood::Focused => "🎯",
            Mood::Creative => "🎨",
            Mood::Analytical => "🔍",
            Mood::Collaborative => "🤝",
            Mood::Innovative => "💡",
            Mood::Contemplative => "🤔",
            Mood::Energetic => "⚡",
            Mood::Calm => "😌",
            Mood::Stressed => "😤",
            Mood::Excited => "🤩",
            Mood::Curious => "🤓",
            Mood::Tired => "😴",
            Mood::Confident => "😎",
            Mood::Happy => "😊",
        }
    }
}

/// Communication styles for different agents
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CommunicationStyle {
    Professional,
    Technical,
    Creative,
    Analytical,
    Casual,
    Formal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CommunicationType {
    Question,
    Answer,
    Problem,
    Solution,
    Greeting,
    Farewell,
    Idea,
    Collaboration,
}

/// Autonomy levels for agent decision-making
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AutonomyLevel {
    Supervised,     // Requires approval
    Collaborative,  // Works with others
    Independent,    // Can act alone
    Autonomous,     // Fully autonomous
    Guided,         // Guided by external input
}

/// Types of connections between agents
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConnectionType {
    Collaboration,
    Mentorship,
    Competition,
    DataSharing,
    Learning,
    Consultation,
    Friendship,
    Professional,
}

/// Reasoning types for cognitive services
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ReasoningType {
    TaskExecution,
    SocialInteraction,
    Learning,
    ProblemSolving,
    CreativeThinking,
    Collaboration,
}

/// Request for reasoning services
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReasoningRequest {
    pub agent_id: AgentId,
    pub context: String,
    pub agent_state: AgentState,
    pub social_context: Vec<AgentConnection>,
    pub request_type: ReasoningType,
}

/// Response from reasoning services
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReasoningResponse {
    pub agent_id: AgentId,
    pub response: String,
    pub confidence: f32,
    pub suggested_mood: Option<Mood>,
    pub suggested_actions: Vec<String>,
    pub processing_time_ms: u64,
}

/// Social learning event
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SocialLearningEvent {
    pub source_agent: AgentId,
    pub target_agent: AgentId,
    pub interaction_type: String,
    pub knowledge_transferred: String,
    pub effectiveness: f32,
    pub timestamp: DateTime<Utc>,
}

/// Social learning result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SocialLearningResult {
    pub learning_effectiveness: f32,
    pub knowledge_gained: String,
    pub skill_improvements: Vec<String>,
    pub relationship_impact: f32,
}

/// Intelligence Empire error types
#[derive(Debug, thiserror::Error)]
pub enum IntelligenceError {
    #[error("Agent not found: {id}")]
    AgentNotFound { id: AgentId },
    
    #[error("Cognitive service error: {message}")]
    CognitiveService { message: String },
    
    #[error("Social engine error: {message}")]
    SocialEngine { message: String },
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Generic error: {0}")]
    Generic(String),
}

/// Result type for Intelligence Empire operations
pub type Result<T> = std::result::Result<T, IntelligenceError>;

/// World events that can occur in the agent simulation
#[derive(Debug, Clone, Event, Serialize, Deserialize)]
pub enum WorldEvent {
    AgentJoined(AgentId),
    AgentLeft(AgentId),
    ConnectionEstablished(AgentId, AgentId),
    ConnectionBroken(AgentId, AgentId),
    TaskCompleted(AgentId, String),
    TaskFailed(AgentId, String),
    InteractionOccurred(AgentId, AgentId, String),
    MoodChanged(AgentId, Mood),
    EnergyLevelChanged(AgentId, f32),
}

/// Agent interaction data for social learning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentInteraction {
    pub id: AgentId,
    pub timestamp: DateTime<Utc>,
    pub participants: Vec<AgentId>,
    pub interaction_type: String,
    pub content: String,
    pub outcome: InteractionOutcome,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InteractionOutcome {
    Successful,
    Failed,
    Partial,
    Pending,
}

/// Agent reasoning state for cognitive services
#[derive(Debug, Clone, Resource, Serialize, Deserialize)]
pub struct AgentReasoningState {
    pub active_reasoning_sessions: std::collections::HashMap<AgentId, String>,
    pub recent_decisions: Vec<AgentDecision>,
    pub learning_progress: std::collections::HashMap<AgentId, f32>,
    pub current_focus: Option<String>,
    pub reasoning_capacity: f32,
    pub learning_rate: f32,
    pub social_learning_progress: std::collections::HashMap<AgentId, f32>,
}

impl Default for AgentReasoningState {
    fn default() -> Self {
        Self {
            active_reasoning_sessions: std::collections::HashMap::new(),
            recent_decisions: Vec::new(),
            learning_progress: std::collections::HashMap::new(),
            current_focus: None,
            reasoning_capacity: 0.8,
            learning_rate: 0.1,
            social_learning_progress: std::collections::HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct AgentDecision {
    pub agent_id: AgentId,
    pub decision_type: String,
    pub timestamp: DateTime<Utc>,
    pub confidence: f32,
    pub reasoning: String,
    pub outcome: Option<String>,
    pub current_goal: String,
    pub decision_timer: f32,
    pub decision_interval: f32,
    pub last_action: String,
    pub thinking: bool,
}

impl Default for AgentDecision {
    fn default() -> Self {
        Self {
            agent_id: Uuid::new_v4(),
            decision_type: "Initial".to_string(),
            timestamp: chrono::Utc::now(),
            confidence: 1.0,
            reasoning: "Started".to_string(),
            outcome: None,
            current_goal: "Initialize".to_string(),
            decision_timer: 0.0,
            decision_interval: 5.0,
            last_action: "Started".to_string(),
            thinking: false,
        }
    }
}

/// Agent memory for social learning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentMemory {
    pub id: AgentId,
    pub agent_id: AgentId,
    pub memory_type: MemoryType,
    pub content: String,
    pub importance: f32,
    pub created_at: DateTime<Utc>,
    pub accessed_count: u32,
    pub last_accessed: DateTime<Utc>,
}

/// Memory structure for reasoning
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReasoningMemory {
    pub id: uuid::Uuid,
    pub agent_id: AgentId,
    pub context: String,
    pub content: String,
    pub importance: f32,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Reasoning decision structure
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReasoningDecision {
    pub agent_id: AgentId,
    pub decision_type: String,
    pub reasoning: String,
    pub reasoning_explanation: String,
    pub confidence: f32,
    pub suggested_actions: Vec<String>,
    pub suggested_mood: Option<Mood>,
    pub complexity_score: f32,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MemoryType {
    Episodic,      // Specific experiences
    Semantic,      // General knowledge
    Procedural,    // How to do things
    Social,        // Relationships and interactions
    Emotional,     // Emotional associations
}

/// LangGraph integration types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LangGraphMessage {
    pub id: String,
    pub from_agent: AgentId,
    pub to_agent: Option<AgentId>,
    pub message_type: MessageType,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageType {
    Query,
    Response,
    Collaboration,
    DataRequest,
    DataResponse,
    TaskAssignment,
    TaskCompletion,
    Notification,
    Broadcast,
}

/// Ollama LLM integration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OllamaRequest {
    pub model: String,
    pub prompt: String,
    pub context: Vec<String>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub agent_id: AgentId,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OllamaResponse {
    pub response: String,
    pub context: Vec<String>,
    pub model: String,
    pub timestamp: DateTime<Utc>,
    pub tokens_used: u32,
}

/// Backend API integration types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BackendSyncData {
    pub agents: Vec<AgentProfile>,
    pub connections: Vec<AgentConnection>,
    pub interactions: Vec<AgentInteraction>,
    pub last_sync: DateTime<Utc>,
}

// Common constants
pub const MAX_AGENTS: usize = 100;
pub const MAX_CONNECTIONS_PER_AGENT: usize = 20;
pub const DEFAULT_INTERACTION_COOLDOWN: f32 = 5.0;
pub const DEFAULT_ENERGY_DRAIN_RATE: f32 = 0.1;
pub const DEFAULT_FOCUS_RECOVERY_RATE: f32 = 0.05; 

/// Component for graph edges in directed graph visualization
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct GraphEdge {
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub connection_type: ConnectionType,
    pub strength: f32,
    pub color: Color,
}

/// Component for arrow heads in directed graph
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct ArrowHead {
    pub target_agent: AgentId,
    pub connection_type: ConnectionType,
}

/// Component for connection labels showing strength
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct ConnectionLabel {
    pub connection_id: AgentId,
    pub strength: f32,
}

/// Component for visual representation of agents in graph
#[derive(Debug, Clone, Component, Serialize, Deserialize, PartialEq)]
pub struct GraphVertex {
    pub agent_id: AgentId,
    pub position: Vec2,
    pub radius: f32,
    pub color: Color,
    pub label: String,
} 