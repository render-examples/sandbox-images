import assert from 'node:assert/strict';
import type {Transport} from './src/tools.ts';
type Receipt={accepted:true;receiptId:string;totalCents:number};
type TraceEntry={key:string;status:number;duplicate:boolean};
// Injected Fetch transport: no socket, DNS, credentials, or external requests.
export function createMockApi() {
  const receipts = new Map<string,{body:string;receipt:Receipt}>();
  const trace:TraceEntry[] = [];
  let deliveries = 0;
  const transport:Transport = async request => {
    const key = request.headers.get('idempotency-key');
    const payload:unknown = await request.json();
    assert.ok(typeof payload==='object' && payload!==null && 'totalCents' in payload && typeof payload.totalCents==='number' && Number.isSafeInteger(payload.totalCents) && payload.totalCents>=0);
    if (!key) throw new Error('Missing idempotency key');
    if (trace.length === 0) {
      trace.push({ key, status: 503, duplicate: false });
      return Response.json({ error: 'synthetic unavailable' }, { status: 503 });
    }
    const existing = receipts.get(key);
    if (existing && existing.body !== JSON.stringify(payload)) throw new Error('Idempotency key reused for another payload');
    const receipt:Receipt = existing?.receipt ?? { accepted: true, receiptId: `receipt-${++deliveries}`, totalCents: payload.totalCents };
    receipts.set(key, { body: JSON.stringify(payload), receipt });
    trace.push({ key, status: 201, duplicate: Boolean(existing) });
    return Response.json(receipt, { status: 201 });
  };
  return { transport, trace, get deliveries() { return deliveries; } };
}
