/*!
# Agent Interactions

Agent-to-agent communication and collaboration systems.
*/

use bevy::prelude::*;
use shared_types::{*, CommunicationType};
use crate::game::{CommunicationEvent, ThoughtBubbleEvent, CommunicationEffects};

// TODO: Implement agent interactions
// - Direct communication
// - Collaboration workflows  
// - Knowledge sharing
// - Social learning 

/// Process agent communications and decision making
pub fn process_agent_communications(
    time: Res<Time>,
    mut communication_events: EventWriter<CommunicationEvent>,
    mut thought_events: EventWriter<ThoughtBubbleEvent>,
    mut agent_query: Query<(Entity, &AgentProfile, &mut AgentState, &mut AgentDecision, &Transform)>,
) {
    let dt = time.delta_seconds();
    
    // Collect agent data first to avoid borrowing conflicts
    let mut agents_data: Vec<(AgentId, String, CommunicationStyle, f32, Mood)> = Vec::new();
    let mut updates: Vec<(Entity, String, String, String, AgentState, f32, AgentProfile)> = Vec::new();
    
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
            
            // Update decision state
            decision.current_goal = new_goal;
            decision.last_action = action;
            decision.thinking = false;
            
            updates.push((entity, thought, decision.current_goal.clone(), decision.last_action.clone(), state.clone(), decision.decision_interval, profile.clone()));
        }
    }
    
    // Second pass: apply updates and process communications
    for (entity, thought, new_goal, action, state, interval, profile) in updates {
        if let Ok((_, _, mut state_ref, mut decision, _)) = agent_query.get_mut(entity) {
            *state_ref = state;
            decision.current_goal = new_goal;
            decision.last_action = action;
            decision.decision_interval = interval;
            
            info!("🧠 {} is now {}: {}", 
                profile.name, 
                decision.current_goal, 
                decision.last_action
            );
        }
    }

    // Process inter-agent communications
    let agent_count = agents_data.len();
    if agent_count > 1 {
        for i in 0..agent_count {
            for j in (i+1)..agent_count {
                let (id_a, name_a, style_a, soc_a, mood_a) = &agents_data[i];
                let (id_b, name_b, style_b, soc_b, mood_b) = &agents_data[j];
                
                // Calculate communication probability based on sociability
                let comm_prob = (soc_a + soc_b) / 200.0;
                
                if fastrand::f32() < comm_prob {
                    // Decide who initiates
                    let (from_id, from_style, from_mood, to_id, to_name) = if fastrand::bool() {
                        (*id_a, style_a.clone(), mood_a.clone(), *id_b, name_b.clone())
                    } else {
                        (*id_b, style_b.clone(), mood_b.clone(), *id_a, name_a.clone())
                    };
                    
                    // Generate message
                    let message = generate_styled_message(&from_style, &from_mood, to_name.as_str());
                    
                    communication_events.send(CommunicationEvent {
                        from_agent: from_id,
                        to_agent: to_id,
                        message_type: CommunicationType::Question,
                        content: message,
                        urgency: comm_prob,
                    });
                }
            }
        }
    }
}

pub fn generate_agent_behavior(profile: &AgentProfile, state: &AgentState) -> (String, String, String) {
    let goal = match profile.communication_style {
        CommunicationStyle::Creative => "Brainstorm innovative ideas".to_string(),
        CommunicationStyle::Analytical => "Analyze current situation".to_string(),
        CommunicationStyle::Professional => "Plan next steps".to_string(),
        CommunicationStyle::Casual => "Chat with friends".to_string(),
        CommunicationStyle::Technical => "Debug systems".to_string(),
        CommunicationStyle::Formal => "Prepare report".to_string(),
    };

    let action = match state.mood {
        Mood::Creative => "Sketch new concepts".to_string(),
        Mood::Focused => "Deep work session".to_string(),
        Mood::Happy => "Share positive vibes".to_string(),
        Mood::Analytical => "Run data analysis".to_string(),
        Mood::Innovative => "Experiment with ideas".to_string(),
        _ => "Reflect on progress".to_string(),
    };

    let thought = format!("💭 As a {} thinker, I feel {} and plan to {}", 
        format!("{:?}", profile.communication_style),
        format!("{:?}", state.mood),
        action,
    );

    (goal, action, thought)
}

pub fn generate_styled_message(style: &CommunicationStyle, mood: &Mood, to_name: &str) -> String {
    match style {
        CommunicationStyle::Creative => format!("Hey {}, let's imagine something amazing! 😊", to_name),
        CommunicationStyle::Analytical => format!("{}, based on the data, I think...", to_name),
        CommunicationStyle::Professional => format!("Dear {}, regarding the project...", to_name),
        CommunicationStyle::Casual => format!("Yo {}, what's up with that?", to_name),
        CommunicationStyle::Technical => format!("{}, the specs indicate...", to_name),
        CommunicationStyle::Formal => format!("Esteemed {}, I propose...", to_name),
    }
}

// Add other interaction systems... 