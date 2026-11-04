import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
const root = "/workspace/mcp-api-test-world";
const project = join(root, "project");
const fixture = "/opt/render/fixtures/mcp-api-test-world";
const output = "/workspace/output";
const inputs = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "src/server.ts",
  "src/client.ts",
  "client.py",
  "workload.mjs",
];
const artifacts = ["summary.json", "clients.json", "server.json"];
const expected = {
  clients: 2,
  checksPassed: 24,
  mcpTotalCents: 3250,
  httpRequests: 24,
  deliveries: 2,
  duplicates: 2,
  conflicts: 2,
  timeouts: 2,
};
const checks = [
  "mcp-initialize",
  "mcp-list",
  "mcp-call",
  "mcp-invalid-input",
  "mcp-unknown-tool",
  "retry-success",
  "retry-budget",
  "nonretryable",
  "response-schema",
  "timeout",
  "webhook-dedup",
  "webhook-conflict",
];
const expectedClients = ["typescript", "python"].map((client) => ({
  client,
  checks,
  mcpTotalCents: 3250,
}));
const expectedServer = Object.fromEntries(
  ["typescript", "python"].map((name) => [
    name,
    {
      requests: {
        flaky: 3,
        "always-busy": 3,
        forbidden: 1,
        invalid: 1,
        slow: 1,
        webhook: 3,
      },
      deliveries: 1,
      duplicates: 1,
      conflicts: 1,
    },
  ]),
);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const write = (path, value) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
function baseline() {
  return {
    fixture: "mcp-api-test-world-v1",
    expectedSummary: expected,
    inputSha256: Object.fromEntries(
      inputs.map((n) => [n, hash(readFileSync(join(fixture, n)))]),
    ),
  };
}
function checkBaseline() {
  const b = baseline();
  assert.deepEqual(json(join(root, "baseline.json")), b);
  for (const n of inputs)
    assert.equal(
      hash(readFileSync(join(project, n))),
      b.inputSha256[n],
      `Changed prepared input: ${n}`,
    );
}
function run() {
  rmSync(join(project, "dist"), { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], { cwd: project, timeout: 30000 });
  const result = JSON.parse(
    execFileSync("node", ["workload.mjs"], {
      cwd: project,
      encoding: "utf8",
      timeout: 45000,
    }),
  );
  assert.deepEqual(result, {
    summary: expected,
    clients: expectedClients,
    server: expectedServer,
  });
  return result;
}
function prepare() {
  assert.equal(
    existsSync(project) || existsSync(join(root, "baseline.json")),
    false,
    "Refusing to replace prepared state",
  );
  mkdirSync(root, { recursive: true });
  cpSync(fixture, project, { recursive: true });
  rmSync(join(project, "dist"), { recursive: true, force: true });
  write(join(root, "baseline.json"), baseline());
  checkBaseline();
}
function analyze() {
  rmSync(join(output, "verification.json"), { force: true });
  checkBaseline();
  const result = run();
  mkdirSync(output, { recursive: true });
  for (const name of ["summary", "clients", "server"])
    write(join(output, name + ".json"), result[name]);
  verify(false);
}
function verify(checkReceipt = true) {
  const receiptPath = join(output, "verification.json");
  const previous =
    checkReceipt && existsSync(receiptPath) ? read(receiptPath) : undefined;
  rmSync(receiptPath, { force: true });
  checkBaseline();
  assert.deepEqual(json(join(output, "summary.json")), expected);
  assert.deepEqual(json(join(output, "clients.json")), expectedClients);
  assert.deepEqual(json(join(output, "server.json")), expectedServer);
  const receipt = {
    passed: true,
    summary: expected,
    outputSha256: Object.fromEntries(
      artifacts.map((n) => [n, hash(readFileSync(join(output, n)))]),
    ),
  };
  if (checkReceipt) {
    assert.ok(previous, "Missing successful workload receipt");
    assert.deepEqual(JSON.parse(previous), receipt);
    run();
  }
  write(receiptPath, receipt);
}
function test() {
  verify();
  for (const [path, action] of [
    [join(root, "baseline.json"), "analyze"],
    [join(project, "src/server.ts"), "analyze"],
    [join(project, "client.py"), "verify"],
    [join(output, "summary.json"), "verify"],
    [join(output, "clients.json"), "verify"],
    [join(output, "server.json"), "verify"],
  ]) {
    const bytes = readFileSync(path);
    try {
      writeFileSync(path, "{}\n");
      assert.throws(
        () => (action === "analyze" ? analyze() : verify()),
        `Corruption accepted: ${path}`,
      );
      assert.equal(existsSync(join(output, "verification.json")), false);
    } finally {
      writeFileSync(path, bytes);
    }
    verify(false);
  }
  for (const n of [...artifacts, "verification.json"]) rmSync(join(output, n));
  analyze();
  verify();
  console.log("Six corruption probes and output regeneration passed");
}
const commands = { prepare, analyze, verify, test };
assert.ok(
  Object.hasOwn(commands, process.argv[2]),
  "Expected prepare|analyze|verify|test",
);
commands[process.argv[2]]();
console.log("mcp-api-test-world " + process.argv[2] + ": passed");
