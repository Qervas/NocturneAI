# 🤖✨ Intelligence Empire

**A beautiful game-like interface for managing autonomous AI agents**

Think *The Sims* meets AI management - cute, intuitive, and engaging! Your agents live in a visual world where you can see them think, collaborate, and grow.

## 🎮 **What Makes This Special**

- **Game-Like Interface**: Click on agents to see their details, watch them move around, observe their moods
- **Real-Time Visualization**: See agent relationships, energy levels, and activities as they happen  
- **Cute & Intuitive**: Emoji avatars, color-coded moods, smooth animations
- **Pure Rust Performance**: Blazing fast with Bevy game engine
- **Professional AI**: Python backend with Ollama integration for serious reasoning capabilities

## 🚀 **Quick Start**

### **Run the Game**
```bash
# Start the Rust Bevy game frontend
cargo run

# In another terminal, start the Python AI backend
cd backend
python main.py
```

### **Controls**
- **Click agents**: Select and view detailed information
- **C**: Open chat interface  
- **1-4**: Select specific agents for conversation (when chat open)
- **F11**: Toggle fullscreen
- **+/-**: Adjust UI scale

## 🏗️ **Architecture**

### **Rust + Python Stack**
```
┌─────────────────────────────────────────┐
│           Intelligence Empire           │
├─────────────────────────────────────────┤
│  🎮 Game Frontend (Bevy Engine)         │
│  ├── Interactive 2D Agent World         │
│  ├── Cute Agent Sprites & Animations    │
│  ├── Real-time Network Visualization    │
│  ├── Ollama Chat Integration            │
│  └── Game-like UI Overlays              │
├─────────────────────────────────────────┤
│  🧠 AI Backend (Python + FastAPI)       │
│  ├── Ollama LLM Integration             │
│  ├── Agent Reasoning & Decisions        │
│  ├── Conversation Management            │
│  └── RESTful API for Rust Frontend      │
├─────────────────────────────────────────┤
│  🧠 Cognitive Services (Rust)           │
│  ├── Multi-Agent Reasoning Workflows    │
│  ├── Social Learning Algorithms         │
│  ├── Personality & Emotion Systems      │
│  └── Agent-to-Agent Communication       │
├─────────────────────────────────────────┤
│  🦀 Core Systems (Pure Rust)            │
│  ├── Agent State Management             │
│  ├── Real-time Coordination             │
│  ├── Social Network Graph               │
│  └── Performance-Critical Logic         │
└─────────────────────────────────────────┘
```

### **Project Structure**
```
intelligence-empire/
├── crates/
│   ├── intelligence-core/     # 🎮 Main Bevy game engine
│   ├── cognitive-services/    # 🧠 AI reasoning workflows  
│   ├── agent-framework/       # 🤖 Agent lifecycle & behaviors
│   ├── social-engine/         # 🤝 Relationships & learning
│   └── shared-types/          # 📦 Common data structures
├── backend/                   # 🐍 Python AI backend
│   ├── app/                   # FastAPI application
│   ├── services/              # Ollama & AI services
│   └── models/                # Data models
├── assets/                    # 🎨 Sprites, sounds, effects
└── docs/                      # 📚 Documentation
```

## 🎮 **Game Features**

### **Agent World**
- **2D Game Environment**: Top-down view of your "agent network"
- **Living Agents**: Cute character sprites with emoji avatars (👩‍💼👨‍💻👩‍🎨👨‍🔬)
- **Visual Connections**: Animated directed edges between agents
- **Mood Visualization**: Agent colors and animations reflect their current state
- **Real-time Updates**: Watch agents think, collaborate, and evolve

### **Agent Interaction**
- **Click to Select**: Click any agent to see detailed information
- **Game-like UI**: Beautiful panels with stats, actions, and controls
- **Chat Integration**: Direct conversation with agents via Ollama
- **Network Visualization**: See agent relationships as animated particle flows
- **Responsive Design**: Fullscreen support with dynamic UI scaling

### **Cute Visual Elements**
- **Emoji Avatars**: Sarah👩‍💼, Alex👨‍💻, Maya👩‍🎨, Dr. Kim👨‍🔬
- **Color Themes**: Ocean Blue, Forest Green, Sunset Orange, Lavender Purple
- **Mood Animations**: Personality-based visual effects and pulsing auras
- **Particle Effects**: Communication flows and sparkle effects
- **Game UI**: Progress bars for energy, focus, and confidence

## 🧠 **AI Capabilities**

### **Python Backend**
- **Ollama Integration**: Local LLM for agent conversations
- **Agent Reasoning**: Personality-based decision making
- **Conversation Management**: Multi-agent dialogue systems
- **RESTful API**: Clean integration with Rust frontend

### **Rust Cognitive Services**
- **Multi-Agent Workflows**: Complex reasoning patterns
- **Social Learning**: Agents learn from interactions
- **Personality System**: Big Five traits with dynamic moods
- **Network Analysis**: Relationship strength and influence

## 🎯 **Agent Network**

Your empire starts with 4 specialized agents:

- **Sarah Chen 👩‍💼** - Strategic Leadership (Ocean Blue theme)
- **Alex Rodriguez 👨‍💻** - Technical Innovation (Forest Green theme)  
- **Maya Patel 👩‍🎨** - Creative Design (Sunset Orange theme)
- **Dr. Kim 👨‍🔬** - Research & Analytics (Lavender Purple theme)

Watch them form connections, collaborate on projects, and grow their capabilities through social learning!

## 🔧 **Development**

### **Prerequisites**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Python dependencies for backend
cd backend
pip install -r requirements.txt
```

### **Development Mode**
```bash
# Run with fast compilation
cargo run --features dev

# Or build optimized release
cargo build --release
cargo run --release
```

## 🤝 **Contributing**

This is designed to be a **living system** that evolves:

1. **Agent Personalities**: Add new traits and behaviors
2. **Visual Themes**: Create new color schemes and animations  
3. **AI Capabilities**: Integrate new Ollama models
4. **Game Mechanics**: Add progression systems and achievements
5. **UI Polish**: Improve animations and visual feedback

## 📚 **Learn More**

- **Bevy Engine**: [bevyengine.org](https://bevyengine.org)
- **Ollama**: [ollama.ai](https://ollama.ai)
- **Agent Design**: See `docs/agent-personalities.md`
- **Technical Architecture**: See `docs/architecture-overview.md`

---

**Built with ❤️ using Rust, Bevy, Python, and a vision of AI that feels alive** 🤖✨ 