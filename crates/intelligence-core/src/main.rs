/*!
# Intelligence Empire - Bevy Edition

A beautiful game-like interface for managing autonomous AI agents.
Think The Sims meets AI - cute, intuitive, and engaging!
*/

use bevy::prelude::*;
use bevy::window::{PresentMode, WindowResized, WindowMode};
use bevy_egui::{EguiPlugin, EguiContexts};
use shared_types::*;
use game::*;
use ui::*;
use backend_api::*;
use uuid::Uuid;
use log::info;
use std::collections::HashMap;

// Local modules
mod game;
mod ui;
mod systems;
mod backend_api;

use game::GamePlugin;
use ui::UIPlugin;
use backend_api::BackendApiClient;

// Custom UI Scale resource for responsive design (avoiding conflict with Bevy's UiScale)
#[derive(Resource)]
pub struct GameUIScale {
    pub scale: f32,
    pub base_font_size: f32,
    pub window_size: Vec2,
    pub is_fullscreen: bool,
}

impl Default for GameUIScale {
    fn default() -> Self {
        Self {
            scale: 1.0,
            base_font_size: 16.0,
            window_size: Vec2::new(1200.0, 800.0),
            is_fullscreen: false,
        }
    }
}

/// Chat state for managing conversations with agents
#[derive(Resource, Default)]
pub struct ChatState {
    pub messages: Vec<ChatMessage>,
    pub current_input: String,
    pub selected_agent: Option<String>,
    pub is_chat_open: bool,
    pub backend_connected: bool,
}

#[derive(Clone, Debug)]
pub struct ChatMessage {
    pub sender: String,
    pub content: String,
    pub timestamp: std::time::Instant,
    pub is_ai: bool,
}

fn main() {
    // Initialize logger
    env_logger::init();
    
    info!("🚀 Starting Intelligence Empire - Bevy Edition");
    
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Intelligence Empire - AI Agent Management".into(),
                present_mode: PresentMode::AutoVsync,
                fit_canvas_to_parent: true,
                resizable: true,
                ..default()
            }),
            ..default()
        }))
        
        // Add Egui plugin for UI
        .add_plugins(EguiPlugin)
        
        // Add our custom plugins
        .add_plugins(GamePlugin)
        .add_plugins(UIPlugin)
        
        // Add resources
        .init_resource::<GameUIScale>()
        .insert_resource(BackendApiClient::default())
        .insert_resource(ChatState::default())
        
        // Add startup systems
        .add_systems(Startup, (
            setup_camera,
            setup_world,
            spawn_initial_agents,
            setup_ui_scale,
        ))
        
        // Add update systems  
        .add_systems(Update, (
            handle_window_resize.run_if(on_event::<WindowResized>()),
            update_ui_scale,
            handle_fullscreen_toggle,
            handle_input,
            update_camera,
            debug_info,
            sync_backend_data.run_if(run_once_per_second),
            handle_chat_input,
        ))
        
        .run();
}

/// Setup UI scale based on window size
fn setup_ui_scale(
    mut ui_scale: ResMut<GameUIScale>,
    window_query: Query<&Window>,
) {
    if let Ok(window) = window_query.get_single() {
        ui_scale.window_size = Vec2::new(window.width(), window.height());
        // Calculate scale based on window size
        let base_width = 1400.0;
        ui_scale.scale = (window.width() / base_width).max(0.5).min(2.0);
        ui_scale.is_fullscreen = matches!(window.mode, WindowMode::Fullscreen);
        info!("📏 UI Scale initialized: {}x ({})", ui_scale.scale, 
              if ui_scale.is_fullscreen { "Fullscreen" } else { "Windowed" });
    }
}

/// Handle window resize events to prevent crashes
fn handle_window_resize(
    mut resize_events: EventReader<WindowResized>,
    mut ui_scale: ResMut<GameUIScale>,
) {
    for event in resize_events.read() {
        // Validate window dimensions to prevent division by zero or invalid sizes
        if event.width <= 0.0 || event.height <= 0.0 {
            warn!("⚠️ Invalid window dimensions: {}x{}", event.width, event.height);
            continue;
        }
        
        info!("🔄 Window resized: {}x{}", event.width, event.height);
        
        // Update UI scale safely
        ui_scale.window_size = Vec2::new(event.width, event.height);
        let base_width = 1400.0;
        ui_scale.scale = (event.width / base_width).max(0.5).min(2.0);
        
        info!("📏 UI Scale updated: {}x", ui_scale.scale);
    }
}

/// Handle fullscreen toggle with F11 key
fn handle_fullscreen_toggle(
    keys: Res<Input<KeyCode>>,
    mut ui_scale: ResMut<GameUIScale>,
    mut window_query: Query<&mut Window>,
) {
    if keys.just_pressed(KeyCode::F11) {
        if let Ok(mut window) = window_query.get_single_mut() {
            let new_mode = match window.mode {
                WindowMode::Windowed => {
                    ui_scale.is_fullscreen = true;
                    info!("🖥️ Switching to fullscreen");
                    WindowMode::BorderlessFullscreen
                },
                _ => {
                    ui_scale.is_fullscreen = false;
                    info!("🪟 Switching to windowed");
                    WindowMode::Windowed
                }
            };
            window.mode = new_mode;
        }
    }
}

/// Update UI scale based on user input (1.25x, 1.5x scaling)
fn update_ui_scale(
    keys: Res<Input<KeyCode>>,
    mut ui_scale: ResMut<GameUIScale>,
    chat_state: Res<ChatState>,
) {
    // Don't handle UI scaling hotkeys when chat is open (number keys are for agent selection)
    if chat_state.is_chat_open {
        return;
    }
    
    if keys.just_pressed(KeyCode::Equals) || keys.just_pressed(KeyCode::Plus) {
        ui_scale.scale = (ui_scale.scale + 0.25).min(2.0);
        info!("🔍 UI Scale increased to: {}x", ui_scale.scale);
    }
    
    if keys.just_pressed(KeyCode::Minus) {
        ui_scale.scale = (ui_scale.scale - 0.25).max(0.5);
        info!("🔍 UI Scale decreased to: {}x", ui_scale.scale);
    }
    
    // Quick scale presets (only when chat is closed)
    if keys.just_pressed(KeyCode::Key0) {
        ui_scale.scale = 1.0;
        info!("🔍 UI Scale reset to: 1.0x");
    }
    if keys.just_pressed(KeyCode::Key9) && keys.pressed(KeyCode::ShiftLeft) {
        ui_scale.scale = 1.25;
        info!("🔍 UI Scale set to: 1.25x");
    }
    if keys.just_pressed(KeyCode::Key8) && keys.pressed(KeyCode::ShiftLeft) {
        ui_scale.scale = 1.5;
        info!("🔍 UI Scale set to: 1.5x");
    }
}

/// Setup the main camera for our 2D agent world
fn setup_camera(mut commands: Commands) {
    info!("📷 Setting up game camera");
    
    commands.spawn(Camera2dBundle {
        transform: Transform::from_xyz(0.0, 0.0, 1000.0),
        ..default()
    });
}

/// Initialize the game world
fn setup_world(mut commands: Commands) {
    info!("🌍 Initializing agent world");
    
    // TODO: Load world configuration
    // TODO: Setup background
    // TODO: Initialize physics if needed
}

/// Spawn some initial cute agents with beautiful game-like visuals
fn spawn_initial_agents(
    mut commands: Commands,
    _asset_server: Res<AssetServer>,
) {
    info!("🤖 Spawning initial agents with beautiful visuals");
    
    // Create Sarah Chen - Product Strategy Agent
    let sarah_profile = AgentProfile {
        id: Uuid::new_v4(),
        name: "Sarah Chen".to_string(),
        role: "Product Strategy Advisor".to_string(),
        description: "Specializes in market analysis, user research, and strategic planning".to_string(),
        avatar_emoji: "👩‍💼".to_string(),
        color_theme: ColorTheme::Ocean,
        communication_style: CommunicationStyle::Formal,
        expertise_areas: vec!["Strategy".to_string(), "Analytics".to_string(), "Leadership".to_string()],
        personality: PersonalityTraits {
            openness: 0.85,
            conscientiousness: 0.90,
            extraversion: 0.75,
            agreeableness: 0.80,
            neuroticism: 0.20,
            curiosity: 0.85,
            collaboration: 0.80,
            innovation: 0.70,
            empathy: 0.85,
        },
        autonomy_level: AutonomyLevel::Independent,
        created_at: chrono::Utc::now(),
    };

    let sarah_state = AgentState {
        energy: 85.0,
        focus: 90.0,
        confidence: 88.0,
        stress: 25.0,
        sociability: 75.0,
        creativity: 70.0,
        mood: Mood::Focused,
        current_task: Some("Analyzing market trends".to_string()),
        is_active: true,
        interaction_count: 0,
        last_activity: chrono::Utc::now(),
    };

    let sarah_transform = AgentTransform {
        position: Vec2::new(-200.0, 100.0),
        target_position: Vec2::new(-200.0, 100.0),
        scale: 1.0,
        rotation: 0.0,
        is_moving: false,
        move_speed: 50.0,
    };

    // Create beautiful circular agent sprite with personality-based styling
    let _sarah_entity = commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: create_beautiful_agent_color(&sarah_profile, &sarah_state),
                custom_size: Some(Vec2::new(80.0, 80.0)), // Larger, more prominent
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(
                sarah_transform.position.x,
                sarah_transform.position.y,
                1.0,
            )),
            ..default()
        },
        sarah_profile.clone(),
        sarah_state,
        sarah_transform,
        CuteAgentVisual {
            emoji: "👩‍💼".to_string(),
            base_size: 80.0,
            glow_color: Color::rgb(0.3, 0.8, 1.0),
            pulse_speed: 2.0,
            pulse_phase: 0.0,
            bounce_offset: 0.0,
            sparkle_timer: 0.0,
            personality_aura: Color::rgba(0.2, 0.7, 1.0, 0.3),
            interaction_glow: 0.0,
            thought_bubble_offset: Vec2::new(0.0, 100.0),
        },
        PulsingAgent {
            pulse_timer: 0.0,
            pulse_speed: 1.5,
            base_scale: 1.0,
        },
    )).id();

    // Add beautiful emoji text with enhanced styling
    commands.entity(_sarah_entity).with_children(|parent| {
        parent.spawn(Text2dBundle {
            text: Text::from_section(
                "👩‍💼",
                TextStyle {
                    font_size: 56.0,
                    color: Color::WHITE,
                    ..default()
                },
            ),
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, 2.0)),
            ..default()
        });
        
        // Add personality aura effect
        parent.spawn(SpriteBundle {
            sprite: Sprite {
                color: Color::rgba(0.2, 0.7, 1.0, 0.2),
                custom_size: Some(Vec2::new(120.0, 120.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, -1.0)),
            ..default()
        });
    });

    info!("✨ Created agent: Sarah Chen ({})", sarah_profile.id);

    // Create Alex Rodriguez - Technical Innovation Agent with different styling
    let alex_profile = AgentProfile {
        id: Uuid::new_v4(),
        name: "Alex Rodriguez".to_string(),
        role: "Technical Innovation Lead".to_string(),
        description: "Expert in AI integration, system architecture, and emerging technologies".to_string(),
        avatar_emoji: "👨‍💻".to_string(),
        color_theme: ColorTheme::Forest,
        communication_style: CommunicationStyle::Technical,
        expertise_areas: vec!["AI".to_string(), "Architecture".to_string(), "Innovation".to_string()],
        personality: PersonalityTraits {
            openness: 0.95,
            conscientiousness: 0.85,
            extraversion: 0.60,
            agreeableness: 0.75,
            neuroticism: 0.25,
            curiosity: 0.95,
            collaboration: 0.70,
            innovation: 0.95,
            empathy: 0.65,
        },
        autonomy_level: AutonomyLevel::Autonomous,
        created_at: chrono::Utc::now(),
    };

    let alex_state = AgentState {
        energy: 90.0,
        focus: 85.0,
        confidence: 92.0,
        stress: 20.0,
        sociability: 60.0,
        creativity: 95.0,
        mood: Mood::Excited,
        current_task: Some("Developing neural architecture".to_string()),
        is_active: true,
        interaction_count: 0,
        last_activity: chrono::Utc::now(),
    };

    let alex_transform = AgentTransform {
        position: Vec2::new(200.0, 100.0),
        target_position: Vec2::new(200.0, 100.0),
        scale: 1.0,
        rotation: 0.0,
        is_moving: false,
        move_speed: 75.0,
    };

    let _alex_entity = commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: create_beautiful_agent_color(&alex_profile, &alex_state),
                custom_size: Some(Vec2::new(80.0, 80.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(
                alex_transform.position.x,
                alex_transform.position.y,
                1.0,
            )),
            ..default()
        },
        alex_profile.clone(),
        alex_state,
        alex_transform,
        CuteAgentVisual {
            emoji: "👨‍💻".to_string(),
            base_size: 80.0,
            glow_color: Color::rgb(0.3, 1.0, 0.4),
            pulse_speed: 2.5,
            pulse_phase: 1.0,
            bounce_offset: 0.0,
            sparkle_timer: 0.0,
            personality_aura: Color::rgba(0.2, 0.8, 0.3, 0.3),
            interaction_glow: 0.0,
            thought_bubble_offset: Vec2::new(0.0, 100.0),
        },
        PulsingAgent {
            pulse_timer: 0.0,
            pulse_speed: 2.0,
            base_scale: 1.0,
        },
    )).id();

    commands.entity(_alex_entity).with_children(|parent| {
        parent.spawn(Text2dBundle {
            text: Text::from_section(
                "👨‍💻",
                TextStyle {
                    font_size: 56.0,
                    color: Color::WHITE,
                    ..default()
                },
            ),
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, 2.0)),
            ..default()
        });
        
        // Tech-themed aura
        parent.spawn(SpriteBundle {
            sprite: Sprite {
                color: Color::rgba(0.2, 0.8, 0.3, 0.25),
                custom_size: Some(Vec2::new(120.0, 120.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, -1.0)),
            ..default()
        });
    });

    info!("✨ Created agent: Alex Rodriguez ({})", alex_profile.id);

    // Create Maya Patel - Creative Design Agent
    let maya_profile = AgentProfile {
        id: Uuid::new_v4(),
        name: "Maya Patel".to_string(),
        role: "Creative Design Director".to_string(),
        description: "Specializes in user experience, visual design, and creative problem-solving".to_string(),
        avatar_emoji: "👩‍🎨".to_string(),
        color_theme: ColorTheme::Sunset,
        communication_style: CommunicationStyle::Creative,
        expertise_areas: vec!["Design".to_string(), "UX".to_string(), "Creativity".to_string()],
        personality: PersonalityTraits {
            openness: 0.98,
            conscientiousness: 0.80,
            extraversion: 0.85,
            agreeableness: 0.90,
            neuroticism: 0.15,
            curiosity: 0.90,
            collaboration: 0.90,
            innovation: 0.90,
            empathy: 0.90,
        },
        autonomy_level: AutonomyLevel::Collaborative,
        created_at: chrono::Utc::now(),
    };

    let maya_state = AgentState {
        energy: 80.0,
        focus: 75.0,
        confidence: 85.0,
        stress: 10.0,
        sociability: 90.0,
        creativity: 98.0,
        mood: Mood::Creative,
        current_task: Some("Designing intuitive interfaces".to_string()),
        is_active: true,
        interaction_count: 0,
        last_activity: chrono::Utc::now(),
    };

    let maya_transform = AgentTransform {
        position: Vec2::new(-200.0, -100.0),
        target_position: Vec2::new(-200.0, -100.0),
        scale: 1.0,
        rotation: 0.0,
        is_moving: false,
        move_speed: 60.0,
    };

    let _maya_entity = commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: create_beautiful_agent_color(&maya_profile, &maya_state),
                custom_size: Some(Vec2::new(80.0, 80.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(
                maya_transform.position.x,
                maya_transform.position.y,
                1.0,
            )),
            ..default()
        },
        maya_profile.clone(),
        maya_state,
        maya_transform,
        CuteAgentVisual {
            emoji: "👩‍🎨".to_string(),
            base_size: 80.0,
            glow_color: Color::rgb(1.0, 0.7, 0.3),
            pulse_speed: 1.8,
            pulse_phase: 2.0,
            bounce_offset: 0.0,
            sparkle_timer: 0.0,
            personality_aura: Color::rgba(1.0, 0.6, 0.2, 0.3),
            interaction_glow: 0.0,
            thought_bubble_offset: Vec2::new(0.0, 100.0),
        },
        PulsingAgent {
            pulse_timer: 0.0,
            pulse_speed: 1.8,
            base_scale: 1.0,
        },
    )).id();

    commands.entity(_maya_entity).with_children(|parent| {
        parent.spawn(Text2dBundle {
            text: Text::from_section(
                "👩‍🎨",
                TextStyle {
                    font_size: 56.0,
                    color: Color::WHITE,
                    ..default()
                },
            ),
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, 2.0)),
            ..default()
        });
        
        // Creative sunset aura
        parent.spawn(SpriteBundle {
            sprite: Sprite {
                color: Color::rgba(1.0, 0.6, 0.2, 0.2),
                custom_size: Some(Vec2::new(120.0, 120.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, -1.0)),
            ..default()
        });
    });

    info!("✨ Created agent: Maya Patel ({})", maya_profile.id);

    // Create Dr. Kim - Research & Analytics Agent
    let kim_profile = AgentProfile {
        id: Uuid::new_v4(),
        name: "Dr. Kim".to_string(),
        role: "Research & Analytics Lead".to_string(),
        description: "Expert in data science, research methodology, and analytical insights".to_string(),
        avatar_emoji: "👨‍🔬".to_string(),
        color_theme: ColorTheme::Lavender,
        communication_style: CommunicationStyle::Analytical,
        expertise_areas: vec!["Research".to_string(), "Analytics".to_string(), "Science".to_string()],
        personality: PersonalityTraits {
            openness: 0.90,
            conscientiousness: 0.95,
            extraversion: 0.50,
            agreeableness: 0.70,
            neuroticism: 0.30,
            curiosity: 0.98,
            collaboration: 0.60,
            innovation: 0.80,
            empathy: 0.70,
        },
        autonomy_level: AutonomyLevel::Independent,
        created_at: chrono::Utc::now(),
    };

    let kim_state = AgentState {
        energy: 75.0,
        focus: 95.0,
        confidence: 90.0,
        stress: 40.0,
        sociability: 50.0,
        creativity: 75.0,
        mood: Mood::Contemplative,
        current_task: Some("Analyzing complex datasets".to_string()),
        is_active: true,
        interaction_count: 0,
        last_activity: chrono::Utc::now(),
    };

    let kim_transform = AgentTransform {
        position: Vec2::new(200.0, -100.0),
        target_position: Vec2::new(200.0, -100.0),
        scale: 1.0,
        rotation: 0.0,
        is_moving: false,
        move_speed: 45.0,
    };

    let _kim_entity = commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: create_beautiful_agent_color(&kim_profile, &kim_state),
                custom_size: Some(Vec2::new(80.0, 80.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(
                kim_transform.position.x,
                kim_transform.position.y,
                1.0,
            )),
            ..default()
        },
        kim_profile.clone(),
        kim_state,
        kim_transform,
        CuteAgentVisual {
            emoji: "👨‍🔬".to_string(),
            base_size: 80.0,
            glow_color: Color::rgb(0.8, 0.6, 1.0),
            pulse_speed: 1.2,
            pulse_phase: 3.0,
            bounce_offset: 0.0,
            sparkle_timer: 0.0,
            personality_aura: Color::rgba(0.7, 0.5, 1.0, 0.3),
            interaction_glow: 0.0,
            thought_bubble_offset: Vec2::new(0.0, 100.0),
        },
        PulsingAgent {
            pulse_timer: 0.0,
            pulse_speed: 1.2,
            base_scale: 1.0,
        },
    )).id();

    commands.entity(_kim_entity).with_children(|parent| {
        parent.spawn(Text2dBundle {
            text: Text::from_section(
                "👨‍🔬",
                TextStyle {
                    font_size: 56.0,
                    color: Color::WHITE,
                    ..default()
                },
            ),
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, 2.0)),
            ..default()
        });
        
        // Research-themed aura  
        parent.spawn(SpriteBundle {
            sprite: Sprite {
                color: Color::rgba(0.7, 0.5, 1.0, 0.25),
                custom_size: Some(Vec2::new(120.0, 120.0)),
                ..default()
            },
            transform: Transform::from_translation(Vec3::new(0.0, 0.0, -1.0)),
            ..default()
        });
    });

    info!("✨ Created agent: Dr. Kim ({})", kim_profile.id);

    // Create agent connections to enable network visualization
    info!("🔗 Creating agent network connections...");
    
    // Store agent IDs for connection creation
    let sarah_id = sarah_profile.id;
    let alex_id = alex_profile.id;
    let maya_id = maya_profile.id;
    let kim_id = kim_profile.id;
    
    // Create various types of connections between agents
    
    // Sarah ↔ Alex: Strategic-Technical collaboration
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: sarah_id,
        to_agent: alex_id,
        connection_type: ConnectionType::Collaboration,
        strength: 0.8,
        created_at: chrono::Utc::now(),
    });
    
    // Alex ↔ Maya: Tech-Design collaboration
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: alex_id,
        to_agent: maya_id,
        connection_type: ConnectionType::Professional,
        strength: 0.7,
        created_at: chrono::Utc::now(),
    });
    
    // Maya ↔ Sarah: Design-Strategy consultation
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: maya_id,
        to_agent: sarah_id,
        connection_type: ConnectionType::Consultation,
        strength: 0.6,
        created_at: chrono::Utc::now(),
    });
    
    // Kim ↔ Sarah: Research-Strategy data sharing
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: kim_id,
        to_agent: sarah_id,
        connection_type: ConnectionType::DataSharing,
        strength: 0.9,
        created_at: chrono::Utc::now(),
    });
    
    // Kim ↔ Alex: Research-Tech learning
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: kim_id,
        to_agent: alex_id,
        connection_type: ConnectionType::Learning,
        strength: 0.5,
        created_at: chrono::Utc::now(),
    });
    
    // Maya ↔ Kim: Creative-Research friendship
    commands.spawn(AgentConnection {
        id: Uuid::new_v4(),
        from_agent: maya_id,
        to_agent: kim_id,
        connection_type: ConnectionType::Friendship,
        strength: 0.4,
        created_at: chrono::Utc::now(),
    });

    info!("🎯 Agent network established with 6 connections!");
    info!("🚀 All agents and connections created successfully!");
}

/// Create beautiful agent colors based on personality and state
fn create_beautiful_agent_color(profile: &AgentProfile, state: &AgentState) -> Color {
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
    
    // Apply mood-based saturation and brightness
    let mood_factor = match state.mood {
        Mood::Happy | Mood::Excited => 1.2,
        Mood::Creative | Mood::Innovative => 1.1,
        Mood::Focused | Mood::Contemplative => 0.9,
        Mood::Analytical => 0.9,
        Mood::Tired | Mood::Stressed => 0.7,
        Mood::Calm => 0.95,
        _ => 1.0,
    };
    
    // Apply energy-based alpha
    let energy_alpha = (state.energy / 100.0 * 0.3 + 0.7).min(1.0);
    
    Color::rgba(
        (base_color.r() * mood_factor).min(1.0),
        (base_color.g() * mood_factor).min(1.0),
        (base_color.b() * mood_factor).min(1.0),
        energy_alpha
    )
}

/// Handle user input for camera and interactions
fn handle_input(
    keys: Res<Input<KeyCode>>,
    mouse_buttons: Res<Input<MouseButton>>,
    mut camera_query: Query<&mut Transform, With<Camera>>,
    window_query: Query<&Window>,
) {
    let mut camera_transform = camera_query.single_mut();
    
    // Camera movement with WASD
    let movement_speed = 300.0;
    
    if keys.pressed(KeyCode::W) || keys.pressed(KeyCode::Up) {
        camera_transform.translation.y += movement_speed * 0.016; // ~60 FPS
    }
    if keys.pressed(KeyCode::S) || keys.pressed(KeyCode::Down) {
        camera_transform.translation.y -= movement_speed * 0.016;
    }
    if keys.pressed(KeyCode::A) || keys.pressed(KeyCode::Left) {
        camera_transform.translation.x -= movement_speed * 0.016;
    }
    if keys.pressed(KeyCode::D) || keys.pressed(KeyCode::Right) {
        camera_transform.translation.x += movement_speed * 0.016;
    }
    
    // Zoom with Q/E
    if keys.pressed(KeyCode::Q) {
        let scale = camera_transform.scale;
        camera_transform.scale = (scale * 1.02).min(Vec3::splat(3.0));
    }
    if keys.pressed(KeyCode::E) {
        let scale = camera_transform.scale;
        camera_transform.scale = (scale * 0.98).max(Vec3::splat(0.3));
    }
}

/// Update camera smooth following (if needed)
fn update_camera(
    // Add camera following logic here if needed
) {
    // TODO: Implement smooth camera following for selected agents
}

/// Display debug information
fn debug_info(
    agent_query: Query<(&AgentProfile, &AgentState)>,
    connection_query: Query<&AgentConnection>,
) {
    // Debug info every 5 seconds
    static mut LAST_DEBUG: f64 = 0.0;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();
    
    unsafe {
        if now - LAST_DEBUG > 5.0 {
            let agent_count = agent_query.iter().count();
            let connection_count = connection_query.iter().count();
            
            info!("🤖 Active agents: {}, Connections: {}", agent_count, connection_count);
            LAST_DEBUG = now;
        }
    }
}

/// Sync data with backend API periodically
fn sync_backend_data(
    mut backend_client: ResMut<BackendApiClient>,
    time: Res<Time>,
) {
    // Periodic sync with backend
    // This is a placeholder for future backend synchronization
}

/// Handle chat input with agents
fn handle_chat_input(
    keys: Res<Input<KeyCode>>,
    mut chat_state: ResMut<ChatState>,
    backend_client: Res<BackendApiClient>,
    agent_query: Query<&AgentProfile>,
) {
    // Toggle chat with C key
    if keys.just_pressed(KeyCode::C) {
        chat_state.is_chat_open = !chat_state.is_chat_open;
        info!("🗨️ Chat {}", if chat_state.is_chat_open { "opened" } else { "closed" });
    }
    
    // Quick agent selection shortcuts
    if chat_state.is_chat_open {
        if keys.just_pressed(KeyCode::Key1) {
            chat_state.selected_agent = Some("Sarah Chen".to_string());
            info!("💼 Selected agent: Sarah Chen");
        } else if keys.just_pressed(KeyCode::Key2) {
            chat_state.selected_agent = Some("Alex Rodriguez".to_string());
            info!("💻 Selected agent: Alex Rodriguez");
        } else if keys.just_pressed(KeyCode::Key3) {
            chat_state.selected_agent = Some("Maya Patel".to_string());
            info!("🎨 Selected agent: Maya Patel");
        } else if keys.just_pressed(KeyCode::Key4) {
            chat_state.selected_agent = Some("Dr. Kim".to_string());
            info!("🔬 Selected agent: Dr. Kim");
        }
        
        // Send test message with Enter key
        if keys.just_pressed(KeyCode::Return) && chat_state.selected_agent.is_some() {
            let test_messages = vec![
                "Hello! How are you doing today?",
                "What are you working on right now?",
                "Can you help me with a problem?",
                "What's your expertise area?",
                "Tell me about yourself",
            ];
            
            let message = test_messages[fastrand::usize(0..test_messages.len())].to_string();
            let agent_name = chat_state.selected_agent.clone().unwrap();
            
            // Add user message
            chat_state.messages.push(ChatMessage {
                sender: "You".to_string(),
                content: message.clone(),
                timestamp: std::time::Instant::now(),
                is_ai: false,
            });
            
            info!("💬 Sent to {}: {}", agent_name, message);
            
            // TODO: Actually send to backend and get response
            // For now, add a placeholder AI response
            chat_state.messages.push(ChatMessage {
                sender: agent_name.clone(),
                content: format!("Hello! I'm {}, thanks for reaching out. I'd be happy to help you with anything related to my expertise!", agent_name),
                timestamp: std::time::Instant::now(),
                is_ai: true,
            });
        }
    }
}

/// Run condition for periodic systems (once per second)
fn run_once_per_second(time: Res<Time>) -> bool {
    time.elapsed_seconds() as u32 % 1 == 0
} 