# NocturneAI

A sophisticated autonomous multi-agent collaboration system built on the Model Context Protocol (MCP) architecture. NocturneAI integrates powerful language models with a standardized protocol layer that enables seamless interaction with external systems and resources.

## 💻 Architecture

NocturneAI is built on a modular architecture with several key components:

* **Modular Agent System**: Autonomous single agents with dynamic capability composition
* **Capability Framework**: Reusable agent capabilities that can be dynamically composed
* **Dynamic Workflow Generation**: Workflows generated at runtime during task planning
* **LLM Integration**: Interfaces with language models (both cloud and local) for natural language processing
* **Knowledge System**: Manages shared information between agents
* **Monitoring**: Provides visibility into agent activities and system performance

### Module Structure

The codebase is organized into specialized modules:

* **`src/agents`**: Core agent implementation and capabilities
* **`src/llm`**: Language model providers and interfaces
* **`src/tools`**: Tool definitions and registry for agent capabilities
* **`src/config`**: Configuration management
* **`src/collaboration`**: Inter-agent communication and collaboration

## 🚀 Features

- **Modular Agent Architecture**: Single autonomous agents with dynamic capability composition
- **LLM-Powered Decision Making**: Agents use LLMs to make decisions and solve complex problems
- **Dynamic Workflow Generation**: Workflows are generated at runtime based on task requirements
- **Specialized Reasoning Strategies**: Different reasoning modes (Sequential, Tree, Reflective, Socratic)
- **Advanced Collaboration**: Messaging, shared knowledge graph, and task delegation
- **Conflict Resolution**: Mechanisms for resolving disagreements between agents
- **Real-time Monitoring**: Dashboard for tracking agent activities and workflow progress
- **Parallel Processing**: True parallel execution of independent tasks using asyncio

## 📦 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/agent-system.git
   cd agent-system
   ```
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   Create a `.env` file with the following (or use environment variables):

   ```
   # For OpenAI
   OPENAI_API_KEY=your_openai_api_key
   MODEL_NAME=gpt-3.5-turbo

   # OR for local models via Ollama
   OLLAMA_BASE_URL=http://localhost:11434
   MODEL_NAME=gemma3
   ```
4. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
5. Create a `.env` file with your API keys:

   ```
   BRAVE_API_KEY=your_brave_api_key_here
   ```
6. Run the advanced example:

   ```bash
   python -m examples.advanced_workflow
   ```
7. Interact with the agent in the console.

## 📚 Documentation

For detailed documentation, see the `docs/` directory.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔄 Agent Capabilities

Instead of hardcoded agent types, the system uses a modular capability-based approach:

* **Planning Capability**: Creates strategies and breaks down problems
* **Research Capability**: Gathers and analyzes information
* **Tool Use Capability**: Utilizes external tools and APIs
* **Reflection Capability**: Self-evaluates and improves reasoning
* **Dynamic Workflow Capability**: Generates workflows at runtime
* **Collaboration Capabilities**: Enables team coordination and consensus building

Agents can dynamically compose these capabilities based on task requirements. This makes the system more flexible and modular than predefined agent roles.

## 🌐 Contributing

We welcome contributions to make our Multi-Agent System even cooler! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-agent`).
3. Commit changes (`git commit -m "Add awesome agent"`).
4. Push to the branch (`git push origin feature/awesome-agent`).
5. Open a pull request.

Please follow our [Code of Conduct](https://grok.com/chat/docs/CODE_OF_CONDUCT.md) and [Contribution Guidelines](https://grok.com/chat/docs/CONTRIBUTING.md).

## 📚 Documentation

Detailed setup and architecture documentation:

* `/docs/AgentFlow_Plan.md` - Overall system architecture
* `/examples/single_agent_dynamic_workflow.py` - Example of using a single modular agent
* `/examples/collaborative_agents.py` - Example of collaborative agents working together
* `/MIGRATION_GUIDE.md` - Guide for migrating from older API to the new architecture

For external resources, see:

* [LangGraph Documentation](https://www.langchain.com/langgraph)
* [Ollama Documentation](https://ollama.com/)

### Recent Architecture Changes

We have recently completed a major refactoring of the codebase to improve modularity and organization:

1. **Removed Static Workflows**: Dynamic workflow generation replaces static workflow definitions
2. **Modularized Core Components**: Specialized modules for LLM, tools, config, etc.
3. **Enhanced Capability System**: More robust capability framework for agent composition

See the `MIGRATION_GUIDE.md` for details on how to update your code to use the new architecture.

## ⚠️ Known Limitations

* **Local Models**: Limited to Ollama-supported models; performance depends on hardware
* **Research Scope**: Relies on a local knowledge base (no web access yet)
* **Adaptability**: Uses prompt-based feedback, not true model fine-tuning
* **Capability Discovery**: Manual registration may be needed for some capabilities

---
