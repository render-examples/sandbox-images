"""Local CodeAgent execution with independent artifact verification."""
import argparse
import json
import os
import shutil
from pathlib import Path
from smolagents import CodeAgent, Model, ChatMessage, LiteLLMModel, tool
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from task import read,write,prepare,grade,copy_project,FIX
class ScriptedModel(Model):
    def __init__(self,repair): super().__init__(model_id='offline-scripted');self.repair=repair;self.calls=0
    def generate(self,messages,**kwargs):
        self.calls+=1
        if self.repair: code=f"write_task('pricing.py', {FIX!r})\nfinal_answer('written')"
        elif self.calls==1: code="import json\ninvoice=json.loads(read_task('invoice.json'))\ntotal=sum(row['quantity']*row['unitCents'] for row in invoice['lines'])\nprint(total)"
        else: code="write_task('answer.json', json.dumps({'currency':'USD','totalCents':total}))\nfinal_answer(total)"
        return ChatMessage(role='assistant',content='Thought: Complete the task.\nCode:\n```python\n'+code+'\n```<end_code>')
def execute(directory: Path, model: Model, live: bool, repair: bool):
    calls=[]
    def path(name):
        if name not in ['TASK.md','pricing.py','invoice.json','answer.json']:raise ValueError('Unknown task file')
        p=directory/name
        if p.is_symlink():raise ValueError('Symlink task file')
        return p
    @tool
    def read_task(name: str) -> str:
        """Read a local task file.
        Args:
            name: Task filename.
        """
        calls.append('read');return path(name).read_text()
    @tool
    def write_task(name: str, content: str) -> str:
        """Write a task output file.
        Args:
            name: Output filename, pricing.py or answer.json.
            content: Complete new file content.
        """
        if name not in ['pricing.py','answer.json'] or len(content)>10000:raise ValueError('Invalid output')
        calls.append('write');path(name).write_text(content);return 'written'
    agent=CodeAgent(tools=[read_task,write_task],model=model,executor_type='local',additional_authorized_imports=['json','math','statistics'],max_steps=8,verbosity_level=0)
    agent.run((directory/'TASK.md').read_text())
    if 'write' not in calls: raise ValueError('Agent did not write the required artifact')
    return {'modelInvoked':live,'toolCalls':len(calls),**grade(directory,repair)}
def scenario(repair):
    expected={'agentInvoked':False,'toolCalls':1 if repair else 2,**({'casesPassed':707} if repair else {'totalCents':3250})}
    def run(ctx):
        p=copy_project(ctx);result=execute(p,ScriptedModel(repair),False,repair)
        name='pricing.py' if repair else 'answer.json';(ctx['outputDir']/name).write_bytes((p/name).read_bytes())
        return {'agentInvoked':False,'toolCalls':result['toolCalls'],**grade(p,repair)}
    def verify(ctx):
        grade(ctx['outputDir'],repair)
        return expected
    return {'expectedSummary':expected,'artifacts':['pricing.py' if repair else 'answer.json'],'prepare':lambda p:prepare(p,repair),'run':run,'verify':verify}
SCENARIOS={'smolagents-data-analysis':scenario(False),'smolagents-code-repair':scenario(True)}
def main():
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('provider',choices=['openai','anthropic','openrouter']);p.add_argument('model');a=p.parse_args()
    if not os.environ.get({'openai':'OPENAI_API_KEY','anthropic':'ANTHROPIC_API_KEY','openrouter':'OPENROUTER_API_KEY'}[a.provider]): raise ValueError('Missing selected provider credential')
    directory=a.root/'agent-project';shutil.copytree(a.root/'input',directory)
    model=LiteLLMModel(model_id=f'{a.provider}/{a.model}',max_tokens=4096,timeout=60,num_retries=0)
    receipt=execute(directory,model,True,(directory/'pricing.py').exists());receipt.update(provider=a.provider,model=a.model,validated=True,passed=True)
    write(a.root/'agent-result.json',receipt);print(json.dumps(receipt))
if __name__=='__main__':main()
