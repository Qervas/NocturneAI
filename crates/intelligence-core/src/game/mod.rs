/*!
# Game Plugin - Core Game Logic

Handles agent movement, animations, interactions, and world simulation.
*/

use bevy::prelude::*;
use shared_types::*;
use std::collections::HashMap;
use crate::GameUIScale;

// Import submodules
mod agents;
mod world;
mod interactions;
mod animations;
mod visualizations;

// Re-export key components
pub use agents::*;
pub use world::*;
pub use interactions::*;
pub use animations::*;
pub use visualizations::*;

/// Game plugin that manages the entire agent simulation
pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            // Add resources
            .init_resource::<SelectedAgent>()
            .init_resource::<WorldConfig>()
            .init_resource::<InteractionState>()
            .init_resource::<CommunicationEffects>()
            
            // Add events
            .add_event::<AgentClickedEvent>()
            .add_event::<AgentInteractionEvent>()
            .add_event::<CommunicationEvent>()
            .add_event::<ThoughtBubbleEvent>()
            .add_event::<WorldEvent>()
            
            // Core game systems
            .add_systems(Update, (
                handle_agent_clicks,
                handle_world_interactions,
                update_agent_movement,
                update_connections,
                update_connection_visuals,
                sync_agent_visuals,
                update_agent_states,
                process_world_events,
                scale_ui_elements,
            ))
            
            // Visual systems
            .add_systems(Update, (
                update_agent_animations,
                update_sparkle_effects,
                update_agent_auras,
            ))
            
            // Communication systems
            .add_systems(Update, (
                process_agent_communications,
                update_communication_effects,
                update_thought_bubbles,
                spawn_interaction_particles,
                update_agent_decision_making,
            ))
            
            // Graph visualization systems
            .add_systems(Update, (
                update_directed_graph_connections,
                update_connection_particles,
                visualize_agent_connections,
            ))
            
            // Add startup systems
            .add_systems(Startup, (
                setup_cute_agents,
                setup_communication_system,
            ));
    }
}

/// Resource for tracking selected agent
#[derive(Resource, Default)]
pub struct SelectedAgent {
    pub entity: Option<Entity>,
    pub agent_id: Option<AgentId>,
}

/// World configuration
#[derive(Resource)]
pub struct WorldConfig {
    pub world_size: Vec2,
    pub agent_interaction_distance: f32,
    pub connection_visibility_threshold: f32,
    pub animation_speed: f32,
}

impl Default for WorldConfig {
    fn default() -> Self {
        Self {
            world_size: Vec2::new(800.0, 600.0),
            agent_interaction_distance: 150.0,
            connection_visibility_threshold: 0.3,
            animation_speed: 1.0,
        }
    }
}

/// Resource for managing interaction state
#[derive(Resource, Default)]
pub struct InteractionState {
    pub pending_interactions: Vec<PendingInteraction>,
    pub interaction_cooldowns: std::collections::HashMap<AgentId, f32>,
}

/// Communication effects resource
#[derive(Resource, Default)]
pub struct CommunicationEffects {
    pub active_communications: Vec<ActiveCommunication>,
    pub particle_effects: Vec<ParticleEffect>,
}

#[derive(Clone, Debug)]
pub struct PendingInteraction {
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub interaction_type: String,
    pub delay: f32,
}

/// Event fired when an agent is clicked
#[derive(Event)]
pub struct AgentClickedEvent {
    pub entity: Entity,
    pub agent_id: AgentId,
    pub world_position: Vec2,
}

/// Event for agent interactions
#[derive(Event)]
pub struct AgentInteractionEvent {
    pub source: AgentId,
    pub target: AgentId,
    pub interaction_type: String,
}

/// Event for communication between agents
#[derive(Event)]
pub struct CommunicationEvent {
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub message_type: CommunicationType,
    pub content: String,
    pub urgency: f32,
}

/// Event for thought bubbles
#[derive(Event)]
pub struct ThoughtBubbleEvent {
    pub agent_id: AgentId,
    pub thought: String,
    pub emotion: Mood,
    pub duration: f32,
}

/// Struct for active communications
#[derive(Clone)]
pub struct ActiveCommunication {
    pub from_position: Vec2,
    pub to_position: Vec2,
    pub color: Color,
    pub progress: f32,
    pub duration: f32,
    pub message_type: CommunicationType,
}

/// Particle effect for visual feedback
#[derive(Clone, Component)]
pub struct ParticleEffect {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

/// Component for thought bubbles
#[derive(Component)]
pub struct ThoughtBubble {
    pub text: String,
    pub emotion: Mood,
    pub timer: f32,
    pub duration: f32,
    pub offset: Vec2,
}

/// Component for communication line effects
#[derive(Component)]
pub struct CommunicationLine {
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub message_type: CommunicationType,
    pub progress: f32,
    pub duration: f32,
}

/// Component for agent decision making
#[derive(Component)]
pub struct AgentDecisionMaking {
    pub current_goal: String,
    pub decision_timer: f32,
    pub decision_interval: f32,
    pub last_action: String,
    pub thinking: bool,
}

/// Handle agent clicks with proper cursor position calculation
fn handle_agent_clicks(
    mut click_events: EventWriter<AgentClickedEvent>,
    mut selected_agent: ResMut<SelectedAgent>,
    mouse_input: Res<Input<MouseButton>>,
    windows: Query<&Window>,
    camera_query: Query<(&Camera, &GlobalTransform)>,
    agent_query: Query<(Entity, &AgentProfile, &Transform), With<AgentProfile>>,
) {
    if !mouse_input.just_pressed(MouseButton::Left) {
        return;
    }

    let window = windows.single();
    let (camera, camera_transform) = camera_query.single();

    if let Some(cursor_pos) = window.cursor_position() {
        if let Some(world_pos) = camera.viewport_to_world_2d(camera_transform, cursor_pos) {
            // Check if we clicked on an agent
            for (entity, profile, transform) in agent_query.iter() {
                let agent_pos = transform.translation.truncate();
                let distance = world_pos.distance(agent_pos);
                
                if distance < 30.0 { // Agent click radius
                    selected_agent.entity = Some(entity);
                    selected_agent.agent_id = Some(profile.id);
                    
                    click_events.send(AgentClickedEvent {
                        entity,
                        agent_id: profile.id,
                        world_position: world_pos,
                    });
                    
                    info!("🎯 Selected agent: {}", profile.name);
                    break;
                }
            }
        }
    }
}

/// Handle world interactions like collaboration
fn handle_world_interactions(
    keys: Res<Input<KeyCode>>,
    selected_agent: Res<SelectedAgent>,
    mut interaction_events: EventWriter<AgentInteractionEvent>,
) {
    if keys.just_pressed(KeyCode::Space) {
        if let Some(agent_id) = selected_agent.agent_id {
            info!("🌟 Triggering interaction for agent: {:?}", agent_id);
        }
    }
}

/// Update agent movement with smooth interpolation
fn update_agent_movement(
    time: Res<Time>,
    mut agent_query: Query<(&mut Transform, &mut AgentTransform, &AgentState)>,
) {
    for (mut transform, mut agent_transform, state) in agent_query.iter_mut() {
        if agent_transform.is_moving {
            let direction = (agent_transform.target_position - agent_transform.position).normalize_or_zero();
            let move_distance = agent_transform.move_speed * time.delta_seconds();
            
            agent_transform.position += direction * move_distance;
            transform.translation = agent_transform.position.extend(0.0);
            
            // Check if reached target
            if agent_transform.position.distance(agent_transform.target_position) < 5.0 {
                agent_transform.is_moving = false;
                agent_transform.position = agent_transform.target_position;
            }
        }
        
        // Add some gentle floating animation based on energy
        let float_offset = (time.elapsed_seconds() * 2.0 + transform.translation.x * 0.01).sin() * 2.0 * (state.energy / 100.0);
        transform.translation.y += float_offset * time.delta_seconds();
    }
}

/// Update connections (placeholder)
fn update_connections() {
    // TODO: Implement connection dynamics
}

/// Update connection visuals with animated lines
fn update_connection_visuals(
    mut commands: Commands,
    connection_query: Query<&AgentConnection>,
    agent_query: Query<(&AgentProfile, &Transform), With<AgentProfile>>,
) {
    // This will be enhanced with the new communication visualization system
}

/// Component for pulsing animation on agents
#[derive(Component)]
pub struct PulsingAgent {
    pub pulse_timer: f32,
    pub pulse_speed: f32,
    pub base_scale: f32,
}

/// Sync agent visuals with their state
fn sync_agent_visuals(
    mut commands: Commands,
    mut agent_query: Query<(Entity, &mut Sprite, &mut Transform, &AgentProfile, &AgentState), With<AgentProfile>>,
    pulsing_query: Query<&PulsingAgent>,
    time: Res<Time>,
) {
    for (entity, mut sprite, mut transform, profile, state) in agent_query.iter_mut() {
        // Enhanced visual styling based on personality and state
        let base_color = match profile.color_theme {
            ColorTheme::Ocean => Color::rgb(0.2, 0.7, 1.0),
            ColorTheme::Forest => Color::rgb(0.2, 0.8, 0.3),
            ColorTheme::Sunset => Color::rgb(1.0, 0.6, 0.2),
            ColorTheme::Lavender => Color::rgb(0.7, 0.5, 1.0),
            ColorTheme::Coral => Color::rgb(1.0, 0.4, 0.6),
            ColorTheme::Gold => Color::rgb(1.0, 0.8, 0.2),
            ColorTheme::Galaxy => Color::rgb(0.6, 0.3, 0.9),
            ColorTheme::Cherry => Color::rgb(0.8, 0.2, 0.4),
            ColorTheme::Mint => Color::rgb(0.4, 0.8, 0.6),
        };
        
        // Apply mood-based visual effects
        let mood_modifier = match state.mood {
            Mood::Happy | Mood::Excited => Color::rgb(1.2, 1.1, 1.0),
            Mood::Creative | Mood::Innovative => Color::rgb(1.1, 1.1, 1.2),
            Mood::Focused | Mood::Contemplative => Color::rgb(1.0, 1.0, 1.2),
            Mood::Analytical => Color::rgb(0.9, 0.9, 1.1),
            Mood::Tired | Mood::Stressed => Color::rgb(0.8, 0.8, 0.9),
            Mood::Calm => Color::rgb(0.9, 1.0, 0.9),
            _ => Color::rgb(1.0, 1.0, 1.0),
        };
        
        // Create beautiful gradient-like effect by modulating the base color
        let final_color = Color::rgb(
            (base_color.r() * mood_modifier.r()).min(1.0),
            (base_color.g() * mood_modifier.g()).min(1.0),
            (base_color.b() * mood_modifier.b()).min(1.0)
        );
        
        // Add pulsing animation based on agent activity
        let scale_modifier = if let Ok(pulsing) = pulsing_query.get(entity) {
            1.0 + (pulsing.pulse_timer * pulsing.pulse_speed).sin() * 0.1
        } else {
            1.0 + (time.elapsed_seconds() * 2.0 + transform.translation.x * 0.01).sin() * 0.05
        };
        
        // Create beautiful rounded shape instead of square
        sprite.color = final_color;
        sprite.custom_size = Some(Vec2::new(
            80.0 * scale_modifier,
            80.0 * scale_modifier
        ));
        
        // Add subtle floating animation based on personality
        let float_speed = match profile.communication_style {
            CommunicationStyle::Formal | CommunicationStyle::Professional => 1.0,
            CommunicationStyle::Casual => 1.5,
            CommunicationStyle::Technical => 0.8,
            CommunicationStyle::Creative => 2.0,
            CommunicationStyle::Analytical => 0.9,
        };
        
        let float_offset = (time.elapsed_seconds() * float_speed + transform.translation.x * 0.1).sin() * 3.0;
        
        // Create more sophisticated visual hierarchy based on autonomy
        transform.translation.z = match profile.autonomy_level {
            AutonomyLevel::Supervised => 1.0,
            AutonomyLevel::Collaborative => 1.1,
            AutonomyLevel::Independent => 1.2,
            AutonomyLevel::Autonomous => 1.5,
            AutonomyLevel::Guided => 1.0,
        };
        
        // Add glow effect based on activity level
        let activity_glow = (state.energy * 0.003).min(0.3);
        sprite.color.set_a(0.9 + activity_glow);
        
        // Add pulsing component if not already present
        if pulsing_query.get(entity).is_err() {
            commands.entity(entity).insert(PulsingAgent {
                pulse_timer: 0.0,
                pulse_speed: 2.0,
                base_scale: 1.0,
            });
        }
    }
}

/// Update agent animations
fn update_agent_animations(
    mut agent_query: Query<(&mut Transform, &mut PulsingAgent, &AgentState)>,
    time: Res<Time>,
) {
    for (mut transform, mut pulsing, state) in agent_query.iter_mut() {
        pulsing.pulse_timer += pulsing.pulse_speed * time.delta_seconds();
        
        // Pulse based on energy and focus
        let energy_factor = state.energy / 100.0;
        let focus_factor = state.focus / 100.0;
        let pulse_intensity = 0.05 + energy_factor * 0.1;
        let pulse_speed = 1.0 + focus_factor * 2.0;
        
        let scale_factor = 1.0 + (pulsing.pulse_timer * pulse_speed).sin() * pulse_intensity;
        transform.scale = Vec3::splat(pulsing.base_scale * scale_factor);
    }
}

/// Update agent states over time
fn update_agent_states(
    time: Res<Time>,
    mut interaction_state: ResMut<InteractionState>,
) {
    let dt = time.delta_seconds();
    
    // Update interaction cooldowns
    for (_, cooldown) in interaction_state.interaction_cooldowns.iter_mut() {
        *cooldown = (*cooldown - dt).max(0.0);
    }
    
    // Update pending interactions
    interaction_state.pending_interactions.retain_mut(|interaction| {
        interaction.delay -= dt;
        interaction.delay > 0.0
    });
}

/// Process world events
fn process_world_events(
    mut world_events: EventReader<WorldEvent>,
) {
    for event in world_events.read() {
        match event {
            WorldEvent::AgentJoined(agent_id) => {
                info!("🎉 Agent joined: {:?}", agent_id);
            }
            WorldEvent::InteractionOccurred(from, to, interaction_type) => {
                info!("🤝 Interaction: {:?} -> {:?} ({})", from, to, interaction_type);
            }
            _ => {}
        }
    }
}

/// Scale UI elements based on UI scale
fn scale_ui_elements(
    ui_scale: Res<GameUIScale>,
    mut text_query: Query<&mut Text>,
) {
    if ui_scale.is_changed() {
        for mut text in text_query.iter_mut() {
            for section in text.sections.iter_mut() {
                section.style.font_size = section.style.font_size * ui_scale.scale;
            }
        }
    }
}

// NEW ENHANCED SYSTEMS

/// Setup cute agents with personalities and goals
fn setup_cute_agents(mut commands: Commands) {
    let agents = vec![
        AgentProfile {
            id: uuid::Uuid::new_v4(),
            name: "Luna 🌙".to_string(),
            role: "Creative Dreamer".to_string(),
            description: "Loves brainstorming and coming up with wild ideas!".to_string(),
            avatar_emoji: "🌙".to_string(),
            color_theme: ColorTheme::Galaxy,
            personality: PersonalityTraits {
                openness: 0.9,
                innovation: 0.95,
                curiosity: 0.85,
                collaboration: 0.7,
                ..Default::default()
            },
            expertise_areas: vec!["Creative Design".to_string(), "Innovation".to_string()],
            communication_style: CommunicationStyle::Creative,
            autonomy_level: AutonomyLevel::Independent,
            created_at: chrono::Utc::now(),
        },
        AgentProfile {
            id: uuid::Uuid::new_v4(),
            name: "Spark ⚡".to_string(),
            role: "Problem Solver".to_string(),
            description: "Quick thinking and loves solving puzzles!".to_string(),
            avatar_emoji: "⚡".to_string(),
            color_theme: ColorTheme::Sunset,
            personality: PersonalityTraits {
                conscientiousness: 0.9,
                innovation: 0.8,
                curiosity: 0.85,
                collaboration: 0.8,
                ..Default::default()
            },
            expertise_areas: vec!["Problem Solving".to_string(), "Analysis".to_string()],
            communication_style: CommunicationStyle::Analytical,
            autonomy_level: AutonomyLevel::Collaborative,
            created_at: chrono::Utc::now(),
        },
        AgentProfile {
            id: uuid::Uuid::new_v4(),
            name: "Sage 🌱".to_string(),
            role: "Wise Mentor".to_string(),
            description: "Patient and thoughtful, always ready to help others learn!".to_string(),
            avatar_emoji: "🌱".to_string(),
            color_theme: ColorTheme::Forest,
            personality: PersonalityTraits {
                empathy: 0.95,
                collaboration: 0.9,
                conscientiousness: 0.85,
                agreeableness: 0.9,
                ..Default::default()
            },
            expertise_areas: vec!["Teaching".to_string(), "Mentorship".to_string()],
            communication_style: CommunicationStyle::Professional,
            autonomy_level: AutonomyLevel::Collaborative,
            created_at: chrono::Utc::now(),
        },
        AgentProfile {
            id: uuid::Uuid::new_v4(),
            name: "Buzz 🐝".to_string(),
            role: "Social Connector".to_string(),
            description: "Energetic and loves bringing everyone together!".to_string(),
            avatar_emoji: "🐝".to_string(),
            color_theme: ColorTheme::Gold,
            personality: PersonalityTraits {
                extraversion: 0.95,
                collaboration: 0.9,
                empathy: 0.8,
                agreeableness: 0.85,
                ..Default::default()
            },
            expertise_areas: vec!["Communication".to_string(), "Team Building".to_string()],
            communication_style: CommunicationStyle::Casual,
            autonomy_level: AutonomyLevel::Collaborative,
            created_at: chrono::Utc::now(),
        },
    ];

    // Remove the entire agent spawning loop to prevent duplicate agents
    // let agents = vec![ ... ];
    // for (i, profile) in agents.iter().enumerate() { ... }

    info!("🎮 Cute agents setup complete! (Using agents from main spawn)");
}

/// Setup communication system
fn setup_communication_system(mut commands: Commands) {
    commands.init_resource::<CommunicationEffects>();
    info!("💬 Communication system initialized!");
}

/// Process agent communications and decision making
fn process_agent_communications(
    time: Res<Time>,
    mut communication_events: EventWriter<CommunicationEvent>,
    mut thought_events: EventWriter<ThoughtBubbleEvent>,
    mut agent_query: Query<(Entity, &AgentProfile, &mut AgentState, &mut AgentDecisionMaking, &Transform)>,
) {
    let dt = time.delta_seconds();
    
    // Collect agent data first to avoid borrowing conflicts
    let mut agents_data: Vec<(AgentId, String, CommunicationStyle, f32, Mood)> = Vec::new();
    let mut updates: Vec<(Entity, String, String, String, AgentState, f32)> = Vec::new();
    
    // First pass: collect data and process decisions
    for (entity, profile, state, mut decision, _transform) in agent_query.iter_mut() {
        decision.decision_timer += dt;
        
        agents_data.push((
            profile.id, 
            profile.name.clone(), 
            profile.communication_style.clone(),
            state.sociability,
            state.mood.clone(),
        ));
        
        // Make decisions periodically
        if decision.decision_timer >= decision.decision_interval {
            decision.decision_timer = 0.0;
            decision.thinking = true;
            
            // Generate thoughts and actions based on personality
            let (new_goal, action, thought) = generate_agent_behavior(profile, &state);
            
            // Send thought bubble
            thought_events.send(ThoughtBubbleEvent {
                agent_id: profile.id,
                thought: thought.clone(),
                emotion: state.mood.clone(),
                duration: 8.0,  // Increased from 3.0 to 8.0 seconds
            });
            
            // Update agent state
            let mut new_state = state.clone();
            update_agent_state_from_action(&mut new_state, &action);
            
            updates.push((entity, new_goal, action, thought, new_state, state.sociability));
        }
    }
    
    // Second pass: apply updates and generate communications
    for (entity, new_goal, action, _thought, new_state, sociability) in updates {
        if let Ok((_entity, profile, mut state, mut decision, _transform)) = agent_query.get_mut(entity) {
            decision.current_goal = new_goal;
            decision.last_action = action.clone();
            *state = new_state;
            
            // Maybe communicate with another agent
            if sociability > 60.0 && fastrand::f32() < 0.7 {
                // Find a communication target from collected data
                if let Some((target_id, target_name)) = find_simple_communication_target(profile.id, &agents_data) {
                    let (message_type, content) = generate_simple_communication_content(
                        &profile.name, 
                        &profile.communication_style, 
                        &target_name
                    );
                    
                    communication_events.send(CommunicationEvent {
                        from_agent: profile.id,
                        to_agent: target_id,
                        message_type,
                        content,
                        urgency: state.energy / 100.0,
                    });
                }
            }
        }
    }
}

/// Generate agent behavior based on personality
fn generate_agent_behavior(profile: &AgentProfile, state: &AgentState) -> (String, String, String) {
    let behaviors = match profile.communication_style {
        CommunicationStyle::Creative => vec![
            ("Creating something beautiful", "Brainstorming new ideas", "💡 What if we tried something completely different?"),
            ("Exploring possibilities", "Sketching concepts", "🎨 I see colors and patterns everywhere!"),
            ("Inspiring others", "Sharing creative vision", "✨ Imagine if we could make this magical..."),
        ],
        CommunicationStyle::Analytical => vec![
            ("Solving complex problems", "Analyzing data patterns", "🔍 Let me break this down step by step..."),
            ("Optimizing systems", "Finding root causes", "⚙️ There's definitely a pattern here!"),
            ("Researching solutions", "Testing hypotheses", "📊 The numbers are telling an interesting story..."),
        ],
        CommunicationStyle::Professional => vec![
            ("Mentoring team members", "Sharing knowledge", "🌱 Every challenge is a chance to grow!"),
            ("Planning strategies", "Building consensus", "🗺️ Let's think about the bigger picture..."),
            ("Facilitating growth", "Guiding discussions", "🤝 How can we help each other succeed?"),
        ],
        CommunicationStyle::Casual => vec![
            ("Connecting with everyone", "Spreading good vibes", "🐝 Hey everyone! What's buzzing today?"),
            ("Organizing team events", "Building relationships", "🎉 We should all celebrate together!"),
            ("Sharing exciting news", "Boosting morale", "🌟 You'll never guess what amazing thing just happened!"),
        ],
        _ => vec![
            ("Learning something new", "Exploring ideas", "🤔 There's so much to discover!"),
            ("Helping others", "Collaborating", "😊 How can I help make this better?"),
        ],
    };
    
    let choice = fastrand::usize(0..behaviors.len());
    let (goal, action, thought) = behaviors[choice];
    
    (goal.to_string(), action.to_string(), thought.to_string())
}

/// Find a simple communication target from agent data
fn find_simple_communication_target(
    source_id: AgentId, 
    agents_data: &[(AgentId, String, CommunicationStyle, f32, Mood)]
) -> Option<(AgentId, String)> {
    agents_data.iter()
        .filter(|(id, _, _, _, _)| *id != source_id)
        .max_by_key(|(_, _, _, sociability, _)| (*sociability * 100.0) as i32)
        .map(|(id, name, _, _, _)| (*id, name.clone()))
}

/// Generate simple communication content
fn generate_simple_communication_content(
    from_name: &str, 
    from_style: &CommunicationStyle, 
    to_name: &str
) -> (CommunicationType, String) {
    let messages = match from_style {
        CommunicationStyle::Creative => vec![
            (CommunicationType::Idea, format!("Hey {}! I have this amazing idea... ✨", to_name)),
            (CommunicationType::Question, format!("{}, what do you think about this concept? 🎨", to_name)),
        ],
        CommunicationStyle::Analytical => vec![
            (CommunicationType::Question, format!("{}, can you help me analyze this? 🔍", to_name)),
            (CommunicationType::Collaboration, format!("Let's work together, {}! 📊", to_name)),
        ],
        CommunicationStyle::Professional => vec![
            (CommunicationType::Question, format!("{}, what would you like to learn today? 📚", to_name)),
            (CommunicationType::Collaboration, format!("I think we could achieve great things together, {}! 🌱", to_name)),
        ],
        CommunicationStyle::Casual => vec![
            (CommunicationType::Greeting, format!("Hi {}! You're doing amazing! 🌟", to_name)),
            (CommunicationType::Idea, format!("{}, let's make something awesome together! 🚀", to_name)),
        ],
        _ => vec![
            (CommunicationType::Greeting, format!("Hello {}! How are you doing? 😊", to_name)),
            (CommunicationType::Collaboration, format!("Want to work together, {}? 🤝", to_name)),
        ],
    };
    
    let choice = fastrand::usize(0..messages.len());
    messages[choice].clone()
}

/// Update agent state based on their actions
fn update_agent_state_from_action(state: &mut AgentState, action: &str) {
    match action {
        s if s.contains("Brainstorming") || s.contains("Creating") => {
            state.creativity = (state.creativity + 5.0).min(100.0);
            state.energy = (state.energy - 2.0).max(0.0);
            state.mood = if state.creativity > 80.0 { Mood::Creative } else { state.mood.clone() };
        },
        s if s.contains("Analyzing") || s.contains("Solving") => {
            state.focus = (state.focus + 5.0).min(100.0);
            state.confidence = (state.confidence + 3.0).min(100.0);
            state.mood = if state.focus > 80.0 { Mood::Focused } else { state.mood.clone() };
        },
        s if s.contains("Mentoring") || s.contains("Teaching") => {
            state.sociability = (state.sociability + 5.0).min(100.0);
            state.stress = (state.stress - 3.0).max(0.0);
            state.mood = Mood::Calm;
        },
        s if s.contains("Connecting") || s.contains("Organizing") => {
            state.energy = (state.energy + 3.0).min(100.0);
            state.sociability = (state.sociability + 5.0).min(100.0);
            state.mood = Mood::Energetic;
        },
        _ => {
            state.energy = (state.energy - 1.0).max(30.0);
        }
    }
    
    // Gradual recovery over time
    state.energy = (state.energy + 1.0).min(100.0);
    state.stress = (state.stress - 0.5).max(0.0);
}

/// Update communication effects and visualizations  
fn update_communication_effects(
    mut commands: Commands,
    time: Res<Time>,
    mut communication_events: EventReader<CommunicationEvent>,
    mut communication_effects: ResMut<CommunicationEffects>,
    agent_query: Query<(&AgentProfile, &Transform)>,
) {
    let dt = time.delta_seconds();
    
    // Handle new communication events
    for event in communication_events.read() {
        if let Some((from_transform, to_transform)) = find_agent_positions(event.from_agent, event.to_agent, &agent_query) {
            let color = match event.message_type {
                CommunicationType::Question => Color::rgb(0.3, 0.7, 1.0),  // Blue
                CommunicationType::Answer => Color::rgb(0.2, 0.9, 0.3),    // Green
                CommunicationType::Idea => Color::rgb(1.0, 0.8, 0.2),      // Yellow
                CommunicationType::Collaboration => Color::rgb(0.9, 0.3, 0.9), // Purple
                CommunicationType::Problem => Color::rgb(1.0, 0.4, 0.2),   // Orange
                CommunicationType::Solution => Color::rgb(0.2, 0.8, 0.9),  // Cyan
                CommunicationType::Greeting => Color::rgb(1.0, 0.6, 0.8),  // Pink
                CommunicationType::Farewell => Color::rgb(0.7, 0.7, 0.7),  // Gray
            };
            
            communication_effects.active_communications.push(ActiveCommunication {
                from_position: from_transform.translation.truncate(),
                to_position: to_transform.translation.truncate(),
                message_type: event.message_type.clone(),
                progress: 0.0,
                duration: 2.0,
                color,
            });
            
            // Spawn particle effects at source
            spawn_communication_particles(&mut commands, from_transform.translation.truncate(), color);
            
            info!("💬 {} -> {}: {}", 
                find_agent_name(event.from_agent, &agent_query).unwrap_or("Unknown".to_string()),
                find_agent_name(event.to_agent, &agent_query).unwrap_or("Unknown".to_string()),
                event.content
            );
        }
    }
    
    // Update active communications - collect completed ones first
    let mut completed_communications = Vec::new();
    for (i, comm) in communication_effects.active_communications.iter_mut().enumerate() {
        comm.progress += dt / comm.duration;
        
        if comm.progress >= 1.0 {
            completed_communications.push((i, comm.to_position, comm.color));
        }
    }
    
    // Spawn particles for completed communications and remove them
    for (_, to_position, color) in completed_communications.iter() {
        spawn_communication_particles(&mut commands, *to_position, *color);
    }
    
    // Remove completed communications (reverse order to maintain indices)
    for (i, _, _) in completed_communications.iter().rev() {
        communication_effects.active_communications.remove(*i);
    }
    
    // Update particle effects
    communication_effects.particle_effects.retain_mut(|particle| {
        particle.lifetime -= dt;
        particle.position += particle.velocity * dt;
        particle.velocity *= 0.95; // Damping
        particle.size *= 0.98;
        
        particle.lifetime > 0.0
    });
}

/// Find agent positions for communication visualization
fn find_agent_positions<'a>(
    from_id: AgentId, 
    to_id: AgentId, 
    agent_query: &'a Query<(&AgentProfile, &Transform)>
) -> Option<(&'a Transform, &'a Transform)> {
    let mut from_transform = None;
    let mut to_transform = None;
    
    for (profile, transform) in agent_query.iter() {
        if profile.id == from_id {
            from_transform = Some(transform);
        } else if profile.id == to_id {
            to_transform = Some(transform);
        }
    }
    
    if let (Some(from), Some(to)) = (from_transform, to_transform) {
        Some((from, to))
    } else {
        None
    }
}

/// Find agent name by ID
fn find_agent_name(agent_id: AgentId, agent_query: &Query<(&AgentProfile, &Transform)>) -> Option<String> {
    agent_query.iter()
        .find(|(profile, _)| profile.id == agent_id)
        .map(|(profile, _)| profile.name.clone())
}

/// Spawn communication particle effects
fn spawn_communication_particles(commands: &mut Commands, position: Vec2, color: Color) {
    for _ in 0..8 {
        let angle = fastrand::f32() * 2.0 * std::f32::consts::PI;
        let speed = 50.0 + fastrand::f32() * 100.0;
        let velocity = Vec2::new(angle.cos(), angle.sin()) * speed;
        
        commands.spawn((
            SpriteBundle {
                sprite: Sprite {
                    color,
                    custom_size: Some(Vec2::splat(4.0)),
                    ..default()
                },
                transform: Transform::from_translation(position.extend(1.0)),
                ..default()
            },
            ParticleEffect {
                position,
                velocity,
                color,
                size: 4.0,
                lifetime: 1.0,
                max_lifetime: 1.0,
            },
        ));
    }
}

/// Update thought bubbles
fn update_thought_bubbles(
    mut commands: Commands,
    time: Res<Time>,
    mut thought_events: EventReader<ThoughtBubbleEvent>,
    mut bubble_query: Query<(Entity, &mut ThoughtBubble, &mut Transform, &mut Text)>,
    agent_query: Query<(&AgentProfile, &Transform), Without<ThoughtBubble>>,
) {
    let dt = time.delta_seconds();
    
    // Handle new thought events
    for event in thought_events.read() {
        if let Some((_, agent_transform)) = agent_query.iter().find(|(profile, _)| profile.id == event.agent_id) {
            let bubble_position = agent_transform.translation + Vec3::new(0.0, 80.0, 10.0); // Higher z-level
            
            commands.spawn((
                Text2dBundle {
                    text: Text::from_section(
                        format!("💭 {}", event.thought.clone()),
                        TextStyle {
                            font_size: 16.0,
                            color: Color::rgba(1.0, 1.0, 1.0, 0.9),
                            ..default()
                        },
                    ),
                    transform: Transform::from_translation(bubble_position),
                    ..default()
                },
                ThoughtBubble {
                    text: event.thought.clone(),
                    emotion: event.emotion.clone(),
                    timer: 0.0,
                    duration: event.duration,
                    offset: Vec2::new(0.0, 60.0),
                },
            ));
        }
    }
    
    // Update existing thought bubbles
    for (entity, mut bubble, mut transform, mut text) in bubble_query.iter_mut() {
        bubble.timer += dt;
        
        // Fade out over time - start fading at 70% of duration for longer visibility
        let fade_progress = (bubble.timer / bubble.duration).min(1.0);
        let alpha = if fade_progress < 0.7 { 1.0 } else { (1.0 - fade_progress) / 0.3 };
        
        for section in text.sections.iter_mut() {
            section.style.color.set_a(alpha);
        }
        
        // Float upward slowly for better readability
        transform.translation.y += 8.0 * dt;
        
        // Remove when expired
        if bubble.timer >= bubble.duration {
            commands.entity(entity).despawn();
        }
    }
}

/// Spawn interaction particles - simplified to avoid borrowing conflicts
fn spawn_interaction_particles(
    _commands: Commands,
    communication_effects: Res<CommunicationEffects>,
) {
    // Simple particle spawning without immediate effects access
    for _comm in communication_effects.active_communications.iter() {
        // Particle effects are now handled in update_communication_effects
    }
}

/// Update agent decision making process
fn update_agent_decision_making(
    time: Res<Time>,
    mut agent_query: Query<(&AgentProfile, &mut AgentDecisionMaking)>,
) {
    let dt = time.delta_seconds();
    
    for (profile, mut decision) in agent_query.iter_mut() {
        if decision.thinking {
            decision.thinking = false;
            info!("🧠 {} is now {}: {}", 
                profile.name, 
                decision.current_goal, 
                decision.last_action
            );
        }
    }
}

/// Visualize connections between agents as a proper directed graph
fn visualize_agent_connections(
    mut commands: Commands,
    connection_query: Query<&AgentConnection>,
    agent_query: Query<(&AgentProfile, &Transform), With<AgentProfile>>,
    existing_connections: Query<Entity, With<GraphEdge>>,
) {
    // Clear existing visual connections
    for entity in existing_connections.iter() {
        commands.entity(entity).despawn();
    }
    
    // Create visual connections for each agent connection
    for connection in connection_query.iter() {
        if let Some((from_pos, to_pos)) = find_agent_positions_for_connection(
            connection.from_agent,
            connection.to_agent,
            &agent_query,
        ) {
            create_directed_graph_edge(
                &mut commands,
                connection.clone(),
                from_pos,
                to_pos,
            );
        }
    }
}

/// Create a beautiful directed graph edge with arrow
fn create_directed_graph_edge(
    commands: &mut Commands,
    connection: AgentConnection,
    from_pos: Vec2,
    to_pos: Vec2,
) {
    let direction = (to_pos - from_pos).normalize();
    let distance = from_pos.distance(to_pos);
    let center = from_pos.lerp(to_pos, 0.5);
    
    // Calculate edge color based on connection type
    let edge_color = match connection.connection_type {
        ConnectionType::Collaboration => Color::rgb(0.4, 0.8, 0.4),
        ConnectionType::Mentorship => Color::rgb(0.8, 0.6, 0.2),
        ConnectionType::Consultation => Color::rgb(0.6, 0.4, 0.8),
        ConnectionType::DataSharing => Color::rgb(0.2, 0.6, 0.8),
        ConnectionType::Friendship => Color::rgb(0.8, 0.4, 0.6),
        ConnectionType::Competition => Color::rgb(0.8, 0.2, 0.2),
        ConnectionType::Learning => Color::rgb(0.4, 0.6, 0.8),
        ConnectionType::Professional => Color::rgb(0.6, 0.6, 0.6),
    };
    
    // Create the main edge line
    let edge_thickness = 2.0 + connection.strength * 3.0;
    let edge_alpha = 0.6 + connection.strength * 0.4;
    
    commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: edge_color.with_a(edge_alpha),
                custom_size: Some(Vec2::new(distance - 80.0, edge_thickness)),
                ..default()
            },
            transform: Transform::from_translation(center.extend(0.5))
                .with_rotation(Quat::from_rotation_z(direction.y.atan2(direction.x))),
            ..default()
        },
        GraphEdge {
            from_agent: connection.from_agent,
            to_agent: connection.to_agent,
            connection_type: connection.connection_type.clone(),
            strength: connection.strength,
            color: edge_color,
        },
    ));
    
    // Create arrow head
    let arrow_size = 15.0;
    let arrow_pos = to_pos - direction * 60.0; // Position arrow near target but not overlapping
    
    // Create arrow head as a triangle
    commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: edge_color.with_a(edge_alpha),
                custom_size: Some(Vec2::new(arrow_size, arrow_size)),
                ..default()
            },
            transform: Transform::from_translation(arrow_pos.extend(0.6))
                .with_rotation(Quat::from_rotation_z(direction.y.atan2(direction.x))),
            ..default()
        },
        ArrowHead {
            target_agent: connection.to_agent,
            connection_type: connection.connection_type,
        },
    ));
    
    // Add connection label
    let label_pos = center + Vec2::new(0.0, 20.0);
    let label_text = format!("{:.1}", connection.strength);
    
    commands.spawn((
        Text2dBundle {
            text: Text::from_section(
                label_text,
                TextStyle {
                    font_size: 12.0,
                    color: edge_color.with_a(0.8),
                    ..default()
                },
            ),
            transform: Transform::from_translation(label_pos.extend(1.0)),
            ..default()
        },
        ConnectionLabel {
            connection_id: connection.id,
            strength: connection.strength,
        },
    ));
}

/// Spawn cute sparkle effects around agents
fn spawn_agent_sparkles(commands: &mut Commands, agent_entity: Entity, position: Vec2, color: Color) {
    for i in 0..5 {
        let angle = (i as f32 / 5.0) * 2.0 * std::f32::consts::PI;
        let orbit_radius = 30.0 + fastrand::f32() * 20.0;
        let orbit_phase = fastrand::f32() * 2.0 * std::f32::consts::PI;
        
        commands.spawn((
            SpriteBundle {
                sprite: Sprite {
                    color: color.with_a(0.8),
                    custom_size: Some(Vec2::splat(3.0)),
                    ..default()
                },
                transform: Transform::from_translation(position.extend(2.0)),
                ..default()
            },
            SparkleEffect {
                position,
                color,
                size: 3.0,
                lifetime: 3.0,
                max_lifetime: 3.0,
                twinkle_speed: 4.0 + fastrand::f32() * 2.0,
                orbit_radius,
                orbit_speed: 1.0 + fastrand::f32() * 0.5,
                orbit_phase,
            },
        ));
    }
}

/// Update sparkle effects
fn update_sparkle_effects(
    mut commands: Commands,
    mut query: Query<(Entity, &mut Transform, &mut SparkleEffect, &mut Sprite)>,
    time: Res<Time>,
) {
    let dt = time.delta_seconds();
    
    for (entity, mut transform, mut sparkle, mut sprite) in query.iter_mut() {
        sparkle.lifetime -= dt;
        
        // Update orbit position
        sparkle.orbit_phase += sparkle.orbit_speed * dt;
        let orbit_x = sparkle.orbit_radius * sparkle.orbit_phase.cos();
        let orbit_y = sparkle.orbit_radius * sparkle.orbit_phase.sin();
        
        transform.translation.x = sparkle.position.x + orbit_x;
        transform.translation.y = sparkle.position.y + orbit_y;
        
        // Twinkle effect
        let twinkle = (sparkle.twinkle_speed * sparkle.lifetime).sin().abs();
        sprite.color.set_a(twinkle * 0.8);
        
        // Scale based on lifetime
        let scale = (sparkle.lifetime / sparkle.max_lifetime).min(1.0);
        transform.scale = Vec3::splat(scale);
        
        // Remove when expired
        if sparkle.lifetime <= 0.0 {
            commands.entity(entity).despawn();
        }
    }
}

/// Update agent aura effects
fn update_agent_auras(
    mut query: Query<(&mut AgentAura, &Transform, &AgentState)>,
    time: Res<Time>,
) {
    let dt = time.delta_seconds();
    
    for (mut aura, _transform, state) in query.iter_mut() {
        // Update aura intensity based on agent state
        aura.intensity = (state.energy + state.confidence + state.sociability) / 300.0;
        
        // Pulse the aura
        aura.current_radius = aura.max_radius * (1.0 + (time.elapsed_seconds() * aura.pulse_speed).sin() * 0.1);
        
        // Adjust color alpha based on intensity (store value to avoid borrowing issue)
        let intensity = aura.intensity;
        aura.color.set_a(intensity * 0.3);
    }
} 

/// Component for animated directed graph connections
#[derive(Component)]
pub struct DirectedConnection {
    pub from_agent: AgentId,
    pub to_agent: AgentId,
    pub connection_type: ConnectionType,
    pub strength: f32,
    pub animation_progress: f32,
    pub curve_control_point: Vec2,
    pub arrow_positions: Vec<Vec2>,
    pub pulse_timer: f32,
    pub connection_color: Color,
    pub thickness: f32,
    pub is_bidirectional: bool,
    pub from_pos: Vec2,
    pub to_pos: Vec2,
}

/// Component for connection flow particles
#[derive(Component)]
pub struct ConnectionParticle {
    pub path_progress: f32,
    pub speed: f32,
    pub connection_entity: Entity,
    pub particle_type: ParticleType,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
}

#[derive(Clone, Debug)]
pub enum ParticleType {
    Data,
    Collaboration,
    Knowledge,
    Energy,
    Question,
    Answer,
}

/// Enhanced connection visualization system
fn update_directed_graph_connections(
    mut commands: Commands,
    time: Res<Time>,
    mut connection_query: Query<(Entity, &mut DirectedConnection, &Transform)>,
    agent_query: Query<(&AgentProfile, &Transform), With<AgentProfile>>,
    connection_data: Query<&AgentConnection>,
) {
    let dt = time.delta_seconds();
    
    // First, update existing connections
    for (entity, mut connection, _transform) in connection_query.iter_mut() {
        // Find agent positions
        if let Some((from_pos, to_pos)) = find_agent_positions_for_connection(
            connection.from_agent,
            connection.to_agent,
            &agent_query,
        ) {
            connection.from_pos = from_pos;
            connection.to_pos = to_pos;
            // Update animation progress
            connection.animation_progress += dt * 0.5;
            if connection.animation_progress > 1.0 {
                connection.animation_progress = 0.0;
            }
            
            // Update pulse timer
            connection.pulse_timer += dt * 3.0;
            
            // Calculate curve control point for smooth arcs
            let mid_point = (from_pos + to_pos) / 2.0;
            let direction = (to_pos - from_pos).normalize();
            let perpendicular = Vec2::new(-direction.y, direction.x);
            connection.curve_control_point = mid_point + perpendicular * 50.0;
            
            // Update connection strength visualization
            connection.thickness = 2.0 + connection.strength * 3.0;
            
            // Update color based on connection type
            connection.connection_color = match connection.connection_type {
                ConnectionType::Collaboration => Color::rgba(0.3, 0.9, 0.3, 0.8),
                ConnectionType::Mentorship => Color::rgba(0.9, 0.7, 0.3, 0.8),
                ConnectionType::DataSharing => Color::rgba(0.3, 0.7, 0.9, 0.8),
                ConnectionType::Learning => Color::rgba(0.9, 0.3, 0.7, 0.8),
                ConnectionType::Friendship => Color::rgba(0.9, 0.6, 0.9, 0.8),
                _ => Color::rgba(0.7, 0.7, 0.7, 0.6),
            };
            
            // Add pulsing effect
            let pulse_factor = 1.0 + (connection.pulse_timer.sin() * 0.2);
            connection.connection_color = connection.connection_color.with_a(
                connection.connection_color.a() * pulse_factor
            );
            
            // Spawn flow particles periodically
            if connection.animation_progress < 0.1 {
                spawn_connection_particles(
                    &mut commands,
                    entity,
                    from_pos,
                    to_pos,
                    connection.curve_control_point,
                    connection.connection_type.clone(),
                );
            }
        }
    }
    
    // Create new connections for agents that don't have visual connections yet
    for agent_connection in connection_data.iter() {
        let connection_exists = connection_query.iter().any(|(_, conn, _)| {
            conn.from_agent == agent_connection.from_agent && 
            conn.to_agent == agent_connection.to_agent
        });
        
        if !connection_exists {
            if let Some((from_pos, to_pos)) = find_agent_positions_for_connection(
                agent_connection.from_agent,
                agent_connection.to_agent,
                &agent_query,
            ) {
                create_directed_connection(
                    &mut commands,
                    agent_connection.clone(),
                    from_pos,
                    to_pos,
                );
            }
        }
    }
}

/// Create a beautiful directed connection visualization
fn create_directed_connection(
    commands: &mut Commands,
    connection: AgentConnection,
    from_pos: Vec2,
    to_pos: Vec2,
) {
    let mid_point = (from_pos + to_pos) / 2.0;
    let direction = (to_pos - from_pos).normalize();
    let perpendicular = Vec2::new(-direction.y, direction.x);
    let curve_control_point = mid_point + perpendicular * 50.0;
    
    // Create the connection entity
    commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: Color::rgba(0.7, 0.7, 0.7, 0.6),
                custom_size: Some(Vec2::new(2.0, 2.0)),
                ..default()
            },
            transform: Transform::from_translation(mid_point.extend(0.3)),
            ..default()
        },
        DirectedConnection {
            from_agent: connection.from_agent,
            to_agent: connection.to_agent,
            connection_type: connection.connection_type,
            strength: connection.strength,
            animation_progress: 0.0,
            curve_control_point,
            arrow_positions: Vec::new(),
            pulse_timer: 0.0,
            connection_color: Color::rgba(0.7, 0.7, 0.7, 0.6),
            thickness: 2.0,
            is_bidirectional: false,
            from_pos: from_pos,
            to_pos: to_pos,
        },
    ));
}

/// Find agent positions for connection visualization
fn find_agent_positions_for_connection(
    from_id: AgentId,
    to_id: AgentId,
    agent_query: &Query<(&AgentProfile, &Transform), With<AgentProfile>>,
) -> Option<(Vec2, Vec2)> {
    let mut from_pos = None;
    let mut to_pos = None;
    
    for (profile, transform) in agent_query.iter() {
        if profile.id == from_id {
            from_pos = Some(transform.translation.truncate());
        } else if profile.id == to_id {
            to_pos = Some(transform.translation.truncate());
        }
    }
    
    if let (Some(from), Some(to)) = (from_pos, to_pos) {
        Some((from, to))
    } else {
        None
    }
}

/// Spawn particles that flow along connections
fn spawn_connection_particles(
    commands: &mut Commands,
    connection_entity: Entity,
    from_pos: Vec2,
    to_pos: Vec2,
    control_point: Vec2,
    connection_type: ConnectionType,
) {
    let (particle_type, color, speed) = match connection_type {
        ConnectionType::Collaboration => (
            ParticleType::Collaboration,
            Color::rgba(0.3, 0.9, 0.3, 0.9),
            1.0,
        ),
        ConnectionType::DataSharing => (
            ParticleType::Data,
            Color::rgba(0.3, 0.7, 0.9, 0.9),
            1.5,
        ),
        ConnectionType::Learning => (
            ParticleType::Knowledge,
            Color::rgba(0.9, 0.3, 0.7, 0.9),
            0.8,
        ),
        ConnectionType::Mentorship => (
            ParticleType::Energy,
            Color::rgba(0.9, 0.7, 0.3, 0.9),
            0.6,
        ),
        _ => (
            ParticleType::Data,
            Color::rgba(0.7, 0.7, 0.7, 0.7),
            1.0,
        ),
    };
    
    for _ in 0..3 {
        commands.spawn((
            SpriteBundle {
                sprite: Sprite {
                    color,
                    custom_size: Some(Vec2::splat(4.0)),
                    ..default()
                },
                transform: Transform::from_translation(from_pos.extend(0.8)),
                ..default()
            },
            ConnectionParticle {
                path_progress: 0.0,
                speed,
                connection_entity,
                particle_type: particle_type.clone(),
                color,
                size: 4.0,
                lifetime: 2.0,
            },
        ));
    }
}

/// Update particles flowing along connections
fn update_connection_particles(
    mut commands: Commands,
    time: Res<Time>,
    mut particle_query: Query<(Entity, &mut ConnectionParticle, &mut Transform, &mut Sprite)>,
    connection_query: Query<&DirectedConnection>,
) {
    let dt = time.delta_seconds();
    
    for (entity, mut particle, mut transform, mut sprite) in particle_query.iter_mut() {
        particle.path_progress += dt * particle.speed;
        particle.lifetime -= dt;
        
        // Remove expired particles
        if particle.lifetime <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }
        
        // Find the connection this particle belongs to
        if let Ok(connection) = connection_query.get(particle.connection_entity) {
            // Calculate position along the curved path
            let t = particle.path_progress;
            if t <= 1.0 {
                // Quadratic Bezier curve calculation
                let from_agent_pos = connection.from_pos;
                let to_agent_pos = connection.to_pos;
                
                let curve_pos = quadratic_bezier(
                    from_agent_pos,
                    connection.curve_control_point,
                    to_agent_pos,
                    t,
                );
                
                transform.translation = curve_pos.extend(0.8);
                
                // Add some sparkle effect
                let sparkle_alpha = (t * 4.0).sin().abs();
                sprite.color.set_a(sparkle_alpha * 0.9);
            } else {
                // Particle reached the end
                commands.entity(entity).despawn();
            }
        }
    }
}

/// Calculate point on quadratic Bezier curve
fn quadratic_bezier(p0: Vec2, p1: Vec2, p2: Vec2, t: f32) -> Vec2 {
    let t_inv = 1.0 - t;
    t_inv * t_inv * p0 + 2.0 * t_inv * t * p1 + t * t * p2
} 