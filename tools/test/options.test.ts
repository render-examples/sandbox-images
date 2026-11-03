import assert from "node:assert/strict";
import test from "node:test";
import { parseOptions, registryCredentials, safeError } from "../analytics-workbench.ts";

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


test("private import requires a complete credential pair before any resources", () => {
  assert.equal(registryCredentials({}), undefined);
  assert.throws(() => registryCredentials({ GHCR_USERNAME: "example" }), /both/);
  assert.throws(() => registryCredentials({ GHCR_TOKEN: "test-token" }), /both/);
  assert.throws(() => registryCredentials({ GHCR_USERNAME: " ", GHCR_TOKEN: "test-token" }), /both/);
  assert.deepEqual(registryCredentials({ GHCR_USERNAME: "example", GHCR_TOKEN: "test-token" }),
    { username: "example", password: "test-token" });
});

test("errors redact both host credentials before they reach evidence or logs", () => {
  const env = { RENDER_API_KEY: "test-render-secret", GHCR_TOKEN: "test-ghcr-secret" };
  const message = safeError(new Error("test-render-secret test-ghcr-secret https://example.com/?token=other"), env);
  assert.equal(message, "Error: [redacted] [redacted] [URL redacted]");
});
