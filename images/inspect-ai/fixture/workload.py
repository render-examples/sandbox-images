"""Run Inspect's real task/scorer pipeline; offline responses are explicitly mocked."""
import json
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("INSPECT_LOG_LEVEL", "warning")
from inspect_ai import Task, eval
from inspect_ai.dataset import Sample
from inspect_ai.model import ModelOutput, ModelUsage, get_model
from inspect_ai.scorer import match
from inspect_ai.solver import generate

EXPECTED = {"cases": 3, "accepted": 2, "rejected": 1, "providerCalls": 0, "mockModel": True}


def prepare(path: Path, kind: str) -> None:
    cases = ([
        {"id": "sum", "prompt": "Return only the result of sum([2, 3, 5]).", "target": "10", "mock": "10"},
        {"id": "empty", "prompt": "Return only the result of sum([]).", "target": "0", "mock": "0"},
        {"id": "negative", "prompt": "Return only the result of sum([-2, 5]).", "target": "3", "mock": "99"},
    ] if kind == "coding" else [
        {"id": "read", "prompt": 'Choose exactly one tool name to read a file: read_file, write_file.', "target": "read_file", "mock": "read_file"},
        {"id": "write", "prompt": 'Choose exactly one tool name to save a file: read_file, write_file.', "target": "write_file", "mock": "write_file"},
        {"id": "negative", "prompt": 'Choose exactly one tool name to read a file: read_file, delete_file.', "target": "read_file", "mock": "delete_file"},
    ])
    (path / "samples.json").write_text(json.dumps(cases, indent=2) + "\n")


def run(context: dict[str, Path]) -> dict[str, Any]:
    cases = json.loads((context["inputDir"] / "samples.json").read_text())
    responses = {case["prompt"]: case["mock"] for case in cases}
    def response(messages: Any, *_args: Any) -> ModelOutput:
        result = ModelOutput.from_content("mockllm", responses[messages[-1].text])
        result.usage = ModelUsage(input_tokens=1, output_tokens=1, total_tokens=2)
        return result
    task = Task(dataset=[Sample(id=c["id"], input=c["prompt"], target=c["target"]) for c in cases],
                solver=generate(), scorer=match(location="exact"))
    logs = eval(task, model=get_model("mockllm/model", custom_outputs=response),
                log_dir=str(context["workDir"] / "logs"), display="none", max_samples=1,
                max_connections=1, max_tokens=100, fail_on_error=True)
    assert len(logs) == 1 and logs[0].status == "success", "Inspect task failed"
    samples = logs[0].samples or []
    rows = [{"id": s.id, "output": s.output.completion,
             "score": next(iter(s.scores.values())).value} for s in samples]
    (context["outputDir"] / "scores.json").write_text(json.dumps(rows, indent=2) + "\n")
    return verify(context)


def verify(context: dict[str, Path]) -> dict[str, Any]:
    cases = json.loads((context["inputDir"] / "samples.json").read_text())
    rows = json.loads((context["outputDir"] / "scores.json").read_text())
    assert len(rows) == len(cases) == 3
    by_id = {row["id"]: row for row in rows}
    assert len(by_id) == 3
    for case in cases:
        row = by_id[case["id"]]
        assert row["output"] == case["mock"]
        assert row["score"] == ("C" if row["output"] == case["target"] else "I")
    accepted = sum(row["score"] == "C" for row in rows)
    result = {"cases": len(rows), "accepted": accepted, "rejected": len(rows) - accepted,
              "providerCalls": 0, "mockModel": True}
    assert result == EXPECTED
    return result


SCENARIOS = {
    slug: {"expectedSummary": EXPECTED, "artifacts": ["scores.json"],
           "prepare": lambda path, kind=kind: prepare(path, kind), "run": run, "verify": verify}
    for slug, kind in [("inspect-coding-samples", "coding"), ("inspect-tool-use-samples", "tools")]
}
