use bevy::prelude::*;
use shared_types::*;

/// Visualize connections between agents as a proper directed graph
pub fn visualize_agent_connections(
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
pub fn create_directed_graph_edge(
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

pub fn find_agent_positions_for_connection(
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
    
    match (from_pos, to_pos) {
        (Some(from), Some(to)) => Some((from, to)),
        _ => None,
    }
} 