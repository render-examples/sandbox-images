import assert from 'node:assert/strict';
import test from 'node:test';
import {requireSuccessfulMainCheck} from './check-publication-ci.ts';
const sha='a'.repeat(40);
const run={id:10,run_number:5,run_attempt:1,head_sha:sha,head_branch:'main',event:'push',status:'completed',conclusion:'success',updated_at:'2026-11-16T12:00:00Z'};
const pages=(runs:unknown[])=>[{workflow_runs:runs}];
test('publication requires successful check.yml main push at exact SHA',()=>{
 assert.equal(requireSuccessfulMainCheck(pages([run]),sha).id,10);
 for(const value of [[],[{...run,head_sha:'b'.repeat(40)}],[{...run,head_branch:'feature'}],[{...run,event:'pull_request'}],[{...run,event:'workflow_dispatch'}]])assert.throws(()=>requireSuccessfulMainCheck(pages(value),sha),/No check.yml/);
});
test('newer run or rerun blocks an older success until the latest attempt succeeds',()=>{
 for(const conclusion of [null,'failure','cancelled','timed_out','neutral','skipped','action_required']){
  const latest={...run,id:11,run_number:6,status:conclusion===null?'queued':'completed',conclusion};
  assert.throws(()=>requireSuccessfulMainCheck(pages([run,latest]),sha),/publication is blocked/);
  assert.throws(()=>requireSuccessfulMainCheck(pages([{...run,run_attempt:2,status:latest.status,conclusion},run]),sha),/publication is blocked/);
 }
 assert.throws(()=>requireSuccessfulMainCheck(pages([{...run,status:'in_progress'}]),sha),/publication is blocked/);
 assert.throws(()=>requireSuccessfulMainCheck(pages([run,{...run,id:9,run_number:4,run_attempt:2,status:'in_progress',conclusion:null,updated_at:'2026-11-16T12:01:00Z'}]),sha),/publication is blocked/);
 assert.equal(requireSuccessfulMainCheck(pages([{...run,conclusion:'failure'},{...run,id:11,run_number:6,updated_at:'2026-11-16T12:01:00Z'}]),sha).id,11);
 assert.equal(requireSuccessfulMainCheck(pages([{...run,run_attempt:2},run]),sha).attempt,2);
});
test('pagination and ordering cannot hide a newer failed run; malformed data fails closed',()=>{
 assert.throws(()=>requireSuccessfulMainCheck([{workflow_runs:[run]},{workflow_runs:[{...run,id:11,run_number:6,conclusion:'failure'}]}],sha),/publication is blocked/);
 for(const bad of [null,{},[{workflow_runs:null}],pages([{...run,run_attempt:undefined}]),pages([{...run,id:'10'}])])assert.throws(()=>requireSuccessfulMainCheck(bad,sha));
 assert.throws(()=>requireSuccessfulMainCheck(pages([run]),'short'));
});
