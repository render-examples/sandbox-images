import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {readFileSync, appendFileSync} from 'node:fs';
import {join} from 'node:path';
const server=new McpServer({name:'prepared-invoice',version:'1.0.0'});
server.registerTool('invoice_total',{description:'Read the prepared invoice and return its exact integer-cent total.',inputSchema:{}},async()=>{
 const invoice=JSON.parse(readFileSync(join(process.cwd(),'invoice.json'),'utf8'));
 const totalCents=invoice.lines.reduce((sum,line)=>{
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||!Number.isSafeInteger(line.unitCents)||line.unitCents<0)throw new Error('Invalid invoice line');
  return sum+line.quantity*line.unitCents;
 },0);
 if(!Number.isSafeInteger(totalCents))throw new Error('Unsafe invoice total');
 const result={id:invoice.id,currency:invoice.currency,totalCents};
 if(process.env.MCP_RECORD_CALLS==='1')appendFileSync('mcp-calls.jsonl',JSON.stringify(result)+'\n',{mode:0o600});
 return {content:[{type:'text',text:JSON.stringify(result)}]};
});
await server.connect(new StdioServerTransport());
