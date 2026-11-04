import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = mkdtempSync("/workspace/integration-smoke-");
try {
  cpSync("/opt/render/fixtures/mcp-api-test-world", root, { recursive: true });
  assert.match(
    execFileSync("tsc", ["--version"], { encoding: "utf8", timeout: 10000 }),
    /^Version 7\.0\.2/,
  );
  execFileSync("npm", ["run", "build"], { cwd: root, timeout: 30000 });
  const result = JSON.parse(
    execFileSync("node", ["workload.mjs"], {
      cwd: root,
      encoding: "utf8",
      timeout: 45000,
    }),
  );
  assert.equal(result.summary.checksPassed, 24);
  assert.equal(result.summary.deliveries, 2);
  mkdirSync("/workspace/image-smoke", { recursive: true });
  writeFileSync(
    "/workspace/image-smoke/result.json",
    JSON.stringify({ status: "passed", ...result.summary }) + "\n",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
