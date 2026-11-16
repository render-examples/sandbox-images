#!/usr/local/bin/python
"""Run the pinned mini-SWE agent locally inside the enclosing Render sandbox."""
import argparse
import importlib.metadata
import json
import os
from importlib.resources import files
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', action='version', version=importlib.metadata.version('mini-swe-agent'))
    parser.add_argument('--model', default=os.environ.get('AGENT_MODEL'))
    parser.add_argument('prompt')
    args = parser.parse_args()
    if not args.model:
        parser.error('Set AGENT_MODEL or --model to an explicit provider/model')
    import yaml
    from minisweagent.agents.default import DefaultAgent
    from minisweagent.environments.local import LocalEnvironment
    from minisweagent.models.litellm_model import LitellmModel
    config = yaml.safe_load(files('minisweagent').joinpath('config/default.yaml').read_text())['agent']
    config.update(step_limit=20, cost_limit=0.5, wall_time_limit_seconds=240)
    agent = DefaultAgent(LitellmModel(model_name=args.model, model_kwargs={'timeout': 45, 'max_tokens': 2048}), LocalEnvironment(cwd=str(Path.cwd()), timeout=30), **config)
    result = agent.run(args.prompt)
    print(json.dumps({'agentInvoked': True, 'requestedModel': args.model, 'result': result}, default=str))

if __name__ == '__main__':
    main()
