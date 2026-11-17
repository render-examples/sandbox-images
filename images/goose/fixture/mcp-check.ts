import {isRecord,resultFrom} from './invoice.ts';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';
export async function checkMcp(cwd:string) {
 const client=new Client({name:'independent-invoice-check',version:'1.0.0'});
 const transport=new StdioClientTransport({command:'node',args:[fileURLToPath(new URL('./mcp-server.ts',import.meta.url))],cwd,env:{PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin'}});
 try {
  await client.connect(transport);
  const tools=await client.listTools();assert.ok(tools.tools.some(t=>t.name==='invoice_total'));
  const response=await client.callTool({name:'invoice_total',arguments:{}},undefined,{timeout:10000});
  assert.equal(response.isError,undefined);
  const content:unknown=response.content;assert.ok(Array.isArray(content));const first:unknown=content[0];assert.ok(isRecord(first)&&first.type==='text'&&typeof first.text==='string');
  const raw:unknown=JSON.parse(first.text);const result=resultFrom(raw);assert.deepEqual(result,{id:'demo-001',currency:'USD',totalCents:3250});return result;
 } finally {await client.close();await transport.close();}
}
