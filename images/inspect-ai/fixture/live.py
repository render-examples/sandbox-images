"""Run the same frozen samples through an explicitly selected real Inspect provider."""
import argparse
import json
from pathlib import Path
from inspect_ai import Task, eval
from inspect_ai.dataset import Sample
from inspect_ai.scorer import match
from inspect_ai.solver import generate

parser = argparse.ArgumentParser()
parser.add_argument("samples", type=Path)
parser.add_argument("--model", required=True, help="openai/<model>, anthropic/<model>, or another installed Inspect provider")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
if args.model.startswith("mockllm/"):
    parser.error("Live evaluation requires a real provider")
args.output.mkdir(parents=True, exist_ok=False)
cases = json.loads(args.samples.read_text())
task = Task(dataset=[Sample(id=c["id"], input=c["prompt"], target=c["target"]) for c in cases],
            solver=generate(), scorer=match(location="exact"), message_limit=4)
logs = eval(task, model=args.model, log_dir=str(args.output), max_samples=1, max_connections=1,
            max_tokens=128, max_retries=1, time_limit=120, display="plain")
receipt = {"schemaVersion": 1, "passed": False, "agentInvoked": True, "requestedModel": args.model, "statuses": [log.status for log in logs],
           "samples": [{"id": sample.id, "output": sample.output.completion,
                        "model": sample.output.model, "usage": sample.output.usage.model_dump() if sample.output.usage else None,
                        "scores": {k: v.model_dump() for k, v in (sample.scores or {}).items()},
                        "error": sample.error.model_dump() if sample.error else None}
                       for log in logs for sample in (log.samples or [])]}
by_id = {row["id"]: row for row in receipt["samples"]}
receipt["passed"] = (len(logs) == 1 and logs[0].status == "success"
    and len(receipt["samples"]) == len(cases) == len(by_id)
    and all(case["id"] in by_id and not by_id[case["id"]]["error"]
        and by_id[case["id"]]["output"].strip() == case["target"]
        and by_id[case["id"]]["scores"]
        and all(score["value"] == "C" for score in by_id[case["id"]]["scores"].values()) for case in cases))
(args.output / "receipt.json").write_text(json.dumps(receipt, indent=2, default=str) + "\n")
if not receipt["passed"]:
    raise SystemExit("Evaluation incomplete or answers failed independent checks; retained logs and failures")
