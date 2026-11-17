import type {RecipeContext,Scenario,ScenarioMap} from '/opt/render/runtime/contracts.ts';
import {resultFrom} from './invoice.ts';
import {writeFileSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {checkMcp} from './mcp-check.ts';
import {createAgentScenarios} from '/opt/render/runtime/coding-agent-workload.ts';
const base=createAgentScenarios({"slug": "goose", "name": "Goose", "cli": {"command": "goose", "version": "1.59.2", "versionArgs": ["--version"], "helpArgs": ["run", "--help"], "requiredHelp": ["--model"]}, "launch": {"args": ["run", "--no-session", "--with-builtin", "developer", "--max-turns", "20", "--output-format", "json", "--text", "{prompt}"], "prompt": "argument", "extraArgsAfter": 1}, "instructionsFile": "AGENTS.md"});
const mcpAgent=createAgentScenarios({"slug": "goose", "name": "Goose", "cli": {"command": "goose", "version": "1.59.2", "versionArgs": ["--version"], "helpArgs": ["run", "--help"], "requiredHelp": ["--model"]}, "launch": {"args": ["run", "--no-session", "--with-builtin", "developer", "--max-turns", "20", "--output-format", "json", "--with-extension", "node /opt/render/fixtures/goose/mcp-server.ts", "--system", "For the MCP task, call invoice_total first and write invoice-answer.json with that exact result before repairing code.", "--text", "{prompt}"], "prompt": "argument", "extraArgsAfter": 1}, "instructionsFile": "AGENTS.md"});
const mcpBase=mcpAgent["goose-python-repo"];assert.ok(mcpBase);
const mcpScenario:Scenario<object>={...mcpBase,
 expectedSummary:{...mcpBase.expectedSummary,mcpTotalCents:3250},
 artifacts:[...mcpBase.artifacts,"mcp-result.json"],
 async prepare(inputDir:string){await mcpBase.prepare(inputDir);const invoice={id:"demo-001",currency:"USD",lines:[{quantity:2,unitCents:1250},{quantity:1,unitCents:750}]};for(const dir of [inputDir,join(dirname(inputDir),"project")])writeFileSync(join(dir,"invoice.json"),JSON.stringify(invoice));const prompt=join(dirname(inputDir),"project/PROMPT.md");writeFileSync(prompt,readFileSync(prompt,"utf8")+"\nAlso call the invoice_total MCP tool and save its exact JSON result in invoice-answer.json.\n");},
 async run(context:RecipeContext){const summary=await mcpBase.run(context);const result=await checkMcp(context.inputDir);writeFileSync(join(context.outputDir,"mcp-result.json"),JSON.stringify(result));return {...summary,mcpTotalCents:result.totalCents};},
 async verify(context:RecipeContext){const summary=await mcpBase.verify(context);const raw:unknown=JSON.parse(readFileSync(join(context.outputDir,"mcp-result.json"),"utf8"));const result=resultFrom(raw);assert.deepEqual(result,{id:"demo-001",currency:"USD",totalCents:3250});return {...summary,mcpTotalCents:result.totalCents};}
};
const repair=base["goose-typescript-repo"];assert.ok(repair);
export const scenarios:ScenarioMap={
"goose-repo-repair":repair,
"goose-mcp-workspace":mcpScenario
};
