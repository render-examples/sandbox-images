"""DeepEval exact tool/answer metrics with independent Python oracles and no model calls."""
import json
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")
from deepeval.metrics import ExactMatchMetric, ToolCorrectnessMetric
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, ToolCall, ToolCallParams


class NoNetworkModel(DeepEvalBaseLLM):
    """A fail-closed adapter, not a fake judge; any generation makes acceptance fail."""
    def load_model(self) -> "NoNetworkModel":
        return self
    def generate(self, *args: Any, **kwargs: Any) -> str:
        raise AssertionError("Deterministic tool metric unexpectedly attempted model generation")
    async def a_generate(self, *args: Any, **kwargs: Any) -> str:
        return self.generate(*args, **kwargs)
    def get_model_name(self) -> str:
        return "generation-forbidden"


EXPECTED = {"cases": 3, "accepted": 1, "rejected": 2, "providerCalls": 0, "judgeCalls": 0}
TOOL = {"name": "read_file", "input_parameters": {"path": "notes.txt"}, "output": "42"}


def prepare(path: Path, kind: str) -> None:
    cases = ([
        {"id": "exact", "actual": [TOOL], "expected": [TOOL]},
        {"id": "wrong-path", "actual": [{**TOOL, "input_parameters": {"path": "secret.txt"}}], "expected": [TOOL]},
        {"id": "extra-tool", "actual": [TOOL, {"name": "delete_file", "input_parameters": {"path": "notes.txt"}, "output": "ok"}], "expected": [TOOL]},
    ] if kind == "tools" else [
        {"id": "exact", "actual": "total=42", "expected": "total=42"},
        {"id": "wrong-number", "actual": "total=43", "expected": "total=42"},
        {"id": "missing", "actual": "unknown", "expected": "total=42"},
    ])
    (path / "cases.json").write_text(json.dumps({"kind": kind, "cases": cases}, indent=2) + "\n")
    (path / "judge-cases.json").write_text(json.dumps([{ "id": "correct", "question": "What is 20 + 22?", "response": "42", "reference": "42", "expectedMin": 0.8, "expectedMax": 1.0}, {"id": "incorrect", "question": "What is 20 + 22?", "response": "43", "reference": "42", "expectedMin": 0.0, "expectedMax": 0.2}], indent=2) + "\n")


def run(context: dict[str, Path]) -> dict[str, Any]:
    data = json.loads((context["inputDir"] / "cases.json").read_text())
    rows = []
    for case in data["cases"]:
        if data["kind"] == "tools":
            metric = ToolCorrectnessMetric(model=NoNetworkModel(), eval_mode="llm", async_mode=False,
                include_reason=False, strict_mode=True, should_exact_match=True, should_consider_ordering=True,
                evaluation_params=[ToolCallParams.INPUT_PARAMETERS, ToolCallParams.OUTPUT])
            sample = LLMTestCase(input="Read notes.txt", actual_output="Done",
                tools_called=[ToolCall(**tool) for tool in case["actual"]],
                expected_tools=[ToolCall(**tool) for tool in case["expected"]])
        else:
            metric = ExactMatchMetric()
            sample = LLMTestCase(input="Return the total", actual_output=case["actual"], expected_output=case["expected"])
        score = metric.measure(sample, _show_indicator=False)
        rows.append({"id": case["id"], "score": score, "success": metric.is_successful(), "metric": metric.__class__.__name__})
    (context["outputDir"] / "scores.json").write_text(json.dumps(rows, indent=2, allow_nan=False) + "\n")
    return verify(context)


def verify(context: dict[str, Path]) -> dict[str, Any]:
    data = json.loads((context["inputDir"] / "cases.json").read_text())
    rows = json.loads((context["outputDir"] / "scores.json").read_text())
    assert len(rows) == len(data["cases"]) == 3
    by_id = {row["id"]: row for row in rows}
    assert len(by_id) == 3
    for case in data["cases"]:
        expected = case["actual"] == case["expected"]
        row = by_id[case["id"]]
        assert row["score"] == float(expected) and row["success"] is expected
        assert row["metric"] == ("ToolCorrectnessMetric" if data["kind"] == "tools" else "ExactMatchMetric")
    accepted = sum(row["success"] for row in rows)
    result = {"cases": len(rows), "accepted": accepted, "rejected": len(rows) - accepted, "providerCalls": 0, "judgeCalls": 0}
    assert result == EXPECTED
    return result


SCENARIOS = {slug: {"expectedSummary": EXPECTED, "artifacts": ["scores.json"],
                   "prepare": lambda path, kind=kind: prepare(path, kind), "run": run, "verify": verify}
             for slug, kind in [("deepeval-tool-correctness", "tools"), ("deepeval-answer-regression", "answers")]}
