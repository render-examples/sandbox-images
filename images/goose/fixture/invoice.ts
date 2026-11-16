import assert from 'node:assert/strict';
export function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
export type Invoice={id:string;currency:string;lines:{quantity:number;unitCents:number}[]};
export type InvoiceResult={id:string;currency:string;totalCents:number};
export function invoiceFrom(value:unknown):Invoice{
 assert.ok(isRecord(value)&&typeof value.id==='string'&&typeof value.currency==='string'&&Array.isArray(value.lines));
 const lines=value.lines.map((line:unknown)=>{
  assert.ok(isRecord(line)&&typeof line.quantity==='number'&&Number.isSafeInteger(line.quantity)&&line.quantity>=1&&typeof line.unitCents==='number'&&Number.isSafeInteger(line.unitCents)&&line.unitCents>=0,'Invalid invoice line');
  return {quantity:line.quantity,unitCents:line.unitCents};
 });
 return {id:value.id,currency:value.currency,lines};
}
export function resultFrom(value:unknown):InvoiceResult{
 assert.ok(isRecord(value)&&typeof value.id==='string'&&typeof value.currency==='string'&&typeof value.totalCents==='number'&&Number.isSafeInteger(value.totalCents)&&value.totalCents>=0);
 return {id:value.id,currency:value.currency,totalCents:value.totalCents};
}
