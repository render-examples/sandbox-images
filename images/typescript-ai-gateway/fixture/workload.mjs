import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";
import OpenAI from "openai";
const read = (d, n) => JSON.parse(readFileSync(join(d, n), "utf8"));
const write = (d, n, x) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
const completion = (model, text) => ({
  id: "chatcmpl-fixture",
  object: "chat.completion",
  created: 1,
  model,
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});
async function listen(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: "http://127.0.0.1:" + server.address().port };
}
async function close(...items) {
  for (const { server } of items) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
async function body(req) {
  let s = "";
  for await (const chunk of req) {
    s += chunk;
    assert.ok(s.length < 50000);
  }
  return JSON.parse(s);
}
function send(res, status, data, extra = {}) {
  res.writeHead(status, { "content-type": "application/json", ...extra });
  res.end(JSON.stringify(data));
}
const routeSummary = {
  requests: 2,
  primaryCalls: 2,
  fallbackCalls: 1,
  failovers: 1,
};
const retrySummary = {
  retryAttempts: 3,
  nonretryableAttempts: 1,
  deadlineAborted: true,
  totalTokens: 15,
};
async function prepare(d) {
  write(d, "routes.json", {
    balanced: ["primary", "fallback"],
    fast: ["primary"],
  });
  write(d, "prompt.json", {
    messages: [{ role: "user", content: "Return a synthetic greeting." }],
  });
}
export const scenarios = {
  "ai-routing-workbench": {
    expectedSummary: routeSummary,
    artifacts: ["responses.json", "routing.json"],
    prepare,
    async run({ inputDir, outputDir }) {
      const routes = read(inputDir, "routes.json"),
        prompt = read(inputDir, "prompt.json");
      const upstream = [];
      const primary = await listen(async (req, res) => {
        const b = await body(req);
        upstream.push({ provider: "primary", model: b.model });
        if (b.model === "balanced")
          send(res, 503, {
            error: { message: "Synthetic overload", type: "server_error" },
          });
        else send(res, 200, completion("primary-model", "primary answer"));
      });
      const fallback = await listen(async (req, res) => {
        const b = await body(req);
        upstream.push({ provider: "fallback", model: b.model });
        send(res, 200, completion("fallback-model", "fallback answer"));
      });
      const trace = [];
      const gateway = await listen(async (req, res) => {
        try {
          const b = await body(req);
          const plan = routes[b.model];
          if (!plan) {
            send(res, 400, { error: { message: "Unknown route" } });
            return;
          }
          for (const [index, name] of plan.entries()) {
            const base = name === "primary" ? primary.url : fallback.url;
            const reply = await fetch(base + "/v1/chat/completions", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(b),
              signal: AbortSignal.timeout(2000),
            });
            trace.push({
              route: b.model,
              provider: name,
              status: reply.status,
            });
            if (reply.ok || index === plan.length - 1) {
              send(res, reply.status, await reply.json());
              return;
            }
          }
        } catch {
          send(res, 502, { error: { message: "Upstream failed" } });
        }
      });
      try {
        const client = new OpenAI({
          apiKey: "synthetic-fixture-only",
          baseURL: gateway.url + "/v1",
          maxRetries: 0,
          timeout: 3000,
        });
        const responses = [];
        for (const model of ["balanced", "fast"]) {
          const result = await client.chat.completions.create({
            model,
            ...prompt,
          });
          responses.push({
            route: model,
            model: result.model,
            text: result.choices[0].message.content,
          });
        }
        write(outputDir, "responses.json", responses);
        write(outputDir, "routing.json", { trace, upstream });
        return {
          requests: responses.length,
          primaryCalls: upstream.filter((x) => x.provider === "primary").length,
          fallbackCalls: upstream.filter((x) => x.provider === "fallback")
            .length,
          failovers: trace.filter((x) => x.status === 503).length,
        };
      } finally {
        await close(gateway, primary, fallback);
      }
    },
    async verify({ outputDir }) {
      const responses = read(outputDir, "responses.json"),
        r = read(outputDir, "routing.json");
      assert.deepEqual(responses, [
        { route: "balanced", model: "fallback-model", text: "fallback answer" },
        { route: "fast", model: "primary-model", text: "primary answer" },
      ]);
      assert.deepEqual(r.trace, [
        { route: "balanced", provider: "primary", status: 503 },
        { route: "balanced", provider: "fallback", status: 200 },
        { route: "fast", provider: "primary", status: 200 },
      ]);
      assert.deepEqual(r.upstream, [
        { provider: "primary", model: "balanced" },
        { provider: "fallback", model: "balanced" },
        { provider: "primary", model: "fast" },
      ]);
      return {
        requests: responses.length,
        primaryCalls: r.upstream.filter((x) => x.provider === "primary").length,
        fallbackCalls: r.upstream.filter((x) => x.provider === "fallback")
          .length,
        failovers: r.trace.filter((x) => x.status === 503).length,
      };
    },
  },
  "ai-retry-budget-lab": {
    expectedSummary: retrySummary,
    artifacts: ["retry.json", "response.json"],
    prepare,
    async run({ inputDir, outputDir }) {
      const prompt = read(inputDir, "prompt.json");
      const counts = { transient: 0, forbidden: 0, hanging: 0 };
      const provider = await listen(async (req, res) => {
        const b = await body(req);
        counts[b.model]++;
        if (b.model === "hanging") return;
        if (b.model === "forbidden") {
          send(res, 403, {
            error: { message: "Not permitted", type: "permission_error" },
          });
          return;
        }
        if (counts.transient < 3) {
          send(
            res,
            429,
            { error: { message: "Synthetic throttling", type: "rate_limit" } },
            { "retry-after-ms": "1" },
          );
          return;
        }
        send(res, 200, completion("fixture-model", "recovered answer"));
      });
      try {
        const client = new OpenAI({
          apiKey: "synthetic-fixture-only",
          baseURL: provider.url + "/v1",
          maxRetries: 2,
          timeout: 2000,
        });
        const result = await client.chat.completions.create({
          model: "transient",
          ...prompt,
        });
        let forbidden = false;
        try {
          await client.chat.completions.create({
            model: "forbidden",
            ...prompt,
          });
        } catch (e) {
          forbidden = e.status === 403;
        }
        assert.ok(forbidden);
        let aborted = false;
        try {
          await client.chat.completions.create(
            { model: "hanging", ...prompt },
            { maxRetries: 0, signal: AbortSignal.timeout(50) },
          );
        } catch (e) {
          aborted = /abort|timeout/i.test(e.name + " " + e.message);
        }
        assert.ok(aborted);
        write(outputDir, "retry.json", { counts, forbidden, aborted });
        write(outputDir, "response.json", {
          text: result.choices[0].message.content,
          totalTokens: result.usage.total_tokens,
        });
        return {
          retryAttempts: counts.transient,
          nonretryableAttempts: counts.forbidden,
          deadlineAborted: aborted,
          totalTokens: result.usage.total_tokens,
        };
      } finally {
        await close(provider);
      }
    },
    async verify({ outputDir }) {
      const r = read(outputDir, "retry.json"),
        response = read(outputDir, "response.json");
      assert.deepEqual(r, {
        counts: { transient: 3, forbidden: 1, hanging: 1 },
        forbidden: true,
        aborted: true,
      });
      assert.deepEqual(response, { text: "recovered answer", totalTokens: 15 });
      return {
        retryAttempts: r.counts.transient,
        nonretryableAttempts: r.counts.forbidden,
        deadlineAborted: r.aborted,
        totalTokens: response.totalTokens,
      };
    },
  },
};
