import type {ScenarioMap} from "/opt/render/runtime/contracts.ts";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateText, Output, stepCountIs, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
const read = (d:string, n:string):unknown => JSON.parse(readFileSync(join(d, n), "utf8"));
const write = (d:string, n:string, x:unknown) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
type MockResult=Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;
const response = (content:MockResult["content"], reason:MockResult["finishReason"]["unified"] = "stop"):MockResult => ({
  content,
  finishReason: { unified: reason, raw: reason },
  usage,
  warnings: [],
});
const loop = {
  modelSteps: 2,
  toolCalls: 1,
  totalCents: 3250,
  toolResultObserved: true,
};
const structured = {
  validObjects: 1,
  schemaFailures: 1,
  malformedFailures: 1,
  totalCents: 3250,
};
const invoiceSchema = z.object({
  customer: z.string().min(1),
  totalCents: z.number().int().nonnegative(),
  currency: z.enum(["USD", "EUR"]),
});
const inputSchema=z.object({customer:z.string(),currency:z.enum(["USD","EUR"]),lines:z.array(z.object({quantity:z.number().int().positive(),unitCents:z.number().int().nonnegative()}))});
const traceSchema=z.object({steps:z.array(z.object({finishReason:z.string(),toolCalls:z.array(z.unknown()),toolResults:z.array(z.unknown())})),executions:z.array(z.object({toolCallId:z.string(),totalCents:z.number()})),toolResultObserved:z.boolean()});
const failureSchema=z.array(z.object({kind:z.string(),rejected:z.boolean(),name:z.string()}));
async function prepare(d:string) {
  write(d, "invoice.json", {
    customer: "Acme",
    currency: "USD",
    lines: [
      { quantity: 2, unitCents: 1250 },
      { quantity: 1, unitCents: 750 },
    ],
  });
}
export const scenarios: ScenarioMap = {
  "agent-tool-loop": {
    expectedSummary: loop,
    artifacts: ["trace.json", "answer.json"],
    prepare,
    async run({ inputDir, outputDir }) {
      const invoice = inputSchema.parse(read(inputDir, "invoice.json"));
      const executions:{toolCallId:string;totalCents:number}[] = [];
      let calls = 0,
        observed = false;
      const model = new MockLanguageModelV4({
        doGenerate: async (options) => {
          calls++;
          if (calls === 1)
            return response(
              [
                {
                  type: "tool-call",
                  toolCallId: "invoice-1",
                  toolName: "calculateInvoice",
                  input: JSON.stringify({ lines: invoice.lines }),
                },
              ],
              "tool-calls",
            );
          const result = options.prompt
            .flatMap((m) => m.role === "tool" ? m.content : [])
            .find((x) => x.type === "tool-result");
          assert.ok(result);
          assert.equal(result.toolCallId, "invoice-1");
          assert.equal(result.toolName, "calculateInvoice");
          observed = JSON.stringify(result.output).includes("3250");
          assert.ok(observed);
          return response([
            { type: "text", text: "Invoice total: 3250 USD cents." },
          ]);
        },
      });
      const result = await generateText({
        model,
        prompt: "Calculate the invoice from the provided task.",
        tools: {
          calculateInvoice: tool({
            description: "Sum integer minor-unit invoice lines.",
            inputSchema: z.object({
              lines: z.array(
                z.object({
                  quantity: z.number().int().positive(),
                  unitCents: z.number().int().nonnegative(),
                }),
              ),
            }),
            execute: async ({ lines }) => {
              const totalCents = lines.reduce(
                (n, x) => n + x.quantity * x.unitCents,
                0,
              );
              executions.push({ toolCallId: "invoice-1", totalCents });
              return { totalCents };
            },
          }),
        },
        stopWhen: stepCountIs(3),
        maxRetries: 0,
      });
      assert.equal(result.steps.length, 2);
      write(outputDir, "trace.json", {
        steps: result.steps.map((s) => ({
          finishReason: s.finishReason,
          toolCalls: s.toolCalls.map((t) => ({
            toolName: t.toolName,
            toolCallId: t.toolCallId,
            input: t.input,
          })),
          toolResults: s.toolResults.map((t) => ({
            toolName: t.toolName,
            toolCallId: t.toolCallId,
            output: t.output,
          })),
        })),
        executions,
        toolResultObserved: observed,
      });
      write(outputDir, "answer.json", {
        text: result.text,
        totalCents: executions[0]!.totalCents,
      });
      return {
        modelSteps: calls,
        toolCalls: executions.length,
        totalCents: executions[0]!.totalCents,
        toolResultObserved: observed,
      };
    },
    async verify({ inputDir, outputDir }) {
      const input = inputSchema.parse(read(inputDir, "invoice.json")),
        trace = traceSchema.parse(read(outputDir, "trace.json")),
        answer = read(outputDir, "answer.json");
      const total = input.lines.reduce(
        (n, x) => n + x.quantity * x.unitCents,
        0,
      );
      assert.equal(trace.steps.length, 2);
      assert.equal(trace.steps[0]!.finishReason, "tool-calls");
      assert.deepEqual(trace.steps[0]!.toolCalls, [
        {
          toolName: "calculateInvoice",
          toolCallId: "invoice-1",
          input: { lines: input.lines },
        },
      ]);
      assert.deepEqual(trace.steps[0]!.toolResults, [
        {
          toolName: "calculateInvoice",
          toolCallId: "invoice-1",
          output: { totalCents: total },
        },
      ]);
      assert.deepEqual(trace.executions, [
        { toolCallId: "invoice-1", totalCents: total },
      ]);
      assert.equal(trace.toolResultObserved, true);
      assert.deepEqual(answer, {
        text: "Invoice total: 3250 USD cents.",
        totalCents: total,
      });
      return {
        modelSteps: trace.steps.length,
        toolCalls: trace.executions.length,
        totalCents: total,
        toolResultObserved: trace.toolResultObserved,
      };
    },
  },
  "agent-structured-output": {
    expectedSummary: structured,
    artifacts: ["invoice.json", "validation.json"],
    prepare,
    async run({ inputDir, outputDir }) {
      const input = inputSchema.parse(read(inputDir, "invoice.json"));
      const expected = {
        customer: input.customer,
        totalCents: input.lines.reduce(
          (n, x) => n + x.quantity * x.unitCents,
          0,
        ),
        currency: input.currency,
      };
      async function generate(text:string) {
        return generateText({
          model: new MockLanguageModelV4({
            doGenerate: async () => response([{ type: "text", text }]),
          }),
          output: Output.object({ schema: invoiceSchema }),
          prompt: "Extract the synthetic invoice.",
          maxRetries: 0,
        });
      }
      const result = await generate(JSON.stringify(expected));
      const failures:{kind:string;rejected:boolean;name:string}[] = [];
      for (const [kind, text] of [
        ["schema", JSON.stringify({ ...expected, totalCents: "3250" })],
        ["malformed", "{ definitely not json"],
      ] as const) {
        try {
          await generate(text);
          throw new Error("Invalid output was accepted");
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.notEqual(error.message, "Invalid output was accepted");
          failures.push({ kind, rejected: true, name: error.name });
        }
      }
      invoiceSchema.parse(result.output);
      write(outputDir, "invoice.json", result.output);
      write(outputDir, "validation.json", failures);
      return {
        validObjects: 1,
        schemaFailures: failures.filter((x) => x.kind === "schema").length,
        malformedFailures: failures.filter((x) => x.kind === "malformed")
          .length,
        totalCents: result.output.totalCents,
      };
    },
    async verify({ inputDir, outputDir }) {
      const input = inputSchema.parse(read(inputDir, "invoice.json"));
      const result = invoiceSchema.parse(read(outputDir, "invoice.json"));
      assert.deepEqual(result, {
        customer: input.customer,
        totalCents: input.lines.reduce(
          (n, x) => n + x.quantity * x.unitCents,
          0,
        ),
        currency: input.currency,
      });
      const failures = failureSchema.parse(read(outputDir, "validation.json"));
      assert.equal(failures.length, 2);
      assert.deepEqual(
        failures.map((x) => ({ kind: x.kind, rejected: x.rejected })),
        [
          { kind: "schema", rejected: true },
          { kind: "malformed", rejected: true },
        ],
      );
      for (const failure of failures)
        assert.match(
          failure.name,
          /NoObjectGenerated|TypeValidation|JSONParse/,
        );
      return {
        validObjects: 1,
        schemaFailures: failures.filter((x) => x.kind === "schema").length,
        malformedFailures: failures.filter((x) => x.kind === "malformed")
          .length,
        totalCents: result.totalCents,
      };
    },
  },
};
