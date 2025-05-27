# NocturneAI

A sophisticated autonomous multi-agent collaboration system built on the Model Context Protocol (MCP) architecture. NocturneAI integrates powerful language models with a standardized protocol layer that enables seamless interaction with external systems and resources.

## 🚀 Features

- **LLM-Powered Decision Making**: Agents use LLMs to make decisions and solve complex problems
- **Specialized Reasoning Strategies**: Different reasoning modes (Sequential, Tree, Reflective, Socratic)
- **Modular Workflow System**: Compose complex workflows from reusable components
- **Dynamic Expertise Adaptation**: Agents learn and improve their expertise over time
- **Advanced Collaboration**: Messaging, shared knowledge graph, and task delegation
- **Conflict Resolution**: Mechanisms for resolving disagreements between agents
- **Real-time Monitoring**: Dashboard for tracking agent activities and workflow progress
- **Parallel Processing**: True parallel execution of independent workflows using asyncio

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

## 🏗️ Project Structure

```
agent-system/
├── src/
│   ├── agents/                # Agent implementations
│   │   ├── __init__.py
│   │   ├── advanced_agent.py  # Main agent with LLM capabilities
│   │   ├── reasoning.py       # Reasoning strategies
│   │   └── expertise.py       # Expertise adaptation system
│   │
│   ├── core/                  # NocturneAI code
│   │   ├── __init__.py
│   │   ├── agent.py           # Base agent class
│   │   ├── llm.py             # LLM integration
│   │   ├── memory.py          # Memory system
│   │   └── tools.py           # Tool system
│   │
│   ├── collaboration/         # Collaboration capabilities
│   │   ├── __init__.py
│   │   ├── protocol.py        # Communication protocol
│   │   ├── knowledge.py       # Shared knowledge graph
│   │   ├── tasks.py           # Task delegation
│   │   └── conflict.py        # Conflict resolution
│   │
│   ├── workflows/             # Workflow system
│   │   ├── __init__.py
│   │   ├── base.py            # Base workflow classes
│   │   ├── registry.py        # Workflow registry
│   │   ├── monitoring.py      # Workflow monitoring
│   │   ├── composite.py       # Composite workflows
│   │   ├── planning.py        # Planning workflows
│   │   └── research.py        # Research workflows
│   │
│   └── tools/                 # Built-in tools
│       └── web_search.py      # Web search and utility tools
│
├── examples/                 # Example implementations
│   ├── intelligent_workflow.py  # Basic intelligent agent example
│   ├── specialized_workflow.py  # Specialized agent example
│   ├── modular_workflow.py      # Modular workflow example
│   ├── advanced_agent_system.py # Advanced agent system example
│   ├── dashboard_example.py     # Dashboard example
│   └── reasoning_collaboration.py # Reasoning collaboration example
│
├── run_examples.py           # Script to run examples
├── requirements.txt
└── .env                      # Environment configuration── tests/                 # Test files
├── requirements.txt        # Project dependencies
└── README.md              # This file
```

## 🚀 Quick Start

### Basic Agent Example

1. Create a new agent by extending the `BaseAgent` class:

```python
from src.core.agent import BaseAgent, AgentRole, AgentResponse

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__(role=AgentRole.EXECUTOR, name="my_agent")
    
    async def process(self, input_data):
        # Your agent logic here
        return AgentResponse(
            content="Task completed",
            next_agent="next_agent_name"
        )
```

2. Create and run a workflow:

```python
from src.core.workflow import Workflow, WorkflowConfig
from src.agents.coordinator import CoordinatorAgent
import asyncio

async def main():
    # Configure workflow
    config = WorkflowConfig(
        name="my_workflow",
        entry_point="my_agent",
        max_steps=10
    )
    
    # Create workflow and register agents
    workflow = Workflow(config)
    workflow.register_agent(MyAgent())
    
    # Run workflow
    coordinator = CoordinatorAgent(workflow)
    response = await coordinator.process({"input": "data"})
    print(response.content)

if __name__ == "__main__":
    asyncio.run(main())
```

### Advanced Agent with Tools

Create an advanced agent with tools and memory:

```python
from src.agents.advanced_agent import AdvancedAgent
from src.tools.web_search import WebSearchTool, CalculatorTool
from src.core.memory import MemoryStore

# Create an advanced agent
agent = AdvancedAgent(
    role="researcher",
    name="research_agent",
    memory_store=MemoryStore()
)

# Register tools
agent.register_tool(WebSearchTool(api_key="your_brave_api_key"))
agent.register_tool(CalculatorTool())

# Process input
response = await agent.process({
    "content": "What's the weather like today?"
})
print(response.content)
```

### Running the Advanced Example

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your API keys:
   ```
   BRAVE_API_KEY=your_brave_api_key_here
   ```

3. Run the advanced example:
   ```bash
   python -m examples.advanced_workflow
   ```

4. Interact with the agent in the console.

## 📚 Documentation

For detailed documentation, see the `docs/` directory.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Code by day, let Noctrune AI run the show by night.**

Welcome to  **Noctrune AI** , a cutting-edge, developer-centric workflow automation system powered by autonomous AI agents. Designed to free developers from the grind of project management, Noctrune AI handles tasks like planning, quality assurance, troubleshooting, and research while you sleep. Built with local LLMs via [Ollama](https://ollama.com/) and orchestrated by [LangGraph](https://www.langchain.com/langgraph), Noctrune AI is private, cost-efficient, and ready to revolutionize your development process.

## 🌟 Features

* **Autonomous Agents** : Specialized agents for planning, quality assurance, troubleshooting, and research.
* **Privacy-First** : Runs locally with Ollama, keeping your data secure.
* **Adaptive Intelligence** : Agents evolve through feedback, improving over time.
* **Seamless Integration** : Fits into your existing dev environment with Git and Python.
* **Silicon Valley Swagger** : Built for speed, innovation, and developer delight.

## 🚀 Getting Started

### Prerequisites

* **Python 3.8+** : Ensure Python is installed.
* **Ollama** : Local LLM runtime (install from [ollama.com](https://ollama.com/)).
* **Git** : For version control.
* **Hardware** : 16GB+ RAM recommended for running larger models like Llama 3.

### Installation

1. **Clone the Repository** :

```bash
   git clone https://github.com/your-username/noctrune-ai.git
   cd noctrune-ai
```

1. **Install Dependencies** :

```bash
   pip install langgraph langchain langchain-community faiss-cpu sentence-transformers
```

1. **Set Up Ollama** :

* Install Ollama following the instructions at [ollama.com](https://ollama.com/).
* Pull a model (e.g., Llama 3 or CodeLLaMA):
  ```bash
  ollama pull llama3
  ```

1. **Initialize Knowledge Base** :

* Add project documents (e.g., specs, coding standards) to the `/data` folder.
* Run the setup script to index documents:
  ```bash
  python scripts/setup_knowledge_base.py
  ```

### Project Structure

```plaintext
/noctrune-ai
├── /data              # Knowledge base and data files
├── /docs              # Documentation (e.g., AgentFlow_Plan.md)
├── /scripts           # Utility scripts (e.g., setup, run)
├── /src               # Source code for agents and workflows
├── /tests             # Automated tests
├── README.md          # This file
├── requirements.txt   # Python dependencies
```

## 🛠️ Usage

1. **Configure Workflow** :

* Edit `src/config.yaml` to define agent tasks and settings.
* Example:
  ```yaml
  agents:
    planning:
      model: llama3
      prompt: "Update project plan based on current state and history."
    quality_assurance:
      model: llama3
      prompt: "Analyze code for quality issues and suggest improvements."
  ```

1. **Run Noctrune AI** :

* Trigger the workflow manually:
  ```bash
  python src/main.py
  ```
* Or schedule it to run at night using a cron job (Linux):
  ```bash
  crontab -e
  # Add: 0 0 * * * /path/to/noctrune-ai/scripts/run_workflow.sh
  ```

1. **Review Output** :

The system includes several specialized agent types working together:

* **Coordinator Agent**: Manages tasks and coordinates agent activities
* **Planner Agent**: Creates strategic plans and breaks down problems
* **Researcher Agent**: Gathers and analyzes information
* **Executor Agent**: Implements solutions and executes tasks
* **Reviewer Agent**: Evaluates work and provides critical feedback
* **Creative Agent**: Generates innovative ideas and approaches

Agents collaborate through a shared knowledge graph, task registry, and communication protocol. They can use different reasoning strategies based on their thinking style and the problem at hand.

## 🌐 Contributing

We welcome contributions to make our Multi-Agent System even cooler! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-agent`).
3. Commit changes (`git commit -m "Add awesome agent"`).
4. Push to the branch (`git push origin feature/awesome-agent`).
5. Open a pull request.

Please follow our [Code of Conduct](https://grok.com/chat/docs/CODE_OF_CONDUCT.md) and [Contribution Guidelines](https://grok.com/chat/docs/CONTRIBUTING.md).

## 📚 Documentation

Detailed setup and architecture are in `/docs/AgentFlow_Plan.md`. For LangGraph and Ollama specifics, see:

* [LangGraph Documentation](https://www.langchain.com/langgraph)
* [Ollama Documentation](https://ollama.com/)

## 🌍 Community

Join the Noctrune AI community:

* **GitHub Discussions** : Share ideas and ask questions.
* **X** : Follow us at `@NoctruneAI` for updates.

## ⚠️ Known Limitations

* **Local Models** : Limited to Ollama-supported models; performance depends on hardware.
* **Research Scope** : Relies on a local knowledge base (no web access yet).
* **Adaptability** : Uses prompt-based feedback, not true model fine-tuning.

## 📜 License

This project is licensed under the MIT License. See LICENSE for details.

## 🙌 Acknowledgements

* Built with advanced LLM integration supporting both OpenAI and local models via Ollama
* Implements sophisticated reasoning strategies and collaborative workflows

---

**Advanced Multi-Agent Collaboration System: Autonomous agents working together to solve complex problems.**
