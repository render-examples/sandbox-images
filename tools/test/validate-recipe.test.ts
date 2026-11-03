import assert from "node:assert/strict";
import test from "node:test";
import { parseOptions, validateRecipeManifest, verifySummary, validateRecipeRoot, capturePreparedSnapshot } from "../validate-recipe.ts";

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


test("a recipe root cannot be a symlink even with a trailing slash", async () => {
  const { mkdtemp, mkdir, symlink, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const directory = await mkdtemp(tmpdir() + "/recipe-root-");
  try {
    await mkdir(directory + "/real");
    await symlink(directory + "/real", directory + "/linked");
    await assert.doesNotReject(validateRecipeRoot(pathToFileURL(directory + "/real/")));
    await assert.rejects(validateRecipeRoot(pathToFileURL(directory + "/linked/")), /real directory/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("capture preserves the unsolved task and finishes before source mutation", async () => {
  const source = { code: "broken fixture", outputs: [] as string[] };
  let requested = false;
  let available = false;
  const snapshot = await capturePreparedSnapshot({
    assertOutputsAbsent: async () => { assert.deepEqual(source.outputs, []); },
    capture: async () => { requested = true; return { id: "snapshot", state: null as typeof source | null }; },
    waitUntilAvailable: async (captured) => {
      assert.equal(requested, true);
      // Snapshot contents are finalized asynchronously, not at create response.
      await Promise.resolve();
      captured.state = structuredClone(source);
      available = true;
    },
    analyze: async () => {
      assert.equal(available, true);
      source.code = "fixed fixture";
      source.outputs.push("change.patch");
    },
    verify: async () => { assert.equal(source.code, "fixed fixture"); },
  });
  assert.deepEqual(snapshot.state, { code: "broken fixture", outputs: [] });
  assert.deepEqual(source.outputs, ["change.patch"]);
});

test("dirty preparation and failed capture prevent source execution", async () => {
  for (const failAt of ["outputs", "capture"]) {
    let captured = false;
    let analyzed = false;
    await assert.rejects(capturePreparedSnapshot({
      assertOutputsAbsent: async () => { if (failAt === "outputs") throw new Error("Unexpected prepared output"); },
      capture: async () => { captured = true; return "snapshot"; },
      waitUntilAvailable: async () => { throw new Error("Capture failed"); },
      analyze: async () => { analyzed = true; },
      verify: async () => { throw new Error("Must not verify"); },
    }), failAt === "outputs" ? /Unexpected prepared output/ : /Capture failed/);
    assert.equal(captured, failAt === "capture");
    assert.equal(analyzed, false);
  }
});
