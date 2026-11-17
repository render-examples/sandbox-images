import {createDeepAgent,LocalShellBackend} from 'deepagents';
import {ChatOpenAI} from '@langchain/openai';
import {ChatAnthropic} from '@langchain/anthropic';
import {FakeListChatModel} from '@langchain/core/utils/testing';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export async function offlineCheck(){
 const agent=createDeepAgent({model:new FakeListChatModel({responses:['offline framework check']}),subagents:[],systemPrompt:'Return a short response.'});
 await agent.invoke({messages:[{role:'user',content:'Verify the graph can execute with a scripted model.'}]},{recursionLimit:40});
 return {framework:'LangChain Deep Agents',modelInvoked:false};
}
export async function runAgent(dir:string,provider:string,model:string){
 if(provider!=='openai'&&provider!=='anthropic'&&provider!=='openrouter')throw Error('Provider must be openai, anthropic or openrouter'); const keyName={openai:'OPENAI_API_KEY',anthropic:'ANTHROPIC_API_KEY',openrouter:'OPENROUTER_API_KEY'}[provider];if(!keyName||!process.env[keyName])throw Error('Missing selected provider credential');
 const chat=provider==='openai'?new ChatOpenAI({model,maxTokens:4096,maxRetries:0,timeout:60000}):provider==='anthropic'?new ChatAnthropic({model,maxTokens:4096,maxRetries:0}):provider==='openrouter'?new ChatOpenAI({model,maxTokens:4096,apiKey:process.env.OPENROUTER_API_KEY,configuration:{baseURL:'https://openrouter.ai/api/v1'},maxRetries:0,timeout:60000}):null;
 if(!chat)throw Error('Provider must be openai, anthropic or openrouter');
 const backend=new LocalShellBackend({rootDir:dir,virtualMode:true,timeout:15,maxOutputBytes:65536,inheritEnv:false,env:{PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',HOME:dir}});
 await backend.initialize();
 const agent=createDeepAgent({model:chat,backend,subagents:[],systemPrompt:'Complete the local task by changing files. Work only in the task directory. Do not install dependencies. Use files and execute tools. Never change tests.'});
 const result=await agent.invoke({messages:[{role:'user',content:readFileSync(join(dir,'TASK.md'),'utf8')}]},{recursionLimit:60,signal:AbortSignal.timeout(180000)});
 await backend.close();
 const actualModels=[...new Set(result.messages.map(m=>{const meta:unknown=m.response_metadata;if(!meta||typeof meta!=='object')return null;return 'model_name' in meta?meta.model_name:'model' in meta?meta.model:null;}).filter((m):m is string=>typeof m==='string'))];
 return {provider,model,actualModels,modelInvoked:true,messages:result.messages.length};
}
