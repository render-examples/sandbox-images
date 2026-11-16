"""Frozen train/held-out splits and deterministic scoring for DSPy programs."""
import argparse
import json
import os
from pathlib import Path
from typing import Literal
import dspy
from dspy.utils import DummyLM
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from task import read,write
TRAIN=[{'text':'Please refund my invoice','label':'billing'},{'text':'I forgot my password','label':'access'},{'text':'Payment charged twice','label':'billing'},{'text':'Cannot sign in','label':'access'}]
HELDOUT=[{'text':'Where is the receipt for my payment?','label':'billing'},{'text':'Reset my login credentials','label':'access'},{'text':'The credit card charge is incorrect','label':'billing'},{'text':'My account login is locked','label':'access'}]
class Classify(dspy.Signature):
    """Classify customer requests as billing or access."""
    text: str=dspy.InputField()
    label: Literal['billing','access']=dspy.OutputField()
class Extract(dspy.Signature):
    """Extract currency and invoice total in integer cents from the text."""
    text: str=dspy.InputField()
    currency: Literal['USD']=dspy.OutputField()
    totalCents: int=dspy.OutputField()
def prepare(directory):
    write(directory/'train.json',TRAIN)
    # Labels are held by the scorer, not included in the agent inputs.
    write(directory/'heldout.json',[{'text':x['text']} for x in HELDOUT])
    (directory/'invoice.txt').write_text('Invoice currency USD. Two units at 1250 cents, one unit at 750 cents. Total 3250 cents.')
def metric(example,prediction,trace=None):return example.label==prediction.label
def execute(directory,lm,classification):
    if classification:
        train=[dspy.Example(**x).with_inputs('text') for x in read(directory/'train.json')]
        samples=read(directory/'heldout.json')
        baseline=dspy.Predict(Classify)
        # Bounded optimizer consumes only the training split. No held-out labels.
        optimizer=dspy.LabeledFewShot(k=4)
        with dspy.context(lm=lm):
            optimized=optimizer.compile(baseline,trainset=train,sample=False)
            predictions=[{'text':row['text'],'label':optimized(text=row['text']).label} for row in samples]
        return {'predictions':predictions,'trainExamples':len(train),'heldoutExamples':len(samples),'optimizer':'LabeledFewShot','score':sum(x['label']==y['label'] for x,y in zip(predictions,HELDOUT,strict=True))/len(HELDOUT)}
    with dspy.context(lm=lm):r=dspy.Predict(Extract)(text=(directory/'invoice.txt').read_text())
    return {'currency':r.currency,'totalCents':r.totalCents}
def scenario(classification):
    expected={'modelInvoked':False,**({'heldoutExamples':4,'correct':4} if classification else {'totalCents':3250})}
    def run(ctx):
        answers=[{'label':x['label']} for x in HELDOUT] if classification else [{'currency':'USD','totalCents':3250}]
        result=execute(ctx['inputDir'],DummyLM(answers),classification)
        write(ctx['outputDir']/'result.json',result)
        return expected
    def verify(ctx):
        result=read(ctx['outputDir']/'result.json')
        if classification:
            assert result=={'predictions':HELDOUT,'trainExamples':4,'heldoutExamples':4,'optimizer':'LabeledFewShot','score':1.0}
        else:assert result=={'currency':'USD','totalCents':3250}
        return expected
    return {'expectedSummary':expected,'artifacts':['result.json'],'prepare':prepare,'run':run,'verify':verify}
SCENARIOS={'dspy-heldout-classification':scenario(True),'dspy-structured-extraction':scenario(False)}
def main():
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('provider',choices=['openai','anthropic','openrouter']);p.add_argument('model');a=p.parse_args()
    if not os.environ.get({'openai':'OPENAI_API_KEY','anthropic':'ANTHROPIC_API_KEY','openrouter':'OPENROUTER_API_KEY'}[a.provider]): raise ValueError('Missing selected provider credential')
    config=read(a.root/'recipe.json');classification=config['scenario']=='dspy-heldout-classification'
    lm=dspy.LM(f'{a.provider}/{a.model}',max_tokens=1024,num_retries=0,cache=False)
    result=execute(a.root/'input',lm,classification)
    # Live accuracy is measured, never replaced by the scripted score or promised to improve.
    if not classification:assert result=={'currency':'USD','totalCents':3250}
    receipt={'provider':a.provider,'model':a.model,'modelInvoked':True,'result':result}
    write(a.root/'agent-result.json',receipt);print(json.dumps(receipt))
if __name__=='__main__':main()
