import json,re
from reportlab.pdfgen.canvas import Canvas
import pdfplumber
EXPECTED={'invoices':3,'matched':2,'discrepancies':1,'invoiceTotalCents':3750,'differenceCents':250}
def write(path,value):path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
def prepare(root):
    orders=[{'id':'A100','expectedCents':1250},{'id':'B200','expectedCents':750},{'id':'C300','expectedCents':1500}]
    write(root/'purchase-orders.json',orders)
    for name,cents in [('A100',1250),('B200',750),('C300',1750)]:
        canvas=Canvas(str(root/(name+'.pdf')),invariant=1);canvas.drawString(50,750,'Synthetic invoice '+name);canvas.drawString(50,720,'Invoice ID: '+name);canvas.drawString(50,690,'Total cents: '+str(cents));canvas.save()
def run(ctx):
    root,out=ctx['inputDir'],ctx['outputDir'];expected={r['id']:r['expectedCents'] for r in json.loads((root/'purchase-orders.json').read_text())};rows=[]
    for path in sorted(root.glob('*.pdf')):
        with pdfplumber.open(path) as pdf:
            assert len(pdf.pages)==1;text=pdf.pages[0].extract_text()
        id=re.search(r'Invoice ID: (\w+)',text).group(1);total=int(re.search(r'Total cents: (\d+)',text).group(1))
        rows.append({'id':id,'invoiceCents':total,'expectedCents':expected[id],'differenceCents':total-expected[id],'source':path.name,'page':1})
    write(out/'reconciliation.json',rows)
    (out/'exceptions.csv').write_text('id,difference_cents,source,page\n'+''.join(f"{r['id']},{r['differenceCents']},{r['source']},{r['page']}\n" for r in rows if r['differenceCents']))
    return {'invoices':len(rows),'matched':sum(r['differenceCents']==0 for r in rows),'discrepancies':sum(r['differenceCents']!=0 for r in rows),'invoiceTotalCents':sum(r['invoiceCents'] for r in rows),'differenceCents':sum(r['differenceCents'] for r in rows)}
def verify(ctx):
    rows=json.loads((ctx['outputDir']/'reconciliation.json').read_text())
    assert rows==[{'id':id,'invoiceCents':actual,'expectedCents':expected,'differenceCents':actual-expected,'source':id+'.pdf','page':1} for id,actual,expected in [('A100',1250,1250),('B200',750,750),('C300',1750,1500)]]
    assert (ctx['outputDir']/'exceptions.csv').read_text()=='id,difference_cents,source,page\nC300,250,C300.pdf,1\n'
    for row in rows:
        with pdfplumber.open(ctx['inputDir']/row['source']) as pdf:assert 'Total cents: '+str(row['invoiceCents']) in pdf.pages[row['page']-1].extract_text()
    return {'invoices':len(rows),'matched':sum(r['differenceCents']==0 for r in rows),'discrepancies':sum(r['differenceCents']!=0 for r in rows),'invoiceTotalCents':sum(r['invoiceCents'] for r in rows),'differenceCents':sum(r['differenceCents'] for r in rows)}
SCENARIOS={'invoice-reconciliation':{'expectedSummary':EXPECTED,'artifacts':['reconciliation.json','exceptions.csv'],'prepare':prepare,'run':run,'verify':verify}}
