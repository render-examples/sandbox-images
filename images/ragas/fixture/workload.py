"""Ragas non-LLM retrieval metrics checked against an independent exact-match oracle."""
import asyncio
import json
import math
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("RAGAS_DO_NOT_TRACK", "true")
from ragas import SingleTurnSample
from ragas.metrics import NonLLMContextPrecisionWithReference, NonLLMContextRecall, ExactMatch

EXPECTED = {"cases": 3, "accepted": 1, "rejected": 2, "providerCalls": 0, "judgeCalls": 0}
REFERENCE = "Sandbox filesystem snapshots preserve files."
IRRELEVANT = "The invoice total is seventy euros."


def prepare(path: Path, scenario: str) -> None:
    cases = [
        {"id": "clean", "question": "What does the snapshot preserve?", "retrieved": [REFERENCE], "reference": [REFERENCE]},
        {"id": "noise-first", "question": "What does the snapshot preserve?", "retrieved": [IRRELEVANT, REFERENCE], "reference": [REFERENCE]},
        {"id": "missing", "question": "What does the snapshot preserve?", "retrieved": [IRRELEVANT], "reference": [REFERENCE]},
    ]
    if scenario == "ragas-rag-quality":
        for case, response in zip(cases, ["files", "memory", "unknown"], strict=True):
            case["response"] = response
            case["answer_reference"] = "files"
    (path / "cases.json").write_text(json.dumps(cases, indent=2) + "\n")
    (path / "judge-cases.json").write_text(json.dumps([{ "id": "grounded", "question": "What does a filesystem snapshot preserve?", "response": "It preserves files.", "retrieved": [REFERENCE], "expectedMin": 0.8, "expectedMax": 1.0}, {"id": "unsupported", "question": "What does a filesystem snapshot preserve?", "response": "It preserves every running process.", "retrieved": [REFERENCE], "expectedMin": 0.0, "expectedMax": 0.2}], indent=2) + "\n")
    (path / "experiment.json").write_text(json.dumps({"scenario": scenario, "threshold": 0.99, "comparison": "frozen retrieval outputs; no retrieval model is invoked"}) + "\n")


def oracle(case: dict[str, Any]) -> tuple[float, float]:
    relevant = [text in case["reference"] for text in case["retrieved"]]
    positives = sum(relevant)
    precision = sum(sum(relevant[:i + 1]) / (i + 1) for i, valid in enumerate(relevant) if valid) / positives if positives else 0.0
    recall = sum(text in case["retrieved"] for text in case["reference"]) / len(case["reference"])
    return precision, recall


async def measure(cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    precision = NonLLMContextPrecisionWithReference(threshold=0.99)
    recall = NonLLMContextRecall(threshold=0.99)
    rows = []
    for case in cases:
        sample = SingleTurnSample(user_input=case["question"], retrieved_contexts=case["retrieved"], reference_contexts=case["reference"])
        row = {"id": case["id"], "precision": await precision.single_turn_ascore(sample),
               "recall": await recall.single_turn_ascore(sample)}
        if "response" in case:
            row["answer_exact_match"] = await ExactMatch().single_turn_ascore(SingleTurnSample(response=case["response"], reference=case["answer_reference"]))
        rows.append(row)
    return rows


def run(context: dict[str, Path]) -> dict[str, Any]:
    cases = json.loads((context["inputDir"] / "cases.json").read_text())
    rows = asyncio.run(measure(cases))
    (context["outputDir"] / "scores.json").write_text(json.dumps(rows, indent=2, allow_nan=False) + "\n")
    return verify(context)


def verify(context: dict[str, Path]) -> dict[str, Any]:
    cases = json.loads((context["inputDir"] / "cases.json").read_text())
    rows = json.loads((context["outputDir"] / "scores.json").read_text())
    assert len(rows) == len(cases) == 3
    by_id = {row["id"]: row for row in rows}
    assert len(by_id) == 3
    for case in cases:
        expected_precision, expected_recall = oracle(case)
        row = by_id[case["id"]]
        assert math.isclose(row["precision"], expected_precision, abs_tol=1e-8)
        assert math.isclose(row["recall"], expected_recall, abs_tol=1e-8)
        if "response" in case:
            assert row["answer_exact_match"] == float(case["response"] == case["answer_reference"])
    accepted = sum(row["precision"] > .99 and row["recall"] > .99 and row.get("answer_exact_match", 1) == 1 for row in rows)
    result = {"cases": len(rows), "accepted": accepted, "rejected": len(rows) - accepted, "providerCalls": 0, "judgeCalls": 0}
    assert result == EXPECTED
    return result


SCENARIOS = {slug: {"expectedSummary": EXPECTED, "artifacts": ["scores.json"],
                   "prepare": lambda path, slug=slug: prepare(path, slug), "run": run, "verify": verify}
             for slug in ["ragas-rag-quality", "ragas-retrieval-ablations"]}
