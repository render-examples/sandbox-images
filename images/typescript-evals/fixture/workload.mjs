import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ExactMatch, JSONDiff, Levenshtein } from "autoevals";
import { z } from "zod";
const json = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const traceSchema = z
  .array(
    z
      .object({
        id: z.string().min(1),
        tool: z.enum(["retrieve", "format"]),
        arguments: z.record(z.string(), z.unknown()),
        result: z.record(z.string(), z.unknown()),
      })
      .strict(),
  )
  .length(2);
const expectedTrace = [
  {
    id: "call-1",
    tool: "retrieve",
    arguments: { query: "snapshot" },
    result: { documentId: "doc-1" },
  },
  {
    id: "call-2",
    tool: "format",
    arguments: { documentId: "doc-1" },
    result: {
      answer: "Restore files, then restart processes.",
      citations: ["doc-1"],
    },
  },
];
const traceSummary = {
  cases: 3,
  accepted: 1,
  rejected: 2,
  negativeControls: 2,
  providerCalls: 0,
};
async function prepareTraces(inputDir) {
  const wrong = structuredClone(expectedTrace);
  wrong[1].tool = "delete";
  const missing = structuredClone(expectedTrace);
  missing[1].result.citations = [];
  await json(join(inputDir, "traces.json"), [
    { id: "valid", trace: expectedTrace, shouldPass: true },
    { id: "unsafe-tool", trace: wrong, shouldPass: false },
    { id: "missing-citation", trace: missing, shouldPass: false },
  ]);
  await json(join(inputDir, "expected.json"), expectedTrace);
}
async function scoreTraces(inputDir) {
  const expected = await read(join(inputDir, "expected.json"));
  return Promise.all(
    (await read(join(inputDir, "traces.json"))).map(async (item) => {
      const schemaValid = traceSchema.safeParse(item.trace).success;
      const exact = await ExactMatch({ output: item.trace, expected });
      const diff = await JSONDiff({ output: item.trace, expected });
      const ids = item.trace.map((t) => t.id);
      const ordered =
        JSON.stringify(item.trace.map((t) => t.tool)) ===
        JSON.stringify(["retrieve", "format"]);
      const unique = new Set(ids).size === ids.length;
      const accepted = schemaValid && ordered && unique && exact.score === 1;
      assert.equal(accepted, item.shouldPass);
      assert.ok(diff.score >= 0 && diff.score <= 1);
      return {
        id: item.id,
        schemaValid,
        ordered,
        unique,
        exactScore: exact.score,
        jsonScore: diff.score,
        accepted,
      };
    }),
  );
}
async function verifyTraces({ inputDir, outputDir }) {
  const scored = await read(join(outputDir, "scores.json"));
  assert.deepEqual(scored, await scoreTraces(inputDir));
  assert.equal(scored[0].exactScore, 1);
  assert.equal(scored[1].schemaValid, false);
  assert.equal(scored[2].accepted, false);
  return {
    cases: scored.length,
    accepted: scored.filter((s) => s.accepted).length,
    rejected: scored.filter((s) => !s.accepted).length,
    negativeControls: 2,
    providerCalls: 0,
  };
}
const retrievalSummary = {
  cases: 3,
  perfect: 1,
  negativeControls: 2,
  meanPrecisionAt2: 0.5,
  meanRecallAt2: 0.5,
  providerCalls: 0,
};
async function prepareRetrieval(inputDir) {
  await json(join(inputDir, "cases.json"), [
    {
      id: "good",
      expected: ["doc-1", "doc-2"],
      retrieved: ["doc-1", "doc-2"],
      answer: "Use explicit source citations.",
    },
    {
      id: "partial",
      expected: ["doc-1", "doc-2"],
      retrieved: ["doc-1", "noise"],
      answer: "Use source citations.",
    },
    {
      id: "wrong",
      expected: ["doc-1", "doc-2"],
      retrieved: ["noise", "other"],
      answer: "No evidence.",
    },
  ]);
  await json(join(inputDir, "rubric.json"), {
    k: 2,
    expectedAnswer: "Use explicit source citations.",
  });
}
async function scoreRetrieval(inputDir) {
  const rubric = await read(join(inputDir, "rubric.json"));
  return Promise.all(
    (await read(join(inputDir, "cases.json"))).map(async (item) => {
      assert.equal(new Set(item.retrieved).size, item.retrieved.length);
      const hits = item.retrieved
        .slice(0, rubric.k)
        .filter((id) => item.expected.includes(id)).length;
      const exact = await ExactMatch({
        output: item.retrieved,
        expected: item.expected,
      });
      const edit = await Levenshtein({
        output: item.answer,
        expected: rubric.expectedAnswer,
      });
      const rank = item.retrieved.findIndex((id) => item.expected.includes(id));
      return {
        id: item.id,
        precision: hits / rubric.k,
        recall: hits / item.expected.length,
        mrr: rank < 0 ? 0 : 1 / (rank + 1),
        exactScore: exact.score,
        answerEditSimilarity: edit.score,
      };
    }),
  );
}
async function verifyRetrieval({ inputDir, outputDir }) {
  const scored = await read(join(outputDir, "scores.json"));
  assert.deepEqual(scored, await scoreRetrieval(inputDir));
  assert.deepEqual(
    scored.map((x) => x.precision),
    [1, 0.5, 0],
  );
  assert.deepEqual(
    scored.map((x) => x.recall),
    [1, 0.5, 0],
  );
  assert.deepEqual(
    scored.map((x) => x.exactScore),
    [1, 0, 0],
  );
  assert.equal(scored[0].answerEditSimilarity, 1);
  assert.ok(scored[2].answerEditSimilarity < scored[0].answerEditSimilarity);
  return {
    cases: scored.length,
    perfect: scored.filter((x) => x.precision === 1 && x.recall === 1).length,
    negativeControls: 2,
    meanPrecisionAt2:
      scored.reduce((n, x) => n + x.precision, 0) / scored.length,
    meanRecallAt2: scored.reduce((n, x) => n + x.recall, 0) / scored.length,
    providerCalls: 0,
  };
}
export const scenarios = {
  "tool-trace-evaluation": {
    expectedSummary: traceSummary,
    artifacts: ["scores.json"],
    prepare: prepareTraces,
    async run(ctx) {
      await json(
        join(ctx.outputDir, "scores.json"),
        await scoreTraces(ctx.inputDir),
      );
      return verifyTraces(ctx);
    },
    verify: verifyTraces,
  },
  "retrieval-evaluation": {
    expectedSummary: retrievalSummary,
    artifacts: ["scores.json"],
    prepare: prepareRetrieval,
    async run(ctx) {
      await json(
        join(ctx.outputDir, "scores.json"),
        await scoreRetrieval(ctx.inputDir),
      );
      return verifyRetrieval(ctx);
    },
    verify: verifyRetrieval,
  },
};
