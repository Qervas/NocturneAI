# LLM Integration Setup Guide

This multi-agent chat system now supports real conversations with AI agents using local LLM servers. Here's how to set it up:

## Supported Local LLM Servers

### Option 1: Ollama (Recommended)
1. **Download Ollama**: Visit [ollama.ai](https://ollama.ai) and download for your OS
2. **Install and start Ollama**
3. **Pull a model**:
   ```bash
   ollama pull llama3.2
   ```
4. **Verify it's running**: Open http://localhost:11434 in your browser
5. **The app will automatically detect and use Ollama**

### Option 2: LM Studio
1. **Download LM Studio**: Visit [lmstudio.ai](https://lmstudio.ai)
2. **Install and open LM Studio**
3. **Download a model** (e.g., Llama 3.2 or similar)
4. **Start the local server** (usually on port 1234)
5. **The app will fall back to LM Studio if Ollama is not available**

## How It Works

### Agent Personalities
Each agent has a unique personality and specialization:

- **Agent Alpha** (🧠): Analytical data specialist - Green triangular character
- **Agent Beta** (🎨): Creative content generator - Orange triangular character  
- **Agent Gamma** (⚙️): Logical problem solver - Purple triangular character

### Visual Interface
- **Gaming Canvas**: All three agents are displayed as animated triangular characters
- **Character Selection**: Click on any agent to select them (yellow glow indicates selection)
- **Character Panel**: View detailed agent information and status
- **Live Interaction**: Agents have breathing animations, blinking eyes, and particle effects

### Chat Features
- **Direct messaging**: Use `@AgentName` to chat directly with an agent
- **Conversation memory**: Each agent remembers your conversation history
- **Thinking indicators**: See when agents are processing your messages
- **Fallback responses**: Agents provide helpful error messages if LLM is unavailable

### Technical Details
- **Backend**: Rust (Tauri) handles LLM API calls
- **Models**: Configurable per agent (default: llama3.2)
- **Memory**: Conversation history stored per agent
- **Performance**: Async processing with typing indicators

## Usage Examples

1. **Start a conversation**:
   - Click the 💬 chat button
   - Type: `@Agent Alpha can you help me analyze some data?`

2. **Continue chatting**:
   - The agent will remember your previous messages
   - Switch between global, team, and direct message tabs

3. **Multiple agents**:
   - Chat with different agents: `@Agent Beta write a creative story`
   - Each maintains separate conversation context

## Troubleshooting

### No Response from Agents?
1. Check if Ollama is running: `ollama list`
2. Or check if LM Studio server is active
3. Look at browser console for error messages
4. Agents will show error messages if LLM is unavailable

### Slow Responses?
- Local LLMs depend on your hardware
- Consider smaller/faster models like `llama3.2:1b`
- Check your GPU/CPU usage

### Memory Issues?
- Conversation history is limited to last 10 messages per agent
- Use the clear chat button (🗑️) to reset if needed

## Configuration

You can modify agent configurations in:
`src-tauri/src/lib.rs` in the `get_agent_configs()` function

Available settings:
- Model name
- System prompt/personality
- Specialization
- Temperature and other LLM parameters

## Adding New Agents

1. Add agent config in Rust backend
2. Update character manager with matching character data
3. Agents will automatically appear in the chat system

Enjoy chatting with your AI agents! 🤖✨
