import {writeFileSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {checkMcp} from './mcp-check.mjs';
import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.mjs';
const base=createAgentScenarios({"slug": "goose", "name": "Goose", "cli": {"command": "goose", "version": "1.59.2", "versionArgs": ["--version"], "helpArgs": ["run", "--help"], "requiredHelp": ["--model"]}, "launch": {"args": ["run", "--no-session", "--with-builtin", "developer", "--max-turns", "20", "--output-format", "json", "--text", "{prompt}"], "prompt": "argument", "extraArgsAfter": 1}, "instructionsFile": "AGENTS.md"});
const mcpAgent=createAgentScenarios({"slug": "goose", "name": "Goose", "cli": {"command": "goose", "version": "1.59.2", "versionArgs": ["--version"], "helpArgs": ["run", "--help"], "requiredHelp": ["--model"]}, "launch": {"args": ["run", "--no-session", "--with-builtin", "developer", "--max-turns", "20", "--output-format", "json", "--with-extension", "node /opt/render/fixtures/goose/mcp-server.mjs", "--system", "For the MCP task, call invoice_total first and write invoice-answer.json with that exact result before repairing code.", "--text", "{prompt}"], "prompt": "argument", "extraArgsAfter": 1}, "instructionsFile": "AGENTS.md"});
const mcpBase=mcpAgent["goose-python-repo"];
const mcpScenario={...mcpBase,
 expectedSummary:{...mcpBase.expectedSummary,mcpTotalCents:3250},
 artifacts:[...mcpBase.artifacts,"mcp-result.json"],
 prepare(inputDir){mcpBase.prepare(inputDir);const invoice={id:"demo-001",currency:"USD",lines:[{quantity:2,unitCents:1250},{quantity:1,unitCents:750}]};for(const dir of [inputDir,join(dirname(inputDir),"project")])writeFileSync(join(dir,"invoice.json"),JSON.stringify(invoice));const prompt=join(dirname(inputDir),"project/PROMPT.md");writeFileSync(prompt,readFileSync(prompt,"utf8")+"\nAlso call the invoice_total MCP tool and save its exact JSON result in invoice-answer.json.\n");},
 async run(context){const summary=mcpBase.run(context);const result=await checkMcp(context.inputDir);writeFileSync(join(context.outputDir,"mcp-result.json"),JSON.stringify(result));return {...summary,mcpTotalCents:result.totalCents};},
 async verify(context){const summary=mcpBase.verify(context);const result=JSON.parse(readFileSync(join(context.outputDir,"mcp-result.json"),"utf8"));assert.deepEqual(result,{id:"demo-001",currency:"USD",totalCents:3250});return {...summary,mcpTotalCents:result.totalCents};}
};
export const scenarios={
"goose-repo-repair":base["goose-typescript-repo"],
"goose-mcp-workspace":mcpScenario
};
