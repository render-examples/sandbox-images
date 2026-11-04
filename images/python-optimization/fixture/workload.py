"""Offline planning tools: real CP-SAT solves with independent exhaustive checks."""
import itertools
import json
from ortools.sat.python import cp_model


def write(path,value):
    path.write_text(json.dumps(value,indent=2)+'\n')


def solver():
    result=cp_model.CpSolver();result.parameters.num_search_workers=1;result.parameters.max_time_in_seconds=10
    return result


def prepare_allocation(directory):
    write(directory/'allocation.json',{'workers':['a','b','c'],'tasks':['review','build','test'],'costs':[[9,2,7],[6,4,3],[5,8,1]]})


def allocation_model(data, impossible=False):
    model=cp_model.CpModel();size=len(data['workers'])
    x=[[model.new_bool_var(f'x_{i}_{j}') for j in range(size)] for i in range(size)]
    for row in x:model.add_exactly_one(row)
    for j in range(size):model.add_exactly_one(x[i][j] for i in range(size))
    if impossible:model.add(sum(x[0])==0)
    model.minimize(sum(data['costs'][i][j]*x[i][j] for i in range(size) for j in range(size)))
    return model,x


def run_allocation(context):
    data=json.loads((context['inputDir']/'allocation.json').read_text());model,x=allocation_model(data);s=solver();status=s.solve(model)
    assert status==cp_model.OPTIMAL
    assignments=[{'worker':data['workers'][i],'task':data['tasks'][j],'cost':data['costs'][i][j]} for i,row in enumerate(x) for j,item in enumerate(row) if s.value(item)]
    impossible,_=allocation_model(data,True);bad=solver();bad_status=bad.solve(impossible)
    write(context['outputDir']/'allocation.json',{'status':s.status_name(status),'assignments':assignments,'objective':int(s.objective_value),'infeasibleStatus':bad.status_name(bad_status)})
    return verify_allocation(context)


def verify_allocation(context):
    data=json.loads((context['inputDir']/'allocation.json').read_text());actual=json.loads((context['outputDir']/'allocation.json').read_text())
    assert actual['status']=='OPTIMAL' and actual['infeasibleStatus']=='INFEASIBLE'
    rows=actual['assignments'];assert sorted(r['worker'] for r in rows)==sorted(data['workers']) and sorted(r['task'] for r in rows)==sorted(data['tasks'])
    for row in rows:assert row['cost']==data['costs'][data['workers'].index(row['worker'])][data['tasks'].index(row['task'])]
    optimum=min(sum(data['costs'][i][j] for i,j in enumerate(p)) for p in itertools.permutations(range(3)))
    assert actual['objective']==sum(r['cost'] for r in rows)==optimum==9
    return {'assignments':3,'optimalCost':9,'infeasibleRejected':True}


def prepare_schedule(directory):
    write(directory/'schedule.json',{'jobs':[{'id':'extract','duration':2},{'id':'transform','duration':3},{'id':'report','duration':1}],'precedence':[['extract','report']],'horizon':6})


def run_schedule(context):
    data=json.loads((context['inputDir']/'schedule.json').read_text());model=cp_model.CpModel();starts={};ends={};intervals=[]
    for job in data['jobs']:
        name=job['id'];starts[name]=model.new_int_var(0,data['horizon'],name+'_start');ends[name]=model.new_int_var(0,data['horizon'],name+'_end')
        intervals.append(model.new_interval_var(starts[name],job['duration'],ends[name],name))
    model.add_no_overlap(intervals)
    for before,after in data['precedence']:model.add(ends[before]<=starts[after])
    makespan=model.new_int_var(0,data['horizon'],'makespan');model.add_max_equality(makespan,list(ends.values()));model.minimize(makespan)
    s=solver();status=s.solve(model);assert status==cp_model.OPTIMAL
    rows=[{'id':j['id'],'start':s.value(starts[j['id']]),'end':s.value(ends[j['id']])} for j in data['jobs']]
    model.add(makespan<=5);bad=solver();bad_status=bad.solve(model)
    write(context['outputDir']/'schedule.json',{'status':s.status_name(status),'jobs':rows,'makespan':s.value(makespan),'infeasibleStatus':bad.status_name(bad_status)})
    return verify_schedule(context)


def verify_schedule(context):
    data=json.loads((context['inputDir']/'schedule.json').read_text());actual=json.loads((context['outputDir']/'schedule.json').read_text())
    assert actual['status']=='OPTIMAL' and actual['infeasibleStatus']=='INFEASIBLE'
    durations={j['id']:j['duration'] for j in data['jobs']};rows=actual['jobs'];assert sorted(j['id'] for j in rows)==sorted(durations)
    by_id={j['id']:j for j in rows}
    for job in rows:assert job['start']>=0 and job['end']-job['start']==durations[job['id']] and job['end']<=data['horizon']
    for a,b in itertools.combinations(rows,2):assert a['end']<=b['start'] or b['end']<=a['start']
    for before,after in data['precedence']:assert by_id[before]['end']<=by_id[after]['start']
    # Exhaustive independent oracle over every integer start tuple.
    feasible=[];names=list(durations)
    for start_tuple in itertools.product(range(data['horizon']),repeat=len(names)):
        starts=dict(zip(names,start_tuple));ends={n:starts[n]+durations[n] for n in names}
        if max(ends.values())>data['horizon']:continue
        if any(not(ends[a]<=starts[b] or ends[b]<=starts[a]) for a,b in itertools.combinations(names,2)):continue
        if any(ends[a]>starts[b] for a,b in data['precedence']):continue
        feasible.append(max(ends.values()))
    assert actual['makespan']==max(j['end'] for j in rows)==min(feasible)==6
    return {'scheduledJobs':3,'optimalMakespan':6,'infeasibleRejected':True}


SCENARIOS={
 'constraint-scheduling':{'expectedSummary':{'scheduledJobs':3,'optimalMakespan':6,'infeasibleRejected':True},'artifacts':['schedule.json'],'prepare':prepare_schedule,'run':run_schedule,'verify':verify_schedule},
 'resource-allocation':{'expectedSummary':{'assignments':3,'optimalCost':9,'infeasibleRejected':True},'artifacts':['allocation.json'],'prepare':prepare_allocation,'run':run_allocation,'verify':verify_allocation},
}
