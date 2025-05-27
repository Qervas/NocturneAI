#!/usr/bin/env python3
"""
Agent System Launcher

This script provides a simple command-line interface for running
the various examples in the agent collaboration system.
"""

import os
import sys
import asyncio
import argparse
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_environment():
    """Check if the environment is properly set up"""
    required_env_vars = []
    
    # Check if either OpenAI or Ollama configuration is available
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("OLLAMA_BASE_URL"):
        required_env_vars.append("OPENAI_API_KEY or OLLAMA_BASE_URL")
    
    if not os.getenv("MODEL_NAME"):
        print("Warning: MODEL_NAME not set. Using default model.")
    
    if required_env_vars:
        print("Error: Missing required environment variables:")
        for var in required_env_vars:
            print(f"  - {var}")
        print("\nPlease set these variables in your .env file or environment.")
        return False
    
    return True

async def run_example(example_name):
    """Run a specific example"""
    try:
        if example_name == "basic":
            from examples.intelligent_workflow import run_example
            await run_example()
        elif example_name == "specialized":
            from examples.specialized_workflow import run_example
            await run_example()
        elif example_name == "modular":
            from examples.modular_workflow import run_example
            await run_example()
        elif example_name == "advanced":
            from examples.advanced_agent_system import run_example
            await run_example()
        elif example_name == "dashboard":
            from examples.dashboard_example import run_dashboard_example
            await run_dashboard_example()
        elif example_name == "reasoning":
            from examples.reasoning_collaboration import run_example
            await run_example()
        else:
            print(f"Error: Unknown example '{example_name}'")
            return False
        
        return True
    except ImportError as e:
        print(f"Error importing example module: {str(e)}")
        return False
    except Exception as e:
        print(f"Error running example: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Run agent collaboration examples")
    
    parser.add_argument(
        "example",
        choices=["basic", "specialized", "modular", "advanced", "dashboard", "reasoning", "all"],
        help="The example to run"
    )
    
    parser.add_argument(
        "--model",
        help="Override the model name (otherwise uses MODEL_NAME from .env)"
    )
    
    args = parser.parse_args()
    
    # Check environment setup
    if not check_environment():
        return 1
    
    # Override model name if specified
    if args.model:
        os.environ["MODEL_NAME"] = args.model
        print(f"Using model: {args.model}")
    
    if args.example == "all":
        examples = ["basic", "specialized", "modular", "advanced", "dashboard", "reasoning"]
        
        print("Running all examples sequentially:\n")
        
        for example in examples:
            print(f"\n{'=' * 80}")
            print(f"RUNNING EXAMPLE: {example}")
            print(f"{'=' * 80}\n")
            
            asyncio.run(run_example(example))
            
            print(f"\n{'=' * 80}")
            print(f"COMPLETED EXAMPLE: {example}")
            print(f"{'=' * 80}\n")
            
            # Pause between examples
            if example != examples[-1]:
                input("Press Enter to continue to the next example...")
    else:
        print(f"\n{'=' * 80}")
        print(f"RUNNING EXAMPLE: {args.example}")
        print(f"{'=' * 80}\n")
        
        success = asyncio.run(run_example(args.example))
        
        print(f"\n{'=' * 80}")
        print(f"{'COMPLETED' if success else 'FAILED'} EXAMPLE: {args.example}")
        print(f"{'=' * 80}\n")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
