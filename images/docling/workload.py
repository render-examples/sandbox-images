"""Offline Docling layout and table extraction against independently known PDF fields."""
from __future__ import annotations
from pathlib import Path
from typing import Any
from functools import lru_cache
import hashlib,json,os
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions,TableFormerMode
from docling.datamodel.accelerator_options import AcceleratorOptions,AcceleratorDevice
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle
MODEL_ROOT=Path(os.environ.get('DOCLING_ARTIFACTS_PATH','/opt/render/models/docling'))
def write(path:Path,value:Any)->None:path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
def read(path:Path)->Any:return json.loads(path.read_text())
@lru_cache(maxsize=1)
def converter()->DocumentConverter:
 lock=read(Path(__file__).with_name('model-lock.json'))
 for m in lock['models']:
  for f in m['files']:
   assert hashlib.sha256((MODEL_ROOT/m['repository'].replace('/','--')/f['name']).read_bytes()).hexdigest()==f['sha256'], 'Model artifact changed'
 options=PdfPipelineOptions(artifacts_path=MODEL_ROOT,do_ocr=False,do_table_structure=True,document_timeout=75,accelerator_options=AcceleratorOptions(num_threads=2,device=AcceleratorDevice.CPU))
 options.table_structure_options.mode=TableFormerMode.ACCURATE
 return DocumentConverter(format_options={InputFormat.PDF:PdfFormatOption(pipeline_options=options)})
def prepare(path:Path)->None:
 styles=getSampleStyleSheet();rows=[['Item','Quantity','Unit price','Total'],['Notebook','2','12.00','24.00'],['Keyboard','1','30.00','30.00']]
 table=Table(rows,colWidths=[180,80,100,100]);table.setStyle(TableStyle([('GRID',(0,0),(-1,-1),1,colors.black),('BACKGROUND',(0,0),(-1,0),colors.lightgrey),('FONTSIZE',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
 story=[Paragraph('Invoice INV-1042',styles['Heading2']),Paragraph('Customer: Ada Lovelace',styles['Normal']),Spacer(1,20),table,Spacer(1,20),Paragraph('Invoice total: USD 54.00',styles['Normal']),Paragraph('Payment due: 2026-12-01',styles['Normal'])]
 SimpleDocTemplate(str(path/'invoice.pdf')).build(story);(path/'malformed.pdf').write_bytes(b'%PDF-invalid')
 write(path/'expected.json',{'invoice':'INV-1042','customer':'Ada Lovelace','totalCents':5400,'rows':rows})
def run(c:dict[str,Path])->dict[str,Any]:
 result=converter().convert(c['inputDir']/'invoice.pdf');document=result.document
 document.save_as_json(c['outputDir']/'document.json');document.save_as_markdown(c['outputDir']/'document.md')
 tables=[t.export_to_dataframe(doc=document).astype(str).to_dict(orient='split') for t in document.tables];write(c['outputDir']/'tables.json',tables)
 rejected=False
 try:converter().convert(c['inputDir']/'malformed.pdf')
 except Exception:rejected=True
 assert rejected;write(c['outputDir']/'negative-control.json',{'malformedRejected':rejected});return expected()
def expected()->dict[str,Any]:return {'documents':1,'pages':1,'tables':1,'dataRows':2,'totalCents':5400,'malformedRejected':True,'modelAPIInvoked':False}
def verify(c:dict[str,Path])->dict[str,Any]:
 text=(c['outputDir']/'document.md').read_text();assert 'INV-1042' in text and 'Ada Lovelace' in text and '54.00' in text
 assert text.index('INV-1042')<text.index('Notebook')<text.index('Payment due')
 doc=read(c['outputDir']/'document.json');assert len(doc['pages'])==1
 prov=[p for item in doc['texts'] for p in item.get('prov',[])];assert prov and all(p['page_no']==1 for p in prov)
 tables=read(c['outputDir']/'tables.json');assert len(tables)==1
 assert tables[0]['columns']==['Item','Quantity','Unit price','Total']
 assert tables[0]['data']==[['Notebook','2','12.00','24.00'],['Keyboard','1','30.00','30.00']]
 assert read(c['outputDir']/'negative-control.json')=={'malformedRejected':True};return expected()
SCENARIOS={slug:{'expectedSummary':expected(),'artifacts':['document.json','document.md','tables.json','negative-control.json'],'prepare':prepare,'run':run,'verify':verify} for slug in ['docling-layout-corpus','docling-table-extraction']}
