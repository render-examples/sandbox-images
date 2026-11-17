import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {generateText, Output, stepCountIs, tool} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createAnthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';

const provider = process.env.AGENT_PROVIDER;
const modelId = process.env.AGENT_MODEL;
if (!modelId || !provider) throw new Error('Set AGENT_PROVIDER and AGENT_MODEL explicitly');
function required(name: string) { const value=process.env[name]; if(!value) throw new Error(`Set ${name}`); return value; }
const model = provider === 'google' ? createGoogleGenerativeAI({apiKey:required('GEMINI_API_KEY')})(modelId)
  : provider === 'anthropic' ? createAnthropic({apiKey:required('ANTHROPIC_API_KEY')})(modelId)
  : provider === 'openrouter' ? createOpenAI({apiKey:required('OPENROUTER_API_KEY'),baseURL:'https://openrouter.ai/api/v1'}).chat(modelId)
  : provider === 'openai' ? createOpenAI({apiKey:required('OPENAI_API_KEY')})(modelId)
  : (()=>{throw new Error('Unsupported AGENT_PROVIDER')})();
const root=resolve(process.argv[2]??'.');
const scenario=process.argv[3];
assert.ok(scenario==='agent-tool-loop'||scenario==='agent-structured-output','Supply a supported scenario');
const invoiceSchema=z.object({customer:z.string(),currency:z.enum(['USD','EUR']),lines:z.array(z.object({quantity:z.number().int().positive(),unitCents:z.number().int().nonnegative()}))});
const invoice=invoiceSchema.parse(JSON.parse(await readFile(join(root,'input/invoice.json'),'utf8')));
const expected={customer:invoice.customer,currency:invoice.currency,totalCents:invoice.lines.reduce((n,x)=>n+x.quantity*x.unitCents,0)};
const output=z.object({customer:z.string(),currency:z.enum(['USD','EUR']),totalCents:z.number().int().nonnegative()});
const executions: number[]=[];
const options={model,maxRetries:0,maxOutputTokens:2048,abortSignal:AbortSignal.timeout(90000)};
const result=scenario==='agent-tool-loop'
  ? await generateText({...options,output:Output.object({schema:output}),prompt:'Call calculateInvoice to obtain the invoice, then return its fields as JSON. Do not calculate it yourself.',tools:{calculateInvoice:tool({description:'Calculate the prepared invoice from its source lines.',inputSchema:z.object({}),execute:async()=>{executions.push(expected.totalCents);return expected;}})},stopWhen:stepCountIs(4)})
  : await generateText({...options,prompt:`Extract this invoice and calculate its total in integer cents: ${JSON.stringify(invoice)}`,output:Output.object({schema:output})});
if(scenario==='agent-tool-loop') assert.ok(executions.length>0,'Model did not execute tool');
assert.deepEqual(output.parse(result.output),expected);
const directory=join(root,'live-results'); await mkdir(directory,{recursive:true});
const receipt={schemaVersion:1,provider,requestedModel:modelId,returnedModel:result.response.modelId,scenario,agentInvoked:true,passed:true,toolExecutions:executions.length,usage:result.totalUsage,answer:result.text,expected,verifiedAt:new Date().toISOString()};
await writeFile(join(directory,`${scenario}-${provider}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify(receipt));
