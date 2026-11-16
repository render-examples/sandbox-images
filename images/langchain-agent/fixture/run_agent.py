"""Run Python Deep Agents inside an existing guest; never provision a nested sandbox."""
import argparse
import json
import os
import shutil
from pathlib import Path
from deepagents import create_deep_agent
from deepagents.backends import LocalShellBackend
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from task import grade, write

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('root',type=Path)
    parser.add_argument('provider',choices=['openai','anthropic','openrouter'])
    parser.add_argument('model')
    args=parser.parse_args()
    if not os.environ.get({'openai':'OPENAI_API_KEY','anthropic':'ANTHROPIC_API_KEY','openrouter':'OPENROUTER_API_KEY'}[args.provider]):raise ValueError('Missing selected provider credential')
    root=args.root.resolve();directory=root/'agent-project-python'
    if directory.exists(): raise ValueError('Use a fresh restore for every agent run')
    shutil.copytree(root/'input',directory)
    if args.provider=='anthropic': model=ChatAnthropic(model=args.model,max_tokens=4096,max_retries=0,timeout=60)
    elif args.provider=='openrouter': model=ChatOpenAI(model=args.model,max_tokens=4096,api_key=os.environ['OPENROUTER_API_KEY'],base_url='https://openrouter.ai/api/v1',max_retries=0,timeout=60)
    else: model=ChatOpenAI(model=args.model,max_tokens=4096,max_retries=0,timeout=60)
    backend=LocalShellBackend(root_dir=directory,virtual_mode=True,timeout=15,max_output_bytes=65536,inherit_env=False,env={'PATH':os.environ.get('PATH','/usr/local/bin:/usr/bin:/bin'),'HOME':str(directory)})
    agent=create_deep_agent(model=model,backend=backend,subagents=[],system_prompt='Complete the task by editing local files. Work only in this task directory. Do not install packages.')
    result=agent.invoke({'messages':[{'role':'user','content':(directory/'TASK.md').read_text()}]},config={'recursion_limit':60})
    scores=grade(directory,(directory/'pricing.py').exists())
    receipt={'provider':args.provider,'model':args.model,'modelInvoked':True,'messages':len(result['messages']),'actualModels':list({m.response_metadata.get('model_name',m.response_metadata.get('model')) for m in result['messages'] if m.response_metadata.get('model_name',m.response_metadata.get('model'))}),**scores,'validated':True}
    write(root/'agent-result-python.json',receipt)
    print(json.dumps(receipt))
if __name__=='__main__': main()
