import {Agent} from '@mastra/core/agent';
import {createTool} from '@mastra/core/tools';
import {z} from 'zod';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {filePath,boundedShell} from './task.ts';
function build(dir:string,model:string){
 const readTask=createTool({id:'read_task',description:'Read one local task file.',inputSchema:z.object({name:z.enum(['TASK.md','pricing.py','invoice.json','answer.json'])}),execute:async({name})=>readFileSync(filePath(dir,name),'utf8')});
 const writeTask=createTool({id:'write_task',description:'Write pricing.py or answer.json to complete the task.',inputSchema:z.object({name:z.enum(['pricing.py','answer.json']),content:z.string().max(10000)}),execute:async({name,content})=>{writeFileSync(filePath(dir,name),content);return 'written';}});
 const shell=createTool({id:'shell',description:'Run a local shell command in this sandbox task directory. Commands have a 15 second timeout.',inputSchema:z.object({command:z.string().max(2000)}),execute:async({command})=>boundedShell(dir,command)});
 return new Agent({id:'sandbox-agent',name:'Sandbox agent',instructions:'Complete the local task by using readTask, writeTask and shell. Write files; a textual answer is insufficient. Do not install dependencies or modify test harnesses.',model,tools:{readTask,writeTask,shell}});
}
export async function offlineCheck(){const agent=build(process.cwd(),'openai/offline-uninvoked');if(!agent)throw Error('Agent construction failed');return {framework:'Mastra',modelInvoked:false};}
export async function runAgent(dir:string,provider:string,model:string){
 if(provider!=='openai'&&provider!=='anthropic'&&provider!=='openrouter')throw Error('Provider must be openai, anthropic or openrouter'); const keyName={openai:'OPENAI_API_KEY',anthropic:'ANTHROPIC_API_KEY',openrouter:'OPENROUTER_API_KEY'}[provider];if(!keyName||!process.env[keyName])throw Error('Missing selected provider credential');if(!['openai','anthropic','openrouter'].includes(provider))throw Error('Provider must be openai, anthropic or openrouter');const result=await build(dir,`${provider}/${model}`).generate(readFileSync(join(dir,'TASK.md'),'utf8'),{maxSteps:12,modelSettings:{maxOutputTokens:4096},abortSignal:AbortSignal.timeout(180000)});return {provider,model,actualModel:result.response.modelId??null,usage:result.totalUsage,modelInvoked:true,steps:result.steps.length};}
