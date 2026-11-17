"""Optional real judge run, separately labeled from deterministic retrieval metrics."""
import argparse
import asyncio
import json
import math
import os
from pathlib import Path
from ragas import SingleTurnSample
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import Faithfulness
from langchain_core.callbacks import BaseCallbackHandler

parser = argparse.ArgumentParser()
parser.add_argument("--provider", choices=["openai", "openrouter"], required=True)
parser.add_argument("--model", required=True)
parser.add_argument("--cases", type=Path, required=True, help="JSON rows with question, response and retrieved fields")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
if args.output.exists():
    parser.error("Output must be a new file")
from langchain_openai import ChatOpenAI
calls: list[dict] = []

class Recorder(BaseCallbackHandler):
    def on_llm_end(self, response, **kwargs) -> None:
        for batch in response.generations:
            for generation in batch:
                message = getattr(generation, "message", None)
                if message is not None:
                    calls.append({"responseMetadata": message.response_metadata, "usage": message.usage_metadata})
key_name = "OPENAI_API_KEY" if args.provider == "openai" else "OPENROUTER_API_KEY"
if not os.environ.get(key_name):
    parser.error(f"Set {key_name} only at execution time")
model = ChatOpenAI(model=args.model, api_key=os.environ[key_name],
    base_url="https://api.openai.com/v1" if args.provider == "openai" else "https://openrouter.ai/api/v1",
    timeout=60, max_retries=1, max_tokens=512, callbacks=[Recorder()])
metric = Faithfulness(llm=LangchainLLMWrapper(model))

async def main() -> None:
    rows = []
    cases = json.loads(args.cases.read_text())
    if not 1 <= len(cases) <= 10:
        parser.error("Require between one and ten bounded cases")
    for case in cases:
        row = {"id": case["id"], "provider": args.provider, "requestedModel": args.model, "mode": "authenticated-judge"}
        try:
            score = float(await asyncio.wait_for(metric.single_turn_ascore(SingleTurnSample(
                user_input=case["question"], response=case["response"], retrieved_contexts=case["retrieved"])), timeout=120))
            if not math.isfinite(score) or not 0 <= score <= 1:
                raise ValueError("Judge returned an invalid score")
            row["faithfulness"] = score
            row["controlPassed"] = case.get("expectedMin", 0) <= score <= case.get("expectedMax", 1)
        except Exception as exc:
            row["errorType"] = type(exc).__name__
        rows.append(row)
        args.output.write_text(json.dumps({"schemaVersion": 1, "passed": len(rows) == len(cases) and all(r.get("controlPassed") is True for r in rows), "agentInvoked": True, "rows": rows, "calls": calls}, indent=2, allow_nan=False) + "\n")
    if any(row.get("controlPassed") is not True for row in rows):
        raise SystemExit("Judge execution or independent controls failed; failures retained")

asyncio.run(main())
