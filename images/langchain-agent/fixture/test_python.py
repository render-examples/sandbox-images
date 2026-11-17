"""Python runtime construction, graph invocation and task grading without model APIs."""
import tempfile
from pathlib import Path
from deepagents import create_deep_agent
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from task import prepare,grade,FIX
class OfflineModel(FakeListChatModel):
    def bind_tools(self,tools,**kwargs): return self
with tempfile.TemporaryDirectory() as root:
    p=Path(root);prepare(p,True);(p/'pricing.py').write_text(FIX);assert grade(p,True)=={'casesPassed':707}
    agent=create_deep_agent(model=OfflineModel(responses=['offline graph check']),subagents=[])
    result=agent.invoke({'messages':[{'role':'user','content':'Return a short response.'}]},config={'recursion_limit':40})
    assert result['messages'][-1].content=='offline graph check'
print('Python Deep Agents offline graph and independent task checks passed; modelInvoked=false')
