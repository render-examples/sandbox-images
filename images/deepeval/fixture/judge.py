"""Optional semantic answer judging through an explicitly selected real model route."""
import argparse
import json
import math
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, SingleTurnParams
from openai import OpenAI

parser = argparse.ArgumentParser()
parser.add_argument("--provider", choices=["openai", "openrouter"], required=True)
parser.add_argument("--model", required=True)
parser.add_argument("--cases", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
if args.output.exists():
    parser.error("Output must be a new file")
key_name = "OPENAI_API_KEY" if args.provider == "openai" else "OPENROUTER_API_KEY"
if not os.environ.get(key_name):
    parser.error(f"Set {key_name} only at execution time")
client = OpenAI(api_key=os.environ[key_name], base_url="https://api.openai.com/v1" if args.provider == "openai" else "https://openrouter.ai/api/v1", timeout=60, max_retries=1)
receipts: list[dict[str, Any]] = []

class Judge(DeepEvalBaseLLM):
    def load_model(self) -> Any:
        return client
    def get_model_name(self) -> str:
        return args.provider + "/" + args.model
    def generate(self, prompt: str, schema: Any = None) -> Any:
        instruction = "Return only valid JSON."
        if schema:
            instruction += " Use this JSON schema: " + json.dumps(schema.model_json_schema())
        result = client.chat.completions.create(model=args.model, messages=[{"role": "system", "content": instruction}, {"role": "user", "content": prompt}], max_tokens=1024)
        receipts.append({"id": result.id, "model": result.model, "usage": result.usage.model_dump() if result.usage else None})
        content = result.choices[0].message.content or ""
        return schema.model_validate_json(content) if schema else content
    async def a_generate(self, prompt: str, schema: Any = None) -> Any:
        return self.generate(prompt, schema)

rows = []
cases = json.loads(args.cases.read_text())
if not 1 <= len(cases) <= 10:
    parser.error("Require between one and ten bounded cases")
for case in cases:
    row: dict[str, Any] = {"id": case["id"], "provider": args.provider, "requestedModel": args.model, "mode": "authenticated-judge"}
    try:
        metric = GEval(name="Answer correctness", criteria="Does the answer contain the expected factual value without contradiction?", evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT], model=Judge(), async_mode=False)
        score = float(metric.measure(LLMTestCase(input=case["question"], actual_output=case["response"], expected_output=case["reference"]), _show_indicator=False))
        if not math.isfinite(score) or not 0 <= score <= 1:
            raise ValueError("Judge returned an invalid score")
        row["score"] = score
        row["controlPassed"] = case.get("expectedMin", 0) <= score <= case.get("expectedMax", 1)
    except Exception as exc:
        row["errorType"] = type(exc).__name__
    rows.append(row)
    args.output.write_text(json.dumps({"schemaVersion": 1, "passed": len(rows) == len(cases) and all(r.get("controlPassed") is True for r in rows), "agentInvoked": True, "rows": rows, "calls": receipts}, indent=2, allow_nan=False) + "\n")
if any(row.get("controlPassed") is not True for row in rows):
    raise SystemExit("Judge execution or independent controls failed; errors retained")
