import assert from "node:assert/strict";
import test from "node:test";
import { parseOptions, validateRecipeManifest, verifySummary } from "../validate-recipe.ts";

const valid = () => ({
  kind: "snapshot-recipe", recipe: { kind: "filesystem", imageSlug: "coding-workspace" },
  outputs: ["/workspace/output/result.json", "/workspace/output/verification.json"],
  execution: { recipeCommand: "bash recipe.sh", files: ["recipe.sh", "fixture.sql"], expectedSummary: { rows: 3 } },
});

test("native recipes require explicit safe uploads before resources are created", () => {
  assert.doesNotThrow(() => validateRecipeManifest(valid()));
  for (const path of ["../secret", "/etc/passwd", "nested/../../secret", "nested//file", "./recipe.sh"]) {
    const manifest = valid(); manifest.execution.files.push(path);
    assert.throws(() => validateRecipeManifest(manifest), /safe execution.files/);
  }
  const duplicate = valid(); duplicate.execution.files.push("recipe.sh");
  assert.throws(() => validateRecipeManifest(duplicate), /Duplicate/);
});

test("generic runner rejects undeclared outputs and unsupported snapshot modes", () => {
  const runtime = valid(); runtime.recipe.kind = "runtime";
  assert.throws(() => validateRecipeManifest(runtime), /filesystem/);
  const outside = valid(); outside.outputs.push("/workspace/output/../secret.json");
  assert.throws(() => validateRecipeManifest(outside), /flat/);
  const empty = valid(); empty.execution.expectedSummary = {} as { rows: number };
  assert.throws(() => validateRecipeManifest(empty), /expectedSummary/);
});

test("passed flag alone cannot satisfy expected workload answers", () => {
  assert.doesNotThrow(() => verifySummary({ rows: 3, extra: true }, { rows: 3 }));
  assert.throws(() => verifySummary({ rows: 2 }, { rows: 3 }), /rows/);
  assert.throws(() => verifySummary({}, { rows: 3 }), /rows/);
  assert.throws(() => verifySummary(null, { rows: 3 }), /summary/);
});

test("recipe selector rejects traversal and help needs no credentials", () => {
  assert.equal(parseOptions(["--help"]), null);
  assert.throws(() => parseOptions(["--recipe", "../secret"]), /manifest slug/);
});
