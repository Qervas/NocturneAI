use std::process::{Command, Stdio};

// Optimized command execution with extended timeout for long-running commands
#[tauri::command]
fn execute_command(command: String, working_dir: Option<String>) -> Result<serde_json::Value, String> {
    let working_directory = working_dir.unwrap_or_else(|| ".".to_string());

    // Check if this is a long-running command
    let long_running_commands = ["ping", "npm", "cargo", "docker", "git clone", "wget", "curl"];
    let is_long_running = long_running_commands.iter().any(|&cmd| command.to_lowercase().contains(cmd));

    let mut command_builder = if cfg!(target_os = "windows") {
        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-Command", &command]);
        cmd
    } else {
        let mut cmd = Command::new("bash");
        cmd.args(["-c", &command]);
        cmd
    };

    command_builder
        .current_dir(&working_directory)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    command_builder.env_clear();
    for (key, value) in std::env::vars() {
        if !key.is_empty() && !value.is_empty() {
            command_builder.env(key, value);
        }
    }

    let output = command_builder.output().map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let result = serde_json::json!({
        "success": output.status.success(),
        "output": stdout,
        "error": stderr,
        "exitCode": exit_code,
        "command": command,
        "isLongRunning": is_long_running
    });

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 