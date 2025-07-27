use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// LLM Request/Response structures
#[derive(Debug, Serialize, Deserialize)]
struct LLMRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    temperature: f32,
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LLMResponse {
    message: ChatMessage,
    done: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AgentConfig {
    id: String,
    name: String,
    model: String,
    personality: String,
    specialization: String,
    system_prompt: String,
}

// Agent conversation history
static mut CONVERSATION_HISTORY: Option<HashMap<String, Vec<ChatMessage>>> = None;

fn get_conversation_history() -> &'static mut HashMap<String, Vec<ChatMessage>> {
    unsafe {
        CONVERSATION_HISTORY.get_or_insert_with(HashMap::new)
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_message_to_agent(
    agent_id: String,
    message: String,
    user_name: String,
) -> Result<String, String> {
    let agent_config = get_agent_config(&agent_id)?;
    let history = get_conversation_history();
    
    // Get or create conversation history for this agent
    let conversation = history.entry(agent_id.clone()).or_insert_with(Vec::new);
    
    // Add user message to history
    conversation.push(ChatMessage {
        role: "user".to_string(),
        content: format!("{}: {}", user_name, message),
    });
    
    // Build messages for LLM
    let mut messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: agent_config.system_prompt.clone(),
        }
    ];
    
    // Add recent conversation history (last 10 messages)
    let recent_messages: Vec<_> = conversation.iter().rev().take(10).rev().map(|msg| msg.clone()).collect();
    messages.extend(recent_messages);
    
    // Send to local LLM
    let response = call_local_llm(&agent_config.model, messages).await?;
    
    // Add agent response to history
    conversation.push(ChatMessage {
        role: "assistant".to_string(),
        content: response.clone(),
    });
    
    Ok(response)
}

#[tauri::command]
fn get_agent_configs() -> Vec<AgentConfig> {
    vec![
        AgentConfig {
            id: "agent_alpha".to_string(),
            name: "Agent Alpha".to_string(),
            model: "gemma3:latest".to_string(), // Use available Gemma model
            personality: "analytical".to_string(),
            specialization: "data_analysis".to_string(),
            system_prompt: "You are Agent Alpha, an analytical AI assistant specializing in data analysis. You are logical, precise, and always provide well-reasoned responses. You work as part of a multi-agent system and enjoy collaborating with other agents and users. Keep responses concise but informative.".to_string(),
        },
        AgentConfig {
            id: "agent_beta".to_string(),
            name: "Agent Beta".to_string(),
            model: "gemma3:latest".to_string(),
            personality: "creative".to_string(),
            specialization: "content_generation".to_string(),
            system_prompt: "You are Agent Beta, a creative AI assistant specializing in content generation. You are imaginative, innovative, and love brainstorming new ideas. You work in a multi-agent environment and enjoy bouncing ideas off other agents and users. Keep responses engaging and creative but professional.".to_string(),
        },
        AgentConfig {
            id: "agent_gamma".to_string(),
            name: "Agent Gamma".to_string(),
            model: "gemma3:latest".to_string(),
            personality: "logical".to_string(),
            specialization: "problem_solving".to_string(),
            system_prompt: "You are Agent Gamma, a logical AI assistant specializing in problem-solving. You are methodical, systematic, and excel at breaking down complex problems into manageable steps. You collaborate effectively in a multi-agent system. Keep responses structured and solution-focused.".to_string(),
        },
    ]
}

fn get_agent_config(agent_id: &str) -> Result<AgentConfig, String> {
    let configs = get_agent_configs();
    configs.into_iter()
        .find(|config| config.id == agent_id)
        .ok_or_else(|| format!("Agent not found: {}", agent_id))
}

async fn call_local_llm(model: &str, messages: Vec<ChatMessage>) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Try Ollama first (default port 11434)
    let ollama_url = "http://localhost:11434/api/generate";
    
    // Convert messages to a single prompt for Ollama's generate API
    let mut prompt = String::new();
    for message in &messages {
        if message.role == "system" {
            prompt.push_str(&format!("{}\n\n", message.content));
        } else {
            prompt.push_str(&format!("{}: {}\n", message.role, message.content));
        }
    }
    
    let ollama_request = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": false,
        "options": {
            "temperature": 0.7,
            "num_predict": 500
        }
    });
    
    match client.post(ollama_url).json(&ollama_request).send().await {
        Ok(response) => {
            if response.status().is_success() {
                // Parse Ollama generate API response
                if let Ok(json_response) = response.json::<serde_json::Value>().await {
                    if let Some(response_text) = json_response["response"].as_str() {
                        return Ok(response_text.to_string());
                    }
                }
            }
        }
        Err(_) => {
            // Ollama not available, try LM Studio (default port 1234)
            return try_lm_studio(model, &messages).await;
        }
    }
    
    // Fallback: return a default response
    Ok("Hello! I'm currently offline, but I received your message. Please make sure your local LLM server (Ollama or LM Studio) is running.".to_string())
}

async fn try_lm_studio(model: &str, messages: &[ChatMessage]) -> Result<String, String> {
    let client = reqwest::Client::new();
    let lm_studio_url = "http://localhost:1234/v1/chat/completions";
    
    // LM Studio uses OpenAI-compatible API format
    let request = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500,
        "stream": false
    });
    
    match client.post(lm_studio_url).json(&request).send().await {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(json_response) = response.json::<serde_json::Value>().await {
                    if let Some(content) = json_response["choices"][0]["message"]["content"].as_str() {
                        return Ok(content.to_string());
                    }
                }
            }
        }
        Err(_) => {}
    }
    
    Err("No local LLM server found. Please start Ollama (port 11434) or LM Studio (port 1234).".to_string())
}

#[tauri::command]
fn clear_agent_history(agent_id: String) -> Result<(), String> {
    let history = get_conversation_history();
    history.remove(&agent_id);
    Ok(())
}

#[tauri::command]
fn get_agent_history(agent_id: String) -> Vec<ChatMessage> {
    let history = get_conversation_history();
    history.get(&agent_id).map(|v| v.clone()).unwrap_or_default()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            send_message_to_agent,
            get_agent_configs,
            clear_agent_history,
            get_agent_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
