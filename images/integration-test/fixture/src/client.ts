import assert from "node:assert/strict";
import { setTimeout as pause } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
const checks: string[] = [];
const client = new Client({ name: "typescript-fixture", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/server.js"],
  stderr: "pipe",
});
try {
  await client.connect(transport);
  assert.ok(client.getServerCapabilities()?.tools);
  checks.push("mcp-initialize");
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((t) => t.name),
    ["sum_prices"],
  );
  checks.push("mcp-list");
  const result = await client.callTool(
    {
      name: "sum_prices",
      arguments: {
        lines: [
          { quantity: 2, unitCents: 1250 },
          { quantity: 1, unitCents: 750 },
        ],
      },
    },
    undefined,
    { timeout: 2000 },
  );
  assert.deepEqual(result.structuredContent, { totalCents: 3250 });
  assert.notEqual(result.isError, true);
  checks.push("mcp-call");
  const invalid = await client.callTool(
    {
      name: "sum_prices",
      arguments: { lines: [{ quantity: -1, unitCents: 1 }] },
    },
    undefined,
    { timeout: 2000 },
  );
  assert.equal(invalid.isError, true);
  checks.push("mcp-invalid-input");
  assert.equal(
    (
      await client.callTool({ name: "missing", arguments: {} }, undefined, {
        timeout: 2000,
      })
    ).isError,
    true,
  );
  checks.push("mcp-unknown-tool");
} finally {
  await client.close();
  await transport.close();
}
const base = process.argv[2];
assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
const receiptSchema = z
  .object({
    accepted: z.literal(true),
    eventId: z.literal("evt-1"),
    amount: z.literal(3250),
    duplicate: z.boolean(),
  })
  .strict();
async function request(path: string, init: RequestInit = {}, timeout = 1000) {
  return fetch(base + "/typescript" + path, {
    ...init,
    signal: AbortSignal.timeout(timeout),
  });
}
async function retry(path: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await request(path);
    if (![429, 503].includes(r.status) || attempt === 3) return { r, attempt };
    await pause(5 * attempt);
  }
  throw new Error("unreachable");
}
let r = await retry("/flaky");
assert.equal(r.attempt, 3);
assert.equal(r.r.status, 200);
assert.deepEqual(await r.r.json(), { ok: true });
checks.push("retry-success");
r = await retry("/always-busy");
assert.equal(r.attempt, 3);
assert.equal(r.r.status, 503);
checks.push("retry-budget");
r = await retry("/forbidden");
assert.equal(r.attempt, 1);
assert.equal(r.r.status, 401);
checks.push("nonretryable");
const malformed = await request("/invalid");
const malformedBody = await malformed.json();
assert.deepEqual(malformedBody, { accepted: "yes" });
assert.throws(() => receiptSchema.parse(malformedBody));
checks.push("response-schema");
await assert.rejects(
  () => request("/slow", {}, 100),
  (e) => e instanceof Error && e.name === "TimeoutError",
);
checks.push("timeout");
const post = (amount: number) =>
  request("/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "evt-1" },
    body: JSON.stringify({ eventId: "evt-1", amount }),
  });
let delivered = await post(3250);
assert.equal(delivered.status, 201);
assert.deepEqual(receiptSchema.parse(await delivered.json()), {
  accepted: true,
  eventId: "evt-1",
  amount: 3250,
  duplicate: false,
});
delivered = await post(3250);
assert.equal(delivered.status, 200);
assert.deepEqual(receiptSchema.parse(await delivered.json()), {
  accepted: true,
  eventId: "evt-1",
  amount: 3250,
  duplicate: true,
});
checks.push("webhook-dedup");
delivered = await post(999);
assert.equal(delivered.status, 409);
assert.deepEqual(await delivered.json(), { error: "idempotency_conflict" });
checks.push("webhook-conflict");
console.log(
  JSON.stringify({ client: "typescript", checks, mcpTotalCents: 3250 }),
);
