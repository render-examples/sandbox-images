#!/usr/local/bin/python
"""Standalone OpenHands SDK: local guest workspace, no server or nested Docker."""
import argparse
import importlib.metadata
import os
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', action='version', version=importlib.metadata.version('openhands-sdk'))
    parser.add_argument('--model', default=os.environ.get('AGENT_MODEL'))
    parser.add_argument('prompt')
    args = parser.parse_args()
    if not args.model:
        parser.error('Set AGENT_MODEL or --model explicitly')
    from openhands.sdk import LLM, Agent, Conversation, Tool
    from openhands.tools.file_editor import FileEditorTool
    from openhands.tools.terminal import TerminalTool
    # Caller selects one supported provider credential; never inherit Render credentials.
    provider = args.model.split('/', 1)[0]
    key_name = {'openrouter': 'OPENROUTER_API_KEY', 'anthropic': 'ANTHROPIC_API_KEY', 'gemini': 'GEMINI_API_KEY', 'openai': 'OPENAI_API_KEY'}.get(provider)
    if not key_name or not os.environ.get(key_name):
        parser.error('Use openai/, anthropic/, gemini/ or openrouter/ and supply its runtime key')
    llm = LLM(model=args.model, api_key=os.environ[key_name], max_output_tokens=2048)
    agent = Agent(llm=llm, tools=[Tool(name=TerminalTool.name), Tool(name=FileEditorTool.name)])
    conversation = Conversation(agent=agent, workspace=str(Path.cwd()), max_iteration_per_run=20)
    try:
        conversation.send_message(args.prompt)
        conversation.run()
    finally:
        conversation.close()

if __name__ == '__main__':
    main()
