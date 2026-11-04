import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { checkedExec, GuestExecError, validateImportedImage } from "../live-support.ts";
import { parseOptions as genericOptions, validateRecipeManifest } from "../validate-recipe.ts";
import { parseOptions as analyticsOptions } from "../analytics-workbench.ts";
const digest = `sha256:${"a".repeat(64)}`;
const source = `ghcr.io/render-examples/sandbox-codex@${digest}`;
const expected = { imageId: "sbb-example", group: "sbg-example", image: source };
const imported = { id: expected.imageId, sandboxGroupId: expected.group, status: "succeeded",
  sourceDigest: digest, source: { repository: "ghcr.io/render-examples", image: "sandbox-codex" } };

test("reused imports must match ID, group, complete repository, digest and readiness", () => {
  assert.doesNotThrow(() => validateImportedImage(imported, expected));
  for (const changed of [
    { id: "sbb-other" }, { sandboxGroupId: "sbg-other" }, { sourceDigest: `sha256:${"b".repeat(64)}` },
    { source: { repository: "ghcr.io/other", image: "sandbox-codex" } },
    ...["pending", "running", "failed"].map(status => ({ status })),
  ]) assert.throws(() => validateImportedImage({ ...imported, ...changed }, expected), /match|succeeded/);
});
test("both runners accept explicit reuse but still require a pinned image", () => {
  const common = ["--workspace", "tea-example", "--group", "sbg-example", "--plan", "1c-2g", "--image", source];
  for (const [parse, args] of [[analyticsOptions, common], [genericOptions, [...common, "--recipe", "codex-python-repo"]]] as const) {
    assert.equal(parse([...args, "--image-id", "sbb-example"])?.imageId, "sbb-example");
    assert.equal(parse([...args])?.imageId, undefined);
    assert.throws(() => parse([...args, "--image-id", "latest"]), /image-id/);
    assert.throws(() => parse([...args, "--image", "ghcr.io/example/image:latest", "--image-id", "sbb-example"]), /digest/);
  }
});
async function* events(values: { type: string; data?: string; exit_code?: number }[]) { yield* values; }
test("exec requires a successful terminal event and preserves redacted failure details", async () => {
  await checkedExec(events([{ type: "exit", exit_code: 0 }]), "sbx-test", "true");
  for (const terminal of [[], [{ type: "exit", exit_code: 3 }]]) {
    const env = { RENDER_API_KEY: "render-secret", GHCR_TOKEN: "ghcr-secret" };
    await assert.rejects(checkedExec(events([
      { type: "output", data: "known failure render-" }, { type: "output", data: "secret ghcr-secret https://host/?token=hidden" }, ...terminal,
    ]), "sbx-test", "command render-secret", env), (error: unknown) => {
      assert(error instanceof GuestExecError);
      assert.equal(error.diagnostic.exitCode, terminal.length ? 3 : null);
      assert.match(error.diagnostic.outputTail, /known failure/);
      assert.match(error.diagnostic.command, /\[redacted\]/);
      assert.doesNotMatch(JSON.stringify(error.diagnostic), /render-secret|ghcr-secret|token=hidden/);
      return true;
    });
  }
});
test("exec diagnostics bound output and command, and reject interrupted streams", async () => {
  await assert.rejects(checkedExec(events([{ type: "output", data: "x".repeat(30000) + " END" }]), "sbx-test", "c".repeat(5000)), (error: unknown) => {
    assert(error instanceof GuestExecError);
    assert(Buffer.byteLength(error.diagnostic.outputTail) <= 16384);
    assert(Buffer.byteLength(error.diagnostic.command) <= 4096);
    assert(error.diagnostic.outputTail.endsWith(" END"));
    return true;
  });
  async function* interrupted() { yield { type: "exit", exit_code: 0 }; throw new Error("lost render-secret"); }
  await assert.rejects(checkedExec(interrupted(), "sbx-test", "true", { RENDER_API_KEY: "render-secret" }), (error: unknown) => {
    assert(error instanceof GuestExecError);
    assert.equal(error.diagnostic.streamError, "Error: lost [redacted]");
    return true;
  });
});
test("catalog dispatch covers all recipes and preserves coding-agent evidence boundaries", async () => {
  const root = new URL("../../snapshots/", import.meta.url);
  let generic = 0, legacy = 0, codingAgents = 0;
  for (const slug of await readdir(root)) {
    const manifest = JSON.parse(await readFile(new URL(`${slug}/manifest.json`, root), "utf8"));
    if (slug === "analytics-workbench") { legacy++; continue; }
    validateRecipeManifest(manifest);
    generic++;
    if (["codex", "claude-code", "opencode", "cursor-cli", "devin-cli"].includes(manifest.recipe.imageSlug)) {
      assert.equal(manifest.execution.expectedSummary.agentInvoked, false);
      codingAgents++;
    }
  }
  assert.deepEqual({ generic, legacy, codingAgents }, { generic: 59, legacy: 1, codingAgents: 10 });
});

test("exec request failures retain the attempted command without assuming execution", async () => {
  await assert.rejects(checkedExec(Promise.reject(new Error("gateway unavailable")), "sbx-test", "bash recipe.sh prepare"), (error: unknown) => {
    assert(error instanceof GuestExecError);
    assert.equal(error.diagnostic.exitCode, null);
    assert.equal(error.diagnostic.command, "bash recipe.sh prepare");
    assert.match(error.diagnostic.streamError ?? "", /gateway unavailable/);
    return true;
  });
});
