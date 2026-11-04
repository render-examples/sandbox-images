import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
const children = new Set();
function killGroup(pid) {
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
async function execute(command, args, options) {
  let child;
  try {
    return await new Promise((resolve, reject) => {
      child = execFile(
        command,
        args,
        { ...options, detached: true },
        (error, stdout, stderr) =>
          error ? reject(error) : resolve({ stdout, stderr }),
      );
      children.add(child.pid);
    });
  } finally {
    if (child?.pid) {
      children.delete(child.pid);
      killGroup(child.pid);
    }
  }
}
const checkNames = [
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
const stats = Object.fromEntries(
  ["typescript", "python"].map((name) => [
    name,
    { requests: {}, deliveries: 0, duplicates: 0, conflicts: 0 },
  ]),
);
const ledger = new Map();
const server = createServer(async (req, res) => {
  try {
    const [, client, path, ...rest] = (req.url ?? "").split("/");
    if (!Object.hasOwn(stats, client) || rest.length) {
      res.writeHead(404);
      res.end("{}");
      return;
    }
    const state = stats[client];
    state.requests[path] = (state.requests[path] ?? 0) + 1;
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (path === "flaky") {
      send(
        state.requests[path] < 3 ? 503 : 200,
        state.requests[path] < 3 ? { error: "busy" } : { ok: true },
      );
      return;
    }
    if (path === "always-busy") {
      send(503, { error: "busy" });
      return;
    }
    if (path === "forbidden") {
      send(401, { error: "forbidden" });
      return;
    }
    if (path === "invalid") {
      send(200, { accepted: "yes" });
      return;
    }
    if (path === "slow") {
      return;
    }
    if (path === "webhook" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) {
          send(413, { error: "too_large" });
          return;
        }
      }
      const input = JSON.parse(body);
      if (
        Object.keys(input).sort().join(",") !== "amount,eventId" ||
        input.eventId !== "evt-1" ||
        !Number.isSafeInteger(input.amount) ||
        input.amount < 0 ||
        req.headers["idempotency-key"] !== "evt-1"
      ) {
        send(400, { error: "invalid_request" });
        return;
      }
      const key = client + ":evt-1";
      const prior = ledger.get(key);
      if (prior !== undefined && prior !== input.amount) {
        state.conflicts++;
        send(409, { error: "idempotency_conflict" });
        return;
      }
      const duplicate = prior !== undefined;
      if (duplicate) state.duplicates++;
      else {
        state.deliveries++;
        ledger.set(key, input.amount);
      }
      send(duplicate ? 200 : 201, {
        accepted: true,
        eventId: "evt-1",
        amount: input.amount,
        duplicate,
      });
      return;
    }
    send(404, { error: "not_found" });
  } catch {
    if (!res.headersSent)
      res.writeHead(400, { "content-type": "application/json" });
    res.end('{"error":"invalid_request"}');
  }
});
// Terminating the orchestrator also closes sockets and all client/server descendants.
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    for (const pid of children) killGroup(pid);
    server.closeAllConnections();
    server.close();
    process.exit(signal === "SIGTERM" ? 143 : 130);
  });
const expectedRequests = {
  flaky: 3,
  "always-busy": 3,
  forbidden: 1,
  invalid: 1,
  slow: 1,
  webhook: 3,
};
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(address.address, "127.0.0.1");
  const base = "http://127.0.0.1:" + address.port;
  const clients = [];
  for (const [command, args, name] of [
    ["node", ["dist/client.js", base], "typescript"],
    ["python3", ["client.py", base], "python"],
  ]) {
    const { stdout } = await execute(command, args, {
      cwd: process.cwd(),
      timeout: 20000,
      maxBuffer: 100000,
    });
    const result = JSON.parse(stdout);
    assert.deepEqual(result, {
      client: name,
      checks: checkNames,
      mcpTotalCents: 3250,
    });
    clients.push(result);
    assert.deepEqual(stats[name], {
      requests: expectedRequests,
      deliveries: 1,
      duplicates: 1,
      conflicts: 1,
    });
  }
  assert.deepEqual(Object.fromEntries(ledger), {
    "typescript:evt-1": 3250,
    "python:evt-1": 3250,
  });
  console.log(
    JSON.stringify({
      summary: {
        clients: 2,
        checksPassed: 24,
        mcpTotalCents: 3250,
        httpRequests: 24,
        deliveries: 2,
        duplicates: 2,
        conflicts: 2,
        timeouts: 2,
      },
      clients,
      server: stats,
    }),
  );
} finally {
  server.closeAllConnections();
  if (server.listening)
    await new Promise((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
}
