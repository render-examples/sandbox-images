#!/usr/local/bin/python
"""Run the pinned mini-SWE agent locally inside the enclosing Render sandbox."""
import argparse
import importlib.metadata
import json
import os
import math
import urllib.request
from datetime import datetime, timezone
from importlib.resources import files
from pathlib import Path


PRICING_URL = 'https://openrouter.ai/api/v1/models'

def openrouter_cost_registration(model: str, catalog: dict) -> dict:
    """Conservative text-token rates; unknown/invalid pricing fails closed."""
    requested = model.removeprefix('openrouter/')
    matches = [row for row in catalog.get('data', []) if row.get('id') == requested]
    if len(matches) != 1:
        raise ValueError('Selected OpenRouter model has no unique pricing record')
    row = matches[0]
    pricing = row['pricing']
    def rate(value) -> float:
        result = float(value)
        if not math.isfinite(result) or result < 0:
            raise ValueError('Invalid model pricing')
        return result
    if rate(pricing.get('request', 0)) != 0:
        raise ValueError('Per-request fees require a separate cost adapter')
    overrides = pricing.get('overrides', [])
    input_rate = max([rate(pricing['prompt']), *(rate(item.get('prompt', pricing['prompt'])) for item in overrides)])
    output_rate = max(rate(pricing['completion']), rate(pricing.get('internal_reasoning', pricing['completion'])), *(rate(item.get('completion', pricing['completion'])) for item in overrides))
    if input_rate <= 0 or output_rate <= 0:
        raise ValueError('This bounded example requires positive text-token pricing')
    context = int(row['context_length'])
    if context <= 0:
        raise ValueError('Invalid model context length')
    return {'max_tokens': context, 'max_input_tokens': context, 'max_output_tokens': 2048,
            'input_cost_per_token': input_rate, 'output_cost_per_token': output_rate,
            'cache_read_input_token_cost': input_rate, 'cache_creation_input_token_cost': input_rate,
            'litellm_provider': 'openrouter', 'mode': 'chat'}

def register_openrouter_pricing(model: str) -> dict | None:
    if not model.startswith('openrouter/'):
        return None
    # Public metadata only; no provider key is sent on this request.
    with urllib.request.urlopen(PRICING_URL, timeout=15) as response:
        raw = response.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError('Model catalog exceeds the size bound')
    registration = openrouter_cost_registration(model, json.loads(raw))
    import litellm
    litellm.register_model({model: registration})
    return {'source': PRICING_URL, 'model': model, 'checkedAt': datetime.now(timezone.utc).isoformat(),
            'accounting': 'conservative maximum text-token rates including listed tiers; cache discounts ignored',
            'registration': registration}

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
    pricing = register_openrouter_pricing(args.model)
    config = yaml.safe_load(files('minisweagent').joinpath('config/default.yaml').read_text())['agent']
    config.update(step_limit=20, cost_limit=0.5, wall_time_limit_seconds=240)
    agent = DefaultAgent(LitellmModel(model_name=args.model, cost_tracking='default', model_kwargs={'timeout': 45, 'max_tokens': 2048}), LocalEnvironment(cwd=str(Path.cwd()), timeout=30), **config)
    result = agent.run(args.prompt)
    print(json.dumps({'agentInvoked': True, 'requestedModel': args.model, 'exitStatus': result.get('exit_status'), 'pricing': pricing, 'result': result}, default=str))
    if result.get('exit_status') != 'Submitted':
        raise SystemExit(1)

if __name__ == '__main__':
    main()
