/*!
# Backend API Integration

Connects the Bevy frontend with the existing Python backend API
*/

use reqwest::Client;
use serde::{Deserialize, Serialize};
use shared_types::*;
use std::collections::HashMap;
use bevy::prelude::Resource;

/// Backend API client for communicating with Python backend
#[derive(Clone, Resource)]
pub struct BackendApiClient {
    client: Client,
    base_url: String,
}

impl Default for BackendApiClient {
    fn default() -> Self {
        Self::new("http://localhost:8000".to_string())
    }
}

/// Chat request to backend
#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub message: String,
    pub channel_type: String,
    pub channel_id: Option<String>,
    pub direct_member: Option<String>,
    pub interaction_mode: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

/// Chat response from backend
#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub success: bool,
    pub response: Option<ChatResponseData>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponseData {
    pub response: String,
    pub agent_name: Option<String>,
    pub agent_role: Option<String>,
    pub timestamp: Option<String>,
    pub agent_state: Option<AgentStateResponse>,
}

#[derive(Debug, Deserialize)]
pub struct AgentStateResponse {
    pub mood: String,
    pub energy: f32,
    pub confidence: f32,
}

impl BackendApiClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    /// Send chat message to backend and get AI response
    pub async fn send_chat_message(&self, 
        message: String, 
        agent_name: Option<String>
    ) -> Result<ChatResponse> {
        let request = ChatRequest {
            message,
            channel_type: if agent_name.is_some() { "dm".to_string() } else { "general".to_string() },
            channel_id: agent_name.as_ref().map(|name| format!("dm-{}", name.to_lowercase().replace(" ", "-"))),
            direct_member: agent_name,
            interaction_mode: "casual_chat".to_string(),
            context: None,
        };

        let response = self.client
            .post(&format!("{}/api/v1/council/query", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| IntelligenceError::Network(e))?;

        if response.status().is_success() {
            let chat_response: ChatResponse = response.json().await
                .map_err(|e| IntelligenceError::Network(e))?;
            Ok(chat_response)
        } else {
            Err(IntelligenceError::Network(reqwest::Error::from(response.error_for_status().unwrap_err())))
        }
    }

    /// Check if backend is available
    pub async fn health_check(&self) -> Result<bool> {
        let response = self.client
            .get(&format!("{}/api/v1/status", self.base_url))
            .send()
            .await
            .map_err(|e| IntelligenceError::Network(e))?;

        Ok(response.status().is_success())
    }

    /// Get available agents from backend
    pub async fn get_agents(&self) -> Result<Vec<AgentProfile>> {
        let response = self.client
            .get(&format!("{}/api/v1/council/members", self.base_url))
            .send()
            .await
            .map_err(|e| IntelligenceError::Network(e))?;

        if response.status().is_success() {
            // For now, return our hardcoded agents since backend structure may vary
            Ok(vec![])
        } else {
            Err(IntelligenceError::Network(reqwest::Error::from(response.error_for_status().unwrap_err())))
        }
    }

    /// Sync agent data with backend
    pub async fn sync_agent_data(&self, _agents: Vec<AgentProfile>) -> Result<()> {
        // TODO: Implement agent sync if needed
        Ok(())
    }

    /// Send agent interaction to backend
    pub async fn send_agent_interaction(&self, 
        agent_id: AgentId, 
        message: String,
        context: Option<HashMap<String, serde_json::Value>>
    ) -> Result<ChatResponse> {
        let request = ChatRequest {
            message,
            channel_type: "dm".to_string(),
            channel_id: Some(format!("agent-{}", agent_id)),
            direct_member: None,
            interaction_mode: "agent_interaction".to_string(),
            context,
        };

        let response = self.client
            .post(&format!("{}/api/enhanced/query", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| IntelligenceError::Network(e))?;

        if response.status().is_success() {
            let chat_response: ChatResponse = response.json().await
                .map_err(|e| IntelligenceError::Network(e))?;
            Ok(chat_response)
        } else {
            Err(IntelligenceError::Network(reqwest::Error::from(response.error_for_status().unwrap_err())))
        }
    }
} 