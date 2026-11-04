import json
from pathlib import Path
import pandas as pd
import pyarrow.parquet as pq
EXPECTED={'inputRows':7,'acceptedRows':3,'rejectedRows':4,'totalCents':2250,'violationKinds':4}
def write(path,value):path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
def prepare(root):
    (root/'orders.csv').write_text('id,customer_id,total_cents\na,c1,1250\nb,c2,500\nc,c3,500\na,c1,1250\nd,missing,100\ne,c1,-10\nf,c2,not-a-number\n')
    (root/'customers.csv').write_text('id\nc1\nc2\nc3\n')
def run(ctx):
    root,out=ctx['inputDir'],ctx['outputDir']
    rows=pd.read_csv(root/'orders.csv',dtype=str,keep_default_na=False)
    customers=set(pd.read_csv(root/'customers.csv',dtype=str)['id'])
    seen=set();accepted=[];violations=[]
    for idx,row in rows.iterrows():
        kind=None
        if row['id'] in seen:kind='duplicate-id'
        elif row['customer_id'] not in customers:kind='missing-customer'
        else:
            try:
                cents=int(row['total_cents'])
                if cents<0:kind='negative-total'
            except ValueError:kind='invalid-total'
        seen.add(row['id'])
        if kind:violations.append({'row':int(idx)+2,'id':row['id'],'kind':kind})
        else:accepted.append({'id':row['id'],'customer_id':row['customer_id'],'total_cents':cents})
    frame=pd.DataFrame(accepted);frame.to_parquet(out/'accepted.parquet',index=False)
    write(out/'violations.json',violations)
    return {'inputRows':len(rows),'acceptedRows':len(frame),'rejectedRows':len(violations),'totalCents':int(frame.total_cents.sum()),'violationKinds':len({r['kind'] for r in violations})}
def verify(ctx):
    out=ctx['outputDir'];rows=pq.read_table(out/'accepted.parquet').to_pylist();violations=json.loads((out/'violations.json').read_text())
    assert rows==[{'id':'a','customer_id':'c1','total_cents':1250},{'id':'b','customer_id':'c2','total_cents':500},{'id':'c','customer_id':'c3','total_cents':500}]
    assert violations==[{'row':5,'id':'a','kind':'duplicate-id'},{'row':6,'id':'d','kind':'missing-customer'},{'row':7,'id':'e','kind':'negative-total'},{'row':8,'id':'f','kind':'invalid-total'}]
    assert len((ctx['inputDir']/'orders.csv').read_text().splitlines())-1==len(rows)+len(violations)
    return {'inputRows':len(rows)+len(violations),'acceptedRows':len(rows),'rejectedRows':len(violations),'totalCents':sum(r['total_cents'] for r in rows),'violationKinds':len({r['kind'] for r in violations})}
SCENARIOS={'data-quality-audit':{'expectedSummary':EXPECTED,'artifacts':['accepted.parquet','violations.json'],'prepare':prepare,'run':run,'verify':verify}}
