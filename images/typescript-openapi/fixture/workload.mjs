import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import SwaggerParser from "@apidevtools/swagger-parser";
import openapiTS, { astToString } from "openapi-typescript";
import Ajv from "ajv";
const read = (d, n) => JSON.parse(readFileSync(join(d, n), "utf8"));
const write = (d, n, x) =>
  writeFileSync(join(d, n), JSON.stringify(x, null, 2) + "\n");
const spec = {
  openapi: "3.0.3",
  info: { title: "Synthetic invoice tools", version: "1.0.0" },
  paths: {
    "/invoices/{id}": {
      get: {
        operationId: "getInvoice",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", pattern: "^inv-[0-9]+$" },
          },
        ],
        responses: {
          200: {
            description: "Invoice",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
        },
      },
      delete: {
        operationId: "deleteInvoice",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 204: { description: "Deleted" } },
      },
    },
  },
  components: {
    schemas: {
      Invoice: {
        type: "object",
        additionalProperties: false,
        required: ["id", "totalCents"],
        properties: {
          id: { type: "string" },
          totalCents: { type: "integer", minimum: 0 },
        },
      },
    },
  },
};
const contracts = {
  operations: 2,
  allowedTools: 1,
  validCalls: 1,
  rejectedCalls: 3,
};
const client = {
  generatedTypes: true,
  typeErrorsRejected: 1,
  requests: 1,
  totalCents: 3250,
};
let imports = 0;
async function prepare(d) {
  write(d, "openapi.json", spec);
  write(d, "policy.json", { allowedMethods: ["get"] });
}
export const scenarios = {
  "openapi-tool-contracts": {
    expectedSummary: contracts,
    artifacts: ["tools.json", "validation.json"],
    prepare,
    async run({ inputDir, outputDir }) {
      const source = read(inputDir, "openapi.json");
      await SwaggerParser.validate(structuredClone(source));
      const policy = read(inputDir, "policy.json");
      const tools = [];
      let operations = 0;
      for (const [path, methods] of Object.entries(source.paths))
        for (const [method, op] of Object.entries(methods)) {
          operations++;
          if (!policy.allowedMethods.includes(method)) continue;
          const properties = Object.fromEntries(
            op.parameters.map((p) => [p.name, p.schema]),
          );
          tools.push({
            type: "function",
            function: {
              name: op.operationId,
              parameters: {
                type: "object",
                properties,
                required: op.parameters
                  .filter((p) => p.required)
                  .map((p) => p.name),
                additionalProperties: false,
              },
            },
            method,
            path,
          });
        }
      const validate = new Ajv().compile(tools[0].function.parameters);
      const candidates = [
        { id: "inv-42" },
        {},
        { id: "arbitrary" },
        { id: "inv-42", admin: true },
      ];
      const results = candidates.map((input) => ({
        input,
        valid: validate(input),
        errors: structuredClone(validate.errors),
      }));
      write(outputDir, "tools.json", tools);
      write(outputDir, "validation.json", results);
      return {
        operations,
        allowedTools: tools.length,
        validCalls: results.filter((x) => x.valid).length,
        rejectedCalls: results.filter((x) => !x.valid).length,
      };
    },
    async verify({ inputDir, outputDir }) {
      const tools = read(outputDir, "tools.json"),
        results = read(outputDir, "validation.json");
      assert.deepEqual(tools, [
        {
          type: "function",
          function: {
            name: "getInvoice",
            parameters: {
              type: "object",
              properties: { id: { type: "string", pattern: "^inv-[0-9]+$" } },
              required: ["id"],
              additionalProperties: false,
            },
          },
          method: "get",
          path: "/invoices/{id}",
        },
      ]);
      const validator = new Ajv().compile(tools[0].function.parameters);
      assert.equal(results.length, 4);
      assert.deepEqual(
        results.map((r) => r.valid),
        [true, false, false, false],
      );
      for (const r of results) assert.equal(validator(r.input), r.valid);
      return {
        operations: Object.keys(
          read(inputDir, "openapi.json").paths["/invoices/{id}"],
        ).length,
        allowedTools: tools.length,
        validCalls: results.filter((x) => x.valid).length,
        rejectedCalls: results.filter((x) => !x.valid).length,
      };
    },
  },
  "openapi-tool-client": {
    expectedSummary: client,
    artifacts: ["schema-types.ts", "client.ts", "response.json"],
    prepare,
    async run({ inputDir, workDir, outputDir }) {
      const source = read(inputDir, "openapi.json");
      await SwaggerParser.validate(structuredClone(source));
      const types = astToString(await openapiTS(source));
      writeFileSync(join(workDir, "schema-types.ts"), types);
      writeFileSync(join(outputDir, "schema-types.ts"), types);
      const code = `import type {components} from './schema-types.js';\ntype Invoice = components['schemas']['Invoice'];\nexport async function getInvoice(base: string, id: string): Promise<Invoice> {\n const response = await fetch(base + '/invoices/' + encodeURIComponent(id));\n if (!response.ok) throw new Error('HTTP ' + response.status);\n return await response.json() as Invoice;\n}\n`;
      writeFileSync(join(workDir, "client.ts"), code);
      writeFileSync(join(outputDir, "client.ts"), code);
      const args = [
        "--strict",
        "--target",
        "ES2022",
        "--module",
        "ES2022",
        "--moduleResolution",
        "bundler",
        "--skipLibCheck",
        "--outDir",
        "dist",
      ];
      execFileSync("tsc", [...args, "client.ts"], {
        cwd: workDir,
        timeout: 20000,
      });
      writeFileSync(
        join(workDir, "invalid.ts"),
        "import type {components} from './schema-types.js'; const bad: components['schemas']['Invoice'] = {id:'x',totalCents:'wrong'};\n",
      );
      let rejected = 0;
      try {
        execFileSync("tsc", [...args, "--noEmit", "invalid.ts"], {
          cwd: workDir,
          timeout: 20000,
          stdio: "pipe",
        });
      } catch (error) {
        assert.equal(error.status, 2);
        assert.match(String(error.stdout), /TS2322/);
        rejected++;
      }
      assert.equal(rejected, 1);
      const requests = [];
      const server = createServer((req, res) => {
        requests.push(req.url);
        res.writeHead(req.url === "/invoices/inv-42" ? 200 : 404, {
          "content-type": "application/json",
        });
        res.end(JSON.stringify({ id: "inv-42", totalCents: 3250 }));
      });
      try {
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const api = await import(
          pathToFileURL(join(workDir, "dist/client.js")).href +
            "?run=" +
            imports++
        );
        const result = await api.getInvoice(
          "http://127.0.0.1:" + server.address().port,
          "inv-42",
        );
        const validate = new Ajv().compile(source.components.schemas.Invoice);
        assert.equal(validate(result), true);
        write(outputDir, "response.json", {
          result,
          requests,
          typeErrorsRejected: rejected,
        });
        return {
          generatedTypes: types.includes("Invoice:"),
          typeErrorsRejected: rejected,
          requests: requests.length,
          totalCents: result.totalCents,
        };
      } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
    },
    async verify({ outputDir }) {
      const types = readFileSync(join(outputDir, "schema-types.ts"), "utf8");
      assert.match(types, /Invoice:/);
      assert.match(types, /totalCents: number/);
      assert.match(
        readFileSync(join(outputDir, "client.ts"), "utf8"),
        /Promise<Invoice>/,
      );
      const r = read(outputDir, "response.json");
      assert.deepEqual(r, {
        result: { id: "inv-42", totalCents: 3250 },
        requests: ["/invoices/inv-42"],
        typeErrorsRejected: 1,
      });
      return {
        generatedTypes: types.includes("Invoice:"),
        typeErrorsRejected: r.typeErrorsRejected,
        requests: r.requests.length,
        totalCents: r.result.totalCents,
      };
    },
  },
};
