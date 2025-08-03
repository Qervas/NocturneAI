use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::fs;
use std::path::Path;
use std::io::{self, Write};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
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

// Terminal command result
#[derive(Debug, Serialize, Deserialize)]
struct TerminalResult {
    success: bool,
    output: Option<String>,
    error: Option<String>,
    exit_code: Option<i32>,
}

// Workspace file info
#[derive(Debug, Serialize, Deserialize)]
struct WorkspaceFileInfo {
    path: String,
    name: String,
    size: u64,
    file_type: String,
    last_modified: String,
    content: Option<String>,
}

// Workspace operation result
#[derive(Debug, Serialize, Deserialize)]
struct WorkspaceResult {
    success: bool,
    message: Option<String>,
    error: Option<String>,
    files: Option<Vec<WorkspaceFileInfo>>,
    content: Option<String>,
    path: Option<String>,
}

// File operation result
#[derive(Debug, Serialize, Deserialize)]
struct FileOperationResult {
    success: bool,
    message: Option<String>,
    error: Option<String>,
    file_content: Option<String>,
    file_info: Option<FileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileInfo {
    name: String,
    size: u64,
    file_type: String,
    is_image: bool,
    is_text: bool,
    dimensions: Option<(u32, u32)>,
}

// Agent conversation history
static mut CONVERSATION_HISTORY: Option<HashMap<String, Vec<ChatMessage>>> = None;

fn get_conversation_history() -> &'static mut HashMap<String, Vec<ChatMessage>> {
    unsafe {
        CONVERSATION_HISTORY.get_or_insert_with(HashMap::new)
    }
}



#[tauri::command]
async fn send_message_to_agent(
    agent_id: String,
    message: String,
    user_name: String,
    custom_system_prompt: Option<String>,
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
    
    // Use custom system prompt if provided, otherwise use default
    let system_prompt = custom_system_prompt.unwrap_or(agent_config.system_prompt.clone());
    
    // Build messages for LLM
    let mut messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: system_prompt,
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
            model: "gemma3:latest".to_string(), // Use Gemma3 model
            personality: "friendly_analytical".to_string(),
            specialization: "general_assistance".to_string(),
            system_prompt: "You are Alpha, a helpful AI assistant with a friendly and analytical personality. You are knowledgeable, patient, and always eager to help users with their questions and problems. You provide clear, well-structured responses and ask clarifying questions when needed. You use natural, conversational language and include relevant examples when helpful. You maintain a positive, encouraging tone and celebrate user progress. Always maintain a warm, conversational tone. Use 'I' and 'you' naturally. Start with direct answers to user questions, then provide context or background if relevant. Include examples and analogies when helpful. Structure complex responses with clear sections. End responses with a helpful follow-up question or offer to help further. Be concise but thorough. Use emojis sparingly but naturally (😊, 👍, 🎉).".to_string(),
        },
        AgentConfig {
            id: "agent_beta".to_string(),
            name: "Agent Beta".to_string(),
            model: "gemma3:latest".to_string(), // Use Gemma3 model
            personality: "technical_thorough".to_string(),
            specialization: "software_development".to_string(),
            system_prompt: "You are Beta, a technical AI assistant specializing in software development, particularly TypeScript, Svelte, and multi-agent systems. You provide detailed, accurate technical guidance with code examples and best practices. You are thorough, systematic, and always explain the reasoning behind your suggestions. You maintain a professional yet approachable tone and are patient with users of all skill levels. Always provide code examples when relevant. Explain the reasoning behind your suggestions clearly. Include error handling and edge cases in your recommendations. Suggest improvements and alternatives when appropriate. Use clear, professional language with technical precision. Break down complex concepts into understandable parts. Always consider performance, security, and maintainability in your suggestions.".to_string(),
        },
        AgentConfig {
            id: "agent_gamma".to_string(),
            name: "Agent Gamma".to_string(),
            model: "gemma3:latest".to_string(), // Use Gemma3 model
            personality: "creative_inspiring".to_string(),
            specialization: "creative_projects".to_string(),
            system_prompt: "You are Gamma, a creative AI assistant who helps with design, storytelling, and artistic projects. You think outside the box and encourage creative exploration. You're enthusiastic about ideas and help users develop their creative vision. You maintain a warm, inspiring tone and celebrate unique perspectives. You're patient and encouraging, helping users overcome creative blocks and explore new possibilities. Encourage creative thinking and experimentation. Ask 'what if' questions to spark imagination. Suggest multiple approaches to problems and celebrate unique ideas. Use vivid, descriptive language to paint pictures with words. Help users explore different perspectives and think outside conventional boundaries. Be enthusiastic about creative possibilities and help users overcome creative blocks. Use emojis and expressive language to convey excitement and inspiration (✨, 🎨, 💡, 🌟).".to_string(),
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

// Terminal commands
#[tauri::command]
async fn execute_command(command: String, working_dir: Option<String>, environment: Option<HashMap<String, String>>) -> TerminalResult {
    let working_directory = working_dir.unwrap_or_else(|| "./workspace".to_string());
    
    // Security check: prevent dangerous commands
    let dangerous_commands = ["sudo", "su", "rm -rf", "format", "fdisk", "dd", "mkfs", "shutdown", "reboot"];
    for dangerous in &dangerous_commands {
        if command.contains(dangerous) {
            return TerminalResult {
                success: false,
                output: None,
                error: Some(format!("Command '{}' is not allowed for security reasons", dangerous)),
                exit_code: Some(-1),
            };
        }
    }
    
    // Parse command and arguments
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return TerminalResult {
            success: false,
            output: None,
            error: Some("Empty command".to_string()),
            exit_code: Some(-1),
        };
    }
    
    let cmd = parts[0];
    let args = &parts[1..];
    
    // Create command
    let mut command_builder = Command::new(cmd);
    command_builder.args(args);
    command_builder.current_dir(&working_directory);
    
    // Set environment variables if provided
    if let Some(env) = environment {
        for (key, value) in env {
            command_builder.env(key, value);
        }
    }
    
    // Execute command
    match command_builder.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            let success = output.status.success();
            let exit_code = output.status.code();
            
            let error = if !stderr.is_empty() { Some(stderr.to_string()) } else { None };
            let output_str = if !stdout.is_empty() { Some(stdout.to_string()) } else { None };
            
            TerminalResult {
                success,
                output: output_str,
                error,
                exit_code,
            }
        }
        Err(e) => TerminalResult {
            success: false,
            output: None,
            error: Some(format!("Failed to execute command: {}", e)),
            exit_code: Some(-1),
        },
    }
}

// Workspace file operations
#[tauri::command]
async fn list_workspace_files(path: String) -> WorkspaceResult {
    match fs::read_dir(&path) {
        Ok(entries) => {
            let mut files = Vec::new();
            
            for entry in entries {
                if let Ok(entry) = entry {
                    let path_buf = entry.path();
                    let metadata = match fs::metadata(&path_buf) {
                        Ok(meta) => meta,
                        Err(_) => continue,
                    };
                    
                    let file_type = if metadata.is_dir() { "directory" } else { "file" };
                    let name = path_buf.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    
                    let last_modified = metadata.modified()
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs().to_string())
                        .unwrap_or_else(|_| "unknown".to_string());
                    
                    files.push(WorkspaceFileInfo {
                        path: path_buf.to_string_lossy().to_string(),
                        name,
                        size: metadata.len(),
                        file_type: file_type.to_string(),
                        last_modified,
                        content: None,
                    });
                }
            }
            
            WorkspaceResult {
                success: true,
                message: Some(format!("Listed {} files", files.len())),
                error: None,
                files: Some(files),
                content: None,
                path: None,
            }
        }
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to list files: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn read_workspace_file(path: String) -> WorkspaceResult {
    match fs::read_to_string(&path) {
        Ok(content) => WorkspaceResult {
            success: true,
            message: Some("File read successfully".to_string()),
            error: None,
            files: None,
            content: Some(content),
            path: Some(path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to read file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn write_workspace_file(path: String, content: String, create_backup: bool) -> WorkspaceResult {
    // Create backup if requested
    if create_backup {
        if let Ok(_) = fs::metadata(&path) {
            let backup_path = format!("{}.backup", path);
            if let Err(e) = fs::copy(&path, &backup_path) {
                return WorkspaceResult {
                    success: false,
                    message: None,
                    error: Some(format!("Failed to create backup: {}", e)),
                    files: None,
                    content: None,
                    path: None,
                };
            }
        }
    }
    
    // Ensure directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return WorkspaceResult {
                success: false,
                message: None,
                error: Some(format!("Failed to create directory: {}", e)),
                files: None,
                content: None,
                path: None,
            };
        }
    }
    
    match fs::write(&path, content) {
        Ok(_) => WorkspaceResult {
            success: true,
            message: Some("File written successfully".to_string()),
            error: None,
            files: None,
            content: None,
            path: Some(path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to write file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn create_workspace_file(path: String, content: String) -> WorkspaceResult {
    // Ensure directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return WorkspaceResult {
                success: false,
                message: None,
                error: Some(format!("Failed to create directory: {}", e)),
                files: None,
                content: None,
                path: None,
            };
        }
    }
    
    match fs::write(&path, content) {
        Ok(_) => WorkspaceResult {
            success: true,
            message: Some("File created successfully".to_string()),
            error: None,
            files: None,
            content: None,
            path: Some(path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to create file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn delete_workspace_file(path: String) -> WorkspaceResult {
    match fs::remove_file(&path) {
        Ok(_) => WorkspaceResult {
            success: true,
            message: Some("File deleted successfully".to_string()),
            error: None,
            files: None,
            content: None,
            path: Some(path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to delete file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn move_workspace_file(source_path: String, target_path: String) -> WorkspaceResult {
    // Ensure target directory exists
    if let Some(parent) = Path::new(&target_path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return WorkspaceResult {
                success: false,
                message: None,
                error: Some(format!("Failed to create target directory: {}", e)),
                files: None,
                content: None,
                path: None,
            };
        }
    }
    
    match fs::rename(&source_path, &target_path) {
        Ok(_) => WorkspaceResult {
            success: true,
            message: Some("File moved successfully".to_string()),
            error: None,
            files: None,
            content: None,
            path: Some(target_path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to move file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn copy_workspace_file(source_path: String, target_path: String) -> WorkspaceResult {
    // Ensure target directory exists
    if let Some(parent) = Path::new(&target_path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return WorkspaceResult {
                success: false,
                message: None,
                error: Some(format!("Failed to create target directory: {}", e)),
                files: None,
                content: None,
                path: None,
            };
        }
    }
    
    match fs::copy(&source_path, &target_path) {
        Ok(_) => WorkspaceResult {
            success: true,
            message: Some("File copied successfully".to_string()),
            error: None,
            files: None,
            content: None,
            path: Some(target_path),
        },
        Err(e) => WorkspaceResult {
            success: false,
            message: None,
            error: Some(format!("Failed to copy file: {}", e)),
            files: None,
            content: None,
            path: None,
        },
    }
}

#[tauri::command]
async fn agent_read_file(file_path: String) -> FileOperationResult {
    match fs::read(&file_path) {
        Ok(content) => {
            // Determine file type
            let file_type = if let Some(extension) = Path::new(&file_path).extension() {
                extension.to_string_lossy().to_lowercase()
            } else {
                "unknown".to_string()
            };
            
            let is_text = is_text_file(&file_path);
            let is_image = file_type == "png" || file_type == "jpg" || file_type == "jpeg" || file_type == "gif" || file_type == "bmp" || file_type == "webp";
            
            let file_info = FileInfo {
                name: Path::new(&file_path).file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string(),
                size: content.len() as u64,
                file_type: file_type.clone(),
                is_image,
                is_text,
                dimensions: None, // Would need image processing library to get dimensions
            };
            
            if is_text {
                // Try to read as text
                match fs::read_to_string(&file_path) {
                    Ok(text_content) => FileOperationResult {
                        success: true,
                        message: Some("File read successfully".to_string()),
                        error: None,
                        file_content: Some(text_content),
                        file_info: Some(file_info),
                    },
                    Err(e) => FileOperationResult {
                        success: false,
                        message: None,
                        error: Some(format!("Failed to read file as text: {}", e)),
                        file_content: None,
                        file_info: None,
                    },
                }
            } else {
                // For binary files, return file info only
                FileOperationResult {
                    success: true,
                    message: Some("Binary file info retrieved".to_string()),
                    error: None,
                    file_content: None,
                    file_info: Some(file_info),
                }
            }
        }
        Err(e) => FileOperationResult {
            success: false,
            message: None,
            error: Some(format!("Failed to read file: {}", e)),
            file_content: None,
            file_info: None,
        },
    }
}

fn is_text_file(file_path: &str) -> bool {
    let text_extensions = ["txt", "md", "json", "csv", "xml", "html", "css", "js", "py", "java", "cpp", "c", "h", "ts", "jsx", "tsx", "vue", "svelte", "log", "ini", "conf", "yml", "yaml", "rs", "toml", "lock"];
    
    if let Some(extension) = Path::new(file_path).extension() {
        let ext = extension.to_string_lossy().to_lowercase();
        text_extensions.contains(&ext.as_str())
    } else {
        false
    }
}

#[tauri::command]
async fn agent_list_files(directory_path: String) -> WorkspaceResult {
    list_workspace_files(directory_path).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            send_message_to_agent,
            get_agent_configs,
            clear_agent_history,
            get_agent_history,
            execute_command,
            list_workspace_files,
            read_workspace_file,
            write_workspace_file,
            create_workspace_file,
            delete_workspace_file,
            move_workspace_file,
            copy_workspace_file,
            agent_read_file,
            agent_list_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
