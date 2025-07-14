/*!
# Agent Game Logic

Agent-specific behaviors, AI integration, and autonomous actions.
*/

use bevy::prelude::*;
use shared_types::*;
use crate::game::{spawn_agent_sparkles};
use crate::GameUIScale;
use std::collections::HashMap;

// TODO: Implement agent-specific game logic
// - Agent AI decision making
// - Autonomous behavior triggers
// - Personality-based actions
// - Learning and adaptation

/// Component for agents that can think autonomously
#[derive(Component)]
pub struct AutonomousAgent {
    pub last_decision_time: f32,
    pub decision_interval: f32,
    pub autonomy_enabled: bool,
}

impl Default for AutonomousAgent {
    fn default() -> Self {
        Self {
            last_decision_time: 0.0,
            decision_interval: 5.0, // Think every 5 seconds
            autonomy_enabled: true,
        }
    }
}

/// System for processing autonomous agent decisions
pub fn process_autonomous_decisions(
    time: Res<Time>,
    mut agent_query: Query<(&mut AutonomousAgent, &AgentProfile, &mut AgentState)>,
) {
    let current_time = time.elapsed_seconds();
    
    for (mut autonomous, profile, mut state) in agent_query.iter_mut() {
        if !autonomous.autonomy_enabled {
            continue;
        }
        
        if current_time - autonomous.last_decision_time >= autonomous.decision_interval {
            // Time for this agent to make a decision
            autonomous.last_decision_time = current_time;
            
            // TODO: Integrate with cognitive services for real AI decisions
            // For now, simple autonomous behavior based on personality
            apply_personality_based_behavior(&profile, &mut state);
        }
    }
}

/// Apply simple personality-based behavior changes
fn apply_personality_based_behavior(profile: &AgentProfile, state: &mut AgentState) {
    // Curiosity affects focus changes
    if profile.personality.curiosity > 0.7 && state.focus < 70.0 {
        state.focus = (state.focus + 5.0).min(100.0);
    }
    
    // High conscientiousness maintains energy
    if profile.personality.conscientiousness > 0.8 && state.energy > 30.0 {
        state.energy = (state.energy - 1.0).max(0.0);
    } else {
        state.energy = (state.energy - 2.0).max(0.0);
    }
    
    // Extraversion affects sociability
    if profile.personality.extraversion > 0.6 {
        state.sociability = (state.sociability + 1.0).min(100.0);
    }
    
    // Neuroticism affects stress
    if profile.personality.neuroticism > 0.5 {
        state.stress = (state.stress + 0.5).min(100.0);
    } else {
        state.stress = (state.stress - 0.5).max(0.0);
    }
    
    // Update mood based on overall state
    update_mood_based_on_state(state);
}

/// Update agent mood based on current state values
fn update_mood_based_on_state(state: &mut AgentState) {
    if state.energy > 80.0 && state.focus > 70.0 {
        state.mood = Mood::Focused;
    } else if state.energy > 70.0 && state.creativity > 80.0 {
        state.mood = Mood::Creative;
    } else if state.stress > 70.0 {
        state.mood = Mood::Stressed;
    } else if state.energy < 30.0 {
        state.mood = Mood::Tired;
    } else if state.sociability > 80.0 {
        state.mood = Mood::Collaborative;
    } else if state.confidence > 80.0 {
        state.mood = Mood::Confident;
    } else {
        state.mood = Mood::Happy;
    }
} 

/// Update cute agent visuals with enhanced effects
pub fn update_cute_agent_visuals(
    mut commands: Commands,
    mut query: Query<(Entity, &mut Transform, &mut CuteAgentVisual, &AgentState, &AgentProfile)>,
    time: Res<Time>,
    ui_scale: Res<GameUIScale>,
) {
    let dt = time.delta_seconds();
    
    for (entity, mut transform, mut visual, state, profile) in query.iter_mut() {
        // Update pulse animation
        visual.pulse_phase += visual.pulse_speed * dt;
        
        // Update bounce animation based on energy
        visual.bounce_offset += dt * 3.0;
        let bounce_intensity = state.energy / 100.0 * 0.1;
        let bounce = (visual.bounce_offset.sin() * bounce_intensity).max(0.0);
        
        // Update sparkle timer
        visual.sparkle_timer += dt;
        
        // Scale based on energy and mood with enhanced effects
        let energy_factor = state.energy / 100.0;
        let mood_factor = match state.mood {
            Mood::Energetic => 1.3,
            Mood::Excited => 1.25,
            Mood::Creative => 1.2,
            Mood::Happy => 1.15,
            Mood::Focused => 1.1,
            Mood::Calm => 1.0,
            Mood::Analytical => 1.05,
            Mood::Innovative => 1.2,
            _ => 1.0,
        };
        
        let scale = visual.base_size * energy_factor * mood_factor * (1.0 + bounce);
        transform.scale = Vec3::splat(scale);
        
        // Update interaction glow
        visual.interaction_glow = (visual.interaction_glow - dt).max(0.0);
        
        // Spawn sparkles periodically when agent is active
        if visual.sparkle_timer > 2.0 && state.is_active {
            visual.sparkle_timer = 0.0;
            spawn_agent_sparkles(&mut commands, entity, transform.translation.truncate(), visual.glow_color);
        }
        
        // Add aura effect (simplified logic)
        commands.entity(entity).insert(AgentAura {
            color: visual.personality_aura,
            intensity: state.energy / 100.0,
            pulse_speed: visual.pulse_speed * 0.5,
            max_radius: 60.0,
            current_radius: 40.0,
        });
        
        // Adjust thought bubble offset based on scale
        visual.thought_bubble_offset.y = 80.0 * scale;
        
        // Update personality aura based on communication style
        visual.personality_aura = match profile.communication_style {
            CommunicationStyle::Creative => Color::rgba(1.0, 0.8, 0.9, 0.4),
            CommunicationStyle::Analytical => Color::rgba(0.7, 0.9, 1.0, 0.4),
            CommunicationStyle::Professional => Color::rgba(0.8, 1.0, 0.8, 0.4),
            CommunicationStyle::Casual => Color::rgba(1.0, 0.9, 0.7, 0.4),
            CommunicationStyle::Technical => Color::rgba(0.9, 0.8, 1.0, 0.4),
            CommunicationStyle::Formal => Color::rgba(0.8, 0.8, 0.9, 0.4),
        };
    }
}

// Add more agent systems here... 