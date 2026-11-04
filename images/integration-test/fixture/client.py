"""Bounded fixture-only MCP stdio client and real HTTP checks, standard library only."""
import json, os, select, subprocess, sys, time, urllib.request, urllib.error, socket
checks=[]
child=subprocess.Popen(['node','dist/server.js'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
buffer=b''
next_id=0

def send(message):
    child.stdin.write((json.dumps(message)+'\n').encode());child.stdin.flush()

def rpc(method,params):
    global next_id,buffer
    next_id+=1
    send({'jsonrpc':'2.0','id':next_id,'method':method,'params':params})
    deadline=time.monotonic()+2
    while time.monotonic()<deadline:
        if b'\n' in buffer:
            line,buffer=buffer.split(b'\n',1);reply=json.loads(line)
            if reply.get('id')==next_id:return reply
            continue
        if select.select([child.stdout],[],[],max(0,deadline-time.monotonic()))[0]:
            data=os.read(child.stdout.fileno(),65536)
            assert data,'MCP server exited early'
            buffer+=data;assert len(buffer)<100000,'MCP fixture response exceeds bound'
    raise TimeoutError('MCP fixture response deadline')

try:
    response=rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'python-fixture','version':'1.0.0'}})
    assert response['result']['protocolVersion']=='2025-11-25' and 'tools' in response['result']['capabilities']
    send({'jsonrpc':'2.0','method':'notifications/initialized'});checks.append('mcp-initialize')
    assert [t['name'] for t in rpc('tools/list',{})['result']['tools']]==['sum_prices'];checks.append('mcp-list')
    result=rpc('tools/call',{'name':'sum_prices','arguments':{'lines':[{'quantity':2,'unitCents':1250},{'quantity':1,'unitCents':750}]}})['result']
    assert result['structuredContent']=={'totalCents':3250} and not result.get('isError');checks.append('mcp-call')
    assert rpc('tools/call',{'name':'sum_prices','arguments':{'lines':[{'quantity':-1,'unitCents':1}]}})['result']['isError'] is True;checks.append('mcp-invalid-input')
    assert rpc('tools/call',{'name':'missing','arguments':{}})['result']['isError'] is True;checks.append('mcp-unknown-tool')
finally:
    child.stdin.close();child.terminate()
    try:child.wait(timeout=2)
    except subprocess.TimeoutExpired:child.kill();child.wait(timeout=2)
base=sys.argv[1]
assert base.startswith('http://127.0.0.1:') and base.rsplit(':',1)[1].isdigit()
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def request(path,body=None,timeout=1):
    headers={'content-type':'application/json','idempotency-key':'evt-1'}
    req=urllib.request.Request(base+'/python'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
    try:response=opener.open(req,timeout=timeout)
    except urllib.error.HTTPError as error:response=error
    with response:return response.status,json.loads(response.read(65536))
def retry(path):
    for attempt in range(1,4):
        status,body=request(path)
        if status not in [429,503] or attempt==3:return status,body,attempt
        time.sleep(.005*attempt)
assert retry('/flaky')==(200,{'ok':True},3);checks.append('retry-success')
assert retry('/always-busy')==(503,{'error':'busy'},3);checks.append('retry-budget')
assert retry('/forbidden')==(401,{'error':'forbidden'},1);checks.append('nonretryable')
def receipt(body):
    assert set(body)=={'accepted','eventId','amount','duplicate'}
    assert body['accepted'] is True and body['eventId']=='evt-1' and body['amount']==3250 and type(body['duplicate']) is bool
    return body
status,body=request('/invalid');assert status==200
try:receipt(body)
except AssertionError:pass
else:raise AssertionError('Invalid response accepted')
checks.append('response-schema')
try:request('/slow',timeout=.1)
except (TimeoutError,socket.timeout):pass
else:raise AssertionError('Slow request did not time out')
checks.append('timeout')
status,body=request('/webhook',{'eventId':'evt-1','amount':3250});assert status==201 and receipt(body)['duplicate'] is False
status,body=request('/webhook',{'eventId':'evt-1','amount':3250});assert status==200 and receipt(body)['duplicate'] is True;checks.append('webhook-dedup')
assert request('/webhook',{'eventId':'evt-1','amount':999})==(409,{'error':'idempotency_conflict'});checks.append('webhook-conflict')
print(json.dumps({'client':'python','checks':checks,'mcpTotalCents':3250}))
