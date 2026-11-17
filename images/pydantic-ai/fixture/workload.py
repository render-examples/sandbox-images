"""Typed invoice analysis with real Pydantic AI and separate scripted/live models."""
import argparse
import json
import os
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field, ValidationError
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openrouter import OpenRouterProvider
from pydantic_ai.usage import UsageLimits
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from task import read,write,prepare,grade,copy_project
class InvoiceResult(BaseModel):
    currency: Literal['USD']
    totalCents: int = Field(ge=0,strict=True)
class Line(BaseModel):
    quantity: int = Field(gt=0,strict=True)
    unitCents: int = Field(ge=0,strict=True)
class Invoice(BaseModel):
    currency: Literal['USD']
    lines: list[Line]
def execute(directory: Path, model: object, live: bool) -> dict:
    agent=Agent(model,output_type=InvoiceResult,instructions='Use read_invoice, compute exact integer total and return typed output.',retries=1,model_settings={'max_tokens':2048,'timeout':60})
    calls=[]
    @agent.tool_plain
    def read_invoice() -> dict:
        """Read the task invoice after validating its input schema."""
        calls.append('read_invoice')
        return Invoice.model_validate(read(directory/'invoice.json')).model_dump()
    result=agent.run_sync((directory/'TASK.md').read_text(),usage_limits=UsageLimits(request_limit=6,total_tokens_limit=10000))
    if not calls: raise ValueError('Agent did not read the invoice tool')
    write(directory/'answer.json',result.output.model_dump())
    return {'modelInvoked':live,'toolCalls':len(calls),**grade(directory)}
def rejected_inputs() -> int:
    invalid=[{'currency':'USD','lines':[{'quantity':-1,'unitCents':1}]},{'currency':'EUR','lines':[]},{'currency':'USD','lines':[{'quantity':1,'unitCents':'100'}]}]
    count=0
    for value in invalid:
        try: Invoice.model_validate(value)
        except ValidationError: count+=1
    assert count==3
    return count
def scenario(artifact_validation: bool) -> dict:
    expected={'agentInvoked':False,'toolCalls':1,'totalCents':3250,'invalidInputsRejected':3 if artifact_validation else 0}
    def run(ctx):
        p=copy_project(ctx)
        result=execute(p,TestModel(custom_output_args={'currency':'USD','totalCents':3250}),False)
        (ctx['outputDir']/'answer.json').write_bytes((p/'answer.json').read_bytes())
        write(ctx['outputDir']/'schema-checks.json',{'invalidInputsRejected':rejected_inputs() if artifact_validation else 0})
        return {**expected,'toolCalls':result['toolCalls']}
    def verify(ctx):
        validated=InvoiceResult.model_validate(read(ctx['outputDir']/'answer.json'))
        assert validated.model_dump()=={'currency':'USD','totalCents':3250}
        assert read(ctx['outputDir']/'schema-checks.json')=={'invalidInputsRejected':3 if artifact_validation else 0}
        return expected
    return {'expectedSummary':expected,'artifacts':['answer.json','schema-checks.json'],'prepare':prepare,'run':run,'verify':verify}
SCENARIOS={'pydantic-typed-analysis':scenario(False),'pydantic-artifact-validation':scenario(True)}
def main():
    import shutil
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('provider',choices=['openai','anthropic','openrouter']);p.add_argument('model');a=p.parse_args()
    if not os.environ.get({'openai':'OPENAI_API_KEY','anthropic':'ANTHROPIC_API_KEY','openrouter':'OPENROUTER_API_KEY'}[a.provider]): raise ValueError('Missing selected provider credential')
    directory=a.root/'agent-project';shutil.copytree(a.root/'input',directory)
    model=OpenAIChatModel(a.model,provider=OpenRouterProvider(api_key=os.environ['OPENROUTER_API_KEY'])) if a.provider=='openrouter' else f'{a.provider}:{a.model}'
    receipt=execute(directory,model,True);receipt.update(provider=a.provider,model=a.model,validated=True,passed=True)
    write(a.root/'agent-result.json',receipt);print(json.dumps(receipt))
if __name__=='__main__':main()
