/*!
# UI Plugin - Game-like Interface

Beautiful, intuitive UI overlays that make agent interaction feel like a game.
Think The Sims meets AI management!
*/

use bevy::prelude::*;
use bevy_egui::{egui, EguiContexts};
use shared_types::*;
use crate::game::{SelectedAgent, AgentClickedEvent, WorldConfig};
use crate::ChatState;

/// Main UI plugin for game interface
pub struct UIPlugin;

impl Plugin for UIPlugin {
    fn build(&self, app: &mut App) {
        app
            // Resources
            .init_resource::<UIState>()
            
            // Systems
            .add_systems(Update, (
                ui_system,
                handle_agent_selection,
                update_ui_state,
            ));
    }
}

/// State management for UI
#[derive(Resource, Default)]
pub struct UIState {
    pub show_agent_panel: bool,
    pub show_world_stats: bool,
    pub show_creation_panel: bool,
    pub show_chat_panel: bool,
    pub panel_animation_time: f32,
    pub selected_agent_data: Option<SelectedAgentData>,
}

#[derive(Debug, Clone)]
pub struct SelectedAgentData {
    pub entity: Entity,
    pub profile: AgentProfile,
    pub state: AgentState,
    pub last_updated: f32,
}

/// Main UI system that renders all interface elements
fn ui_system(
    mut contexts: EguiContexts,
    mut ui_state: ResMut<UIState>,
    time: Res<Time>,
    _selected_agent: Res<SelectedAgent>,
    _agent_query: Query<(&AgentProfile, &AgentState)>,
    all_agents_query: Query<&AgentProfile>,
    chat_state: Res<ChatState>,
) {
    let ctx = contexts.ctx_mut();
    
    // Update animation time
    ui_state.panel_animation_time += time.delta_seconds();
    
    // Render different UI panels based on state
    render_top_status_bar(ctx, &all_agents_query);
    
    // Render agent detail panel if an agent is selected
    if let Some(agent_data) = ui_state.selected_agent_data.clone() {
        render_agent_detail_panel(ctx, &agent_data, &mut ui_state, &time);
    }
    
    // Render world stats panel
    if ui_state.show_world_stats {
        render_world_stats_panel(ctx, &all_agents_query);
    }
    
    // Render agent creation panel
    if ui_state.show_creation_panel {
        render_agent_creation_panel(ctx, &mut ui_state);
    }
    
    // Render chat panel if open
    if chat_state.is_chat_open {
        render_chat_panel(ctx, &chat_state);
    }
    
    // Always render quick actions bar
    render_quick_actions(ctx, &mut ui_state);
}

fn render_top_status_bar(
    ctx: &egui::Context,
    agent_query: &Query<&AgentProfile>,
) {
    egui::TopBottomPanel::top("top_status_bar").show(ctx, |ui| {
        ui.horizontal(|ui| {
            // Intelligence Empire title with emoji
            ui.heading("🏛️ Intelligence Empire");
            
            ui.separator();
            
            // Agent count with cute emoji
            let agent_count = agent_query.iter().count();
            ui.label(format!("👥 {} Active Agents", agent_count));
            
            ui.separator();
            
            // System status with animated indicator
            ui.label("🟢 System Online");
            
            // Add some spacing
            ui.add_space(10.0);
            
            // Add cute time display
            ui.label(format!("⏰ {}", chrono::Local::now().format("%H:%M:%S")));
        });
    });
}

fn render_agent_detail_panel(
    ctx: &egui::Context,
    agent_data: &SelectedAgentData,
    _ui_state: &mut UIState,
    _time: &Time,
) {
    egui::SidePanel::right("agent_detail_panel")
        .resizable(true)
        .default_width(300.0)
        .show(ctx, |ui| {
            ui.heading(format!("👤 {}", agent_data.profile.name));
            
            // Agent avatar emoji (large)
            ui.label(egui::RichText::new(&agent_data.profile.avatar_emoji).size(48.0));
            
            ui.separator();
            
            // Role and description
            ui.label(format!("🏢 {}", agent_data.profile.role));
            ui.label(format!("📝 {}", agent_data.profile.description));
            
            ui.separator();
            
            // Current mood and task
            ui.label(format!("😊 Mood: {} {}", agent_data.state.mood.emoji(), format!("{:?}", agent_data.state.mood)));
            
            if let Some(task) = &agent_data.state.current_task {
                ui.label(format!("🎯 Task: {}", task));
            }
            
            ui.separator();
            
            // Agent stats with cute progress bars
            ui.label("📊 Agent Stats:");
            render_cute_progress_bar(ui, "⚡ Energy", agent_data.state.energy, egui::Color32::from_rgb(255, 200, 0));
            render_cute_progress_bar(ui, "🎯 Focus", agent_data.state.focus, egui::Color32::from_rgb(0, 150, 255));
            render_cute_progress_bar(ui, "💪 Confidence", agent_data.state.confidence, egui::Color32::from_rgb(0, 255, 150));
            render_cute_progress_bar(ui, "😰 Stress", agent_data.state.stress, egui::Color32::from_rgb(255, 100, 100));
            render_cute_progress_bar(ui, "👥 Sociability", agent_data.state.sociability, egui::Color32::from_rgb(255, 150, 255));
            render_cute_progress_bar(ui, "🎨 Creativity", agent_data.state.creativity, egui::Color32::from_rgb(150, 255, 150));
            
            ui.separator();
            
            // Personality traits
            ui.label("🧠 Personality:");
            render_cute_progress_bar(ui, "🌟 Openness", agent_data.profile.personality.openness * 100.0, egui::Color32::from_rgb(255, 200, 150));
            render_cute_progress_bar(ui, "📋 Conscientiousness", agent_data.profile.personality.conscientiousness * 100.0, egui::Color32::from_rgb(150, 200, 255));
            render_cute_progress_bar(ui, "🎉 Extraversion", agent_data.profile.personality.extraversion * 100.0, egui::Color32::from_rgb(255, 150, 200));
            render_cute_progress_bar(ui, "🤝 Agreeableness", agent_data.profile.personality.agreeableness * 100.0, egui::Color32::from_rgb(200, 255, 150));
            render_cute_progress_bar(ui, "❤️ Empathy", agent_data.profile.personality.empathy * 100.0, egui::Color32::from_rgb(255, 180, 180));
            
            ui.separator();
            
            // Expertise areas
            ui.label("🎓 Expertise Areas:");
            for expertise in &agent_data.profile.expertise_areas {
                ui.label(format!("• {}", expertise));
            }
            
            ui.separator();
            
            // Communication style and autonomy
            ui.label(format!("💬 Communication: {:?}", agent_data.profile.communication_style));
            ui.label(format!("🤖 Autonomy: {:?}", agent_data.profile.autonomy_level));
            
            ui.separator();
            
            // Activity stats
            ui.label("📈 Activity Stats:");
            ui.label(format!("🔄 Interactions: {}", agent_data.state.interaction_count));
            ui.label(format!("⏱️ Last Active: {}", agent_data.state.last_activity.format("%H:%M:%S")));
            
            ui.separator();
            
            // Action buttons
            ui.horizontal(|ui| {
                if ui.button("💬 Chat").clicked() {
                    // TODO: Open chat dialog
                }
                
                if ui.button("🎯 Assign Task").clicked() {
                    // TODO: Open task assignment dialog
                }
            });
            
            ui.horizontal(|ui| {
                if ui.button("📊 View Analytics").clicked() {
                    // TODO: Open analytics view
                }
                
                if ui.button("🔗 View Network").clicked() {
                    // TODO: Focus on network view
                }
            });
        });
}

fn render_cute_progress_bar(
    ui: &mut egui::Ui,
    label: &str,
    value: f32,
    color: egui::Color32,
) {
    ui.horizontal(|ui| {
        ui.label(label);
        ui.add_space(5.0);
        
        // Create a custom progress bar with rounded corners
        let desired_size = egui::vec2(120.0, 12.0);
        let (rect, _response) = ui.allocate_exact_size(desired_size, egui::Sense::hover());
        
        // Background
        ui.painter().rect_filled(
            rect,
            egui::Rounding::same(6.0),
            egui::Color32::from_gray(40),
        );
        
        // Progress fill
        let progress_width = rect.width() * (value / 100.0);
        let progress_rect = egui::Rect::from_min_size(
            rect.min,
            egui::vec2(progress_width, rect.height()),
        );
        
        ui.painter().rect_filled(
            progress_rect,
            egui::Rounding::same(6.0),
            color,
        );
        
        // Progress text
        ui.label(format!("{:.0}%", value));
    });
}

fn render_world_stats_panel(
    ctx: &egui::Context,
    agent_query: &Query<&AgentProfile>,
) {
    egui::Window::new("🌍 World Statistics")
        .resizable(true)
        .default_width(250.0)
        .show(ctx, |ui| {
            ui.heading("System Overview");
            
            let agent_count = agent_query.iter().count();
            ui.label(format!("👥 Total Agents: {}", agent_count));
            
            ui.separator();
            
            // Agent distribution by role
            ui.label("🏢 Agent Roles:");
            let mut role_counts = std::collections::HashMap::new();
            for agent in agent_query.iter() {
                *role_counts.entry(agent.role.clone()).or_insert(0) += 1;
            }
            
            for (role, count) in role_counts {
                ui.label(format!("• {}: {}", role, count));
            }
            
            ui.separator();
            
            // Color theme distribution
            ui.label("🎨 Color Themes:");
            let mut theme_counts = std::collections::HashMap::new();
            for agent in agent_query.iter() {
                *theme_counts.entry(format!("{:?}", agent.color_theme)).or_insert(0) += 1;
            }
            
            for (theme, count) in theme_counts {
                ui.label(format!("• {}: {}", theme, count));
            }
            
            ui.separator();
            
            // System health indicators
            ui.label("💚 System Health:");
            ui.label("🟢 All systems operational");
            ui.label("🔄 Real-time updates active");
            ui.label("🔗 Network connections stable");
            
            ui.separator();
            
            // Quick actions
            ui.label("⚡ Quick Actions:");
            if ui.button("➕ Add New Agent").clicked() {
                // TODO: Open agent creation dialog
            }
            
            if ui.button("🔄 Refresh Network").clicked() {
                // TODO: Refresh network connections
            }
            
            if ui.button("📊 Generate Report").clicked() {
                // TODO: Generate system report
            }
        });
}

fn render_agent_creation_panel(
    ctx: &egui::Context,
    ui_state: &mut UIState,
) {
    egui::Window::new("➕ Create New Agent")
        .resizable(true)
        .default_width(400.0)
        .show(ctx, |ui| {
            ui.heading("🤖 Agent Creation Wizard");
            
            ui.separator();
            
            // Agent basic info
            ui.label("📝 Basic Information:");
            ui.text_edit_singleline(&mut String::from("Agent Name"));
            ui.text_edit_singleline(&mut String::from("Role"));
            ui.text_edit_multiline(&mut String::from("Description"));
            
            ui.separator();
            
            // Personality sliders
            ui.label("🧠 Personality Traits:");
            ui.add(egui::Slider::new(&mut 0.5f32, 0.0..=1.0).text("Openness"));
            ui.add(egui::Slider::new(&mut 0.5f32, 0.0..=1.0).text("Conscientiousness"));
            ui.add(egui::Slider::new(&mut 0.5f32, 0.0..=1.0).text("Extraversion"));
            ui.add(egui::Slider::new(&mut 0.5f32, 0.0..=1.0).text("Agreeableness"));
            ui.add(egui::Slider::new(&mut 0.5f32, 0.0..=1.0).text("Empathy"));
            
            ui.separator();
            
            // Action buttons
            ui.horizontal(|ui| {
                if ui.button("✨ Create Agent").clicked() {
                    // TODO: Create the agent
                    ui_state.show_creation_panel = false;
                }
                
                if ui.button("❌ Cancel").clicked() {
                    ui_state.show_creation_panel = false;
                }
            });
        });
}

/// Render quick actions toolbar
fn render_quick_actions(
    ctx: &egui::Context,
    ui_state: &mut UIState,
) {
    egui::TopBottomPanel::bottom("quick_actions")
        .resizable(false)
        .min_height(40.0)
        .show(ctx, |ui| {
            ui.with_layout(egui::Layout::left_to_right(egui::Align::Center), |ui| {
                ui.add_space(10.0);
                
                // Toggle panels
                if ui.button("📊 Stats").on_hover_text("Show world statistics").clicked() {
                    ui_state.show_world_stats = !ui_state.show_world_stats;
                }
                
                if ui.button("➕ Create").on_hover_text("Create new agent").clicked() {
                    ui_state.show_creation_panel = !ui_state.show_creation_panel;
                }
                
                if ui.button("🎮 Game Mode").on_hover_text("Switch to game mode").clicked() {
                    // TODO: Toggle game mode
                }
                
                ui.separator();
                
                // Game controls hint
                ui.label("🎯 Click agents to interact • 🖱️ Right-click to move camera • ⌨️ WASD to pan");
            });
        });
}

/// Render chat panel with agent conversations
fn render_chat_panel(
    ctx: &egui::Context,
    chat_state: &ChatState,
) {
    egui::SidePanel::right("chat_panel")
        .resizable(true)
        .default_width(350.0)
        .min_width(300.0)
        .show(ctx, |ui| {
            ui.heading("💬 Agent Chat");
            ui.separator();
            
            // Agent selection
            ui.horizontal(|ui| {
                ui.label("🎯 Selected:");
                if let Some(ref agent) = chat_state.selected_agent {
                    ui.colored_label(egui::Color32::from_rgb(100, 200, 255), agent);
                } else {
                    ui.colored_label(egui::Color32::GRAY, "None (Press 1-4 to select)");
                }
            });
            
            ui.separator();
            
            // Instructions
            ui.collapsing("📖 Instructions", |ui| {
                ui.label("• Press C to toggle chat");
                ui.label("• Press 1-4 to select agents:");
                ui.label("  1️⃣ Sarah Chen (Strategy)");
                ui.label("  2️⃣ Alex Rodriguez (Tech)");
                ui.label("  3️⃣ Maya Patel (Design)");
                ui.label("  4️⃣ Dr. Kim (Research)");
                ui.label("• Press Enter to send test message");
            });
            
            ui.separator();
            
            // Chat messages
            ui.label("💭 Conversation:");
            
            egui::ScrollArea::vertical()
                .auto_shrink([false; 2])
                .stick_to_bottom(true)
                .show(ui, |ui| {
                    for message in &chat_state.messages {
                        ui.horizontal(|ui| {
                            let color = if message.is_ai {
                                egui::Color32::from_rgb(100, 255, 150)
                            } else {
                                egui::Color32::from_rgb(150, 200, 255)
                            };
                            
                            ui.colored_label(color, format!("{}: {}", message.sender, message.content));
                        });
                        ui.add_space(5.0);
                    }
                    
                    if chat_state.messages.is_empty() {
                        ui.colored_label(egui::Color32::GRAY, "No messages yet. Select an agent and press Enter!");
                    }
                });
            
            ui.separator();
            
            // Backend status
            ui.horizontal(|ui| {
                let status_color = if chat_state.backend_connected {
                    egui::Color32::GREEN
                } else {
                    egui::Color32::RED
                };
                
                ui.colored_label(status_color, "🔗");
                ui.label(if chat_state.backend_connected {
                    "Backend Connected"
                } else {
                    "Backend Disconnected"
                });
            });
        });
}

/// Handle agent selection events
fn handle_agent_selection(
    mut ui_state: ResMut<UIState>,
    mut click_events: EventReader<AgentClickedEvent>,
    agent_query: Query<(&AgentProfile, &AgentState)>,
) {
    for event in click_events.read() {
        if let Ok((profile, state)) = agent_query.get(event.entity) {
            ui_state.selected_agent_data = Some(SelectedAgentData {
                entity: event.entity,
                profile: profile.clone(),
                state: state.clone(),
                last_updated: 0.0, // Will be updated by update_ui_state
            });
            
            ui_state.show_agent_panel = true;
            ui_state.panel_animation_time = 0.0;
            
            info!("🎮 Agent panel opened for: {}", profile.name);
        }
    }
}

/// Update UI state and refresh agent data
fn update_ui_state(
    mut ui_state: ResMut<UIState>,
    time: Res<Time>,
    selected_agent: Res<SelectedAgent>,
    agent_query: Query<(&AgentProfile, &AgentState)>,
) {
    // Refresh selected agent data periodically
    if let (Some(selected_data), Some(entity)) = (&mut ui_state.selected_agent_data, selected_agent.entity) {
        selected_data.last_updated += time.delta_seconds();
        
        // Refresh every 2 seconds
        if selected_data.last_updated >= 2.0 {
            if let Ok((profile, state)) = agent_query.get(entity) {
                selected_data.profile = profile.clone();
                selected_data.state = state.clone();
                selected_data.last_updated = 0.0;
            }
        }
    }
    
    // Close panel if agent no longer selected
    if selected_agent.entity.is_none() && ui_state.show_agent_panel {
        ui_state.show_agent_panel = false;
        ui_state.selected_agent_data = None;
    }
} 