// Separate process for every phase: SQLite is the only graph-state bridge.
import assert from 'node:assert/strict';
import {appendFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {Annotation,Command,END,START,StateGraph,interrupt} from '@langchain/langgraph';
import {SqliteSaver} from '@langchain/langgraph-checkpoint-sqlite';
import {z} from 'zod';
const [action,scenario,directory]=process.argv.slice(2);
const saver=SqliteSaver.fromConnString(join(directory,'checkpoint.sqlite'));
const config=id=>({configurable:{thread_id:id}});
const close=()=>{saver.db.pragma('wal_checkpoint(TRUNCATE)');saver.db.close();};
const checkpointState=Annotation.Root({value:Annotation(),completed:Annotation({reducer:(a,b)=>a.concat(b),default:()=>[]})});
function checkpointGraph(paused){
 return new StateGraph(checkpointState)
 .addNode('extract',s=>({value:s.value+2,completed:['extract']}))
 .addNode('compute',s=>({value:s.value*6,completed:['compute']}))
 .addNode('finalize',s=>({value:s.value,completed:['finalize']}))
 .addEdge(START,'extract').addEdge('extract','compute').addEdge('compute','finalize').addEdge('finalize',END)
 .compile({checkpointer:saver,...(paused?{interruptBefore:['finalize']}:{})});
}
const approvalState=Annotation.Root({action:Annotation(),status:Annotation()});
const decision=z.object({approved:z.boolean()}).strict();
function approvalGraph(){
 return new StateGraph(approvalState)
 .addNode('approval',state=>{
  const response=interrupt({action:state.action,question:'Approve synthetic local action?'},{responseSchema:decision});
  return {status:response.approved?'approved':'rejected'};
 })
 .addNode('execute',state=>{
  if(state.status==='approved')appendFileSync(join(directory,'actions.jsonl'),JSON.stringify({action:state.action})+'\n');
  return {status:state.status};
 })
 .addEdge(START,'approval').addEdge('approval','execute').addEdge('execute',END)
 .compile({checkpointer:saver});
}
let result;
try{
 if(scenario==='agent-checkpoint-workflow'){
  if(action==='prepare'){
   const graph=checkpointGraph(true);await graph.invoke({value:5,completed:[]},config('checkpoint'));
   const state=await graph.getState(config('checkpoint'));
   assert.deepEqual(state.next,['finalize']);assert.deepEqual(state.values,{value:42,completed:['extract','compute']});
   result={prepared:true};
  }else{
   const graph=checkpointGraph(false),before=await graph.getState(config('checkpoint'));
   assert.deepEqual(before.next,['finalize']);
   const value=await graph.invoke(null,config('checkpoint'));
   const persisted=await graph.getState(config('checkpoint'));
   result={before:before.values,after:value,persisted:persisted.values,next:persisted.next};
  }
 }else if(scenario==='human-approval-workflow'){
  const graph=approvalGraph();
  if(action==='prepare'){
   for(const id of ['approve','deny']){
    const state=await graph.invoke({action:id+'-local-report',status:'pending'},config(id));
    assert.equal(state.__interrupt__.length,1);
   }
   assert.ok(!existsSync(join(directory,'actions.jsonl')));result={prepared:true};
  }else{
   let invalidDecisionRejected=false;
   try{await graph.invoke(new Command({resume:{approved:'yes'}}),config('approve'));}catch(error){assert.match(String(error),/boolean|Zod|invalid/i);invalidDecisionRejected=true;}
   assert.ok(invalidDecisionRejected);assert.ok(!existsSync(join(directory,'actions.jsonl')));
   const approved=await graph.invoke(new Command({resume:{approved:true}}),config('approve'));
   const denied=await graph.invoke(new Command({resume:{approved:false}}),config('deny'));
   const actions=readFileSync(join(directory,'actions.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
   result={approved,denied,actions,invalidDecisionRejected,
    pendingAfter:[...(await graph.getState(config('approve'))).next,...(await graph.getState(config('deny'))).next]};
  }
 }else throw new Error('Unknown scenario');
}finally{close();}
console.log(JSON.stringify(result));
