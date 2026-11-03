import assert from "node:assert/strict";
import test from "node:test";
import { parseOptions } from "../analytics-workbench.ts";

const valid = ["--workspace", "tea-example", "--group", "sbg-example", "--plan", "starter",
  "--image", `ghcr.io/render-examples/sandbox-python-analysis@sha256:${"a".repeat(64)}`];

test("live runner requires explicit scope, plan and a digest before any resources", () => {
  assert.throws(() => parseOptions([]), /workspace/);
  assert.throws(() => parseOptions(valid.filter((_, i) => i !== 2 && i !== 3)), /group/);
  assert.throws(() => parseOptions(valid.filter((_, i) => i !== 4 && i !== 5)), /plan/);
  assert.throws(() => parseOptions([...valid.slice(0, -1), "ghcr.io/example/image:latest"]), /digest/);
  assert.throws(() => parseOptions([...valid.slice(0, -1), "ghcr.io/example/image@sha256:abc"]), /digest/);
});

test("retaining a group snapshot is opt-in and help requires no credentials", () => {
  assert.equal(parseOptions(valid)?.keepSnapshot, false);
  assert.equal(parseOptions([...valid, "--keep-snapshot"])?.keepSnapshot, true);
  assert.equal(parseOptions(["--help"]), null);
});
