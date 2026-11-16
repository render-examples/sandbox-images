"""Offline regression coverage for runtime OpenRouter cost registration."""
import runpy,litellm
ns=runpy.run_path('/usr/local/bin/render-mini-swe-agent');fn=ns['openrouter_cost_registration']
for model in ['openrouter/google/gemini-4-hydrogen','openrouter/openai/gpt-6.1-terra']:
 catalog={'data':[{'id':model.removeprefix('openrouter/'),'context_length':1000000,'pricing':{'prompt':'0.000001','completion':'0.000005','overrides':[{'min_prompt_tokens':100,'prompt':'0.000002','completion':'0.0000075'}]}}]}
 registration=fn(model,catalog);assert registration['input_cost_per_token']==0.000002 and registration['output_cost_per_token']==0.0000075
 litellm.register_model({model:registration})
 response=litellm.ModelResponse(model=model.removeprefix('openrouter/'),usage={'prompt_tokens':1000,'completion_tokens':100,'total_tokens':1100})
 response._hidden_params['custom_llm_provider']='openrouter'
 cost=litellm.cost_calculator.completion_cost(response,model=model);assert abs(cost-0.00275)<1e-9,(cost,model)
 from minisweagent.models.litellm_model import LitellmModel
 client=LitellmModel(model_name=model,cost_tracking='default');assert client._calculate_cost(response)['cost']>0
 catalog['data'][0]['pricing'].pop('overrides')
 assert fn(model,catalog)['input_cost_per_token']==0.000001
 catalog['data'][0]['pricing']['request']='0.01'
 try:fn(model,catalog)
 except ValueError:pass
 else:raise AssertionError('Per-request fee accepted')
 del catalog['data'][0]['pricing']['request']
 for invalid in ['NaN','-1','Infinity']:
  catalog['data'][0]['pricing']['prompt']=invalid
  try:fn(model,catalog)
  except ValueError:pass
  else:raise AssertionError('Invalid price accepted')
try:fn('openrouter/missing', {'data':[]})
except ValueError:pass
else:raise AssertionError('Missing model accepted')
print('Pricing registration, token cost calculation, strict tracking and invalid-rate rejection passed')
