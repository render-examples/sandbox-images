"""Interpretable synthetic statistics and forecasting, no external datasets/models."""
import csv
import json
import math
from statistics import mean, variance
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def prepare_experiment(directory):
    rows = [{'id': i, 'control': 20+i, 'treatment': 20+i+d} for i,d in enumerate([1,2,3,2,1,3,2,2,1,3],1)]
    write(directory / 'observations.json', rows)


def experiment(context):
    rows = json.loads((context['inputDir'] / 'observations.json').read_text())
    delta = np.array([r['treatment']-r['control'] for r in rows], dtype=float)
    result = stats.ttest_1samp(delta, popmean=0)
    ci = result.confidence_interval(confidence_level=.95)
    return {'ids': [r['id'] for r in rows], 'deltas': delta.tolist(), 'meanLift': float(delta.mean()),
            'tStatistic': float(result.statistic), 'pValue': float(result.pvalue),
            'confidenceInterval': [float(ci.low),float(ci.high)]}


def run_experiment(context):
    write(context['outputDir'] / 'experiment.json', experiment(context))
    return verify_experiment(context)


def verify_experiment(context):
    actual = json.loads((context['outputDir'] / 'experiment.json').read_text())
    rows = json.loads((context['inputDir'] / 'observations.json').read_text())
    delta = [r['treatment']-r['control'] for r in rows]
    assert actual['ids'] == list(range(1,11)) and actual['deltas'] == delta
    expected_t = mean(delta) / math.sqrt(variance(delta)/len(delta))
    assert math.isclose(actual['tStatistic'], expected_t, abs_tol=1e-10)
    assert actual['meanLift'] == mean(delta) == 2.0
    # Independent t(9) reference quantile; check the actual numerical interval.
    margin = 2.2621571628540993 * math.sqrt(variance(delta)/len(delta))
    assert np.allclose(actual['confidenceInterval'], [2-margin,2+margin], atol=1e-10, rtol=0)
    assert 0 < actual['pValue'] < .0001
    assert actual['confidenceInterval'][0] > 0
    return {'observations':10,'meanLift':2,'positiveConfidenceInterval':True}


def prepare_forecast(directory):
    write(directory / 'series.json', [{'period': t, 'demand':3*t+7,'split':'train' if t<=8 else 'holdout'} for t in range(1,13)])


def run_forecast(context):
    rows=json.loads((context['inputDir']/'series.json').read_text())
    train=[r for r in rows if r['split']=='train'];test=[r for r in rows if r['split']=='holdout']
    model=LinearRegression().fit([[r['period']] for r in train],[r['demand'] for r in train])
    predicted=model.predict([[r['period']] for r in test])
    write(context['outputDir']/'model.json',{'coefficient':float(model.coef_[0]),'intercept':float(model.intercept_),'trainPeriods':[r['period'] for r in train]})
    with (context['outputDir']/'forecast.csv').open('w',newline='') as f:
        writer=csv.writer(f);writer.writerow(['period','actual','predicted'])
        writer.writerows((r['period'],r['demand'],float(p)) for r,p in zip(test,predicted))
    return verify_forecast(context)


def verify_forecast(context):
    model=json.loads((context['outputDir']/'model.json').read_text())
    assert model['trainPeriods']==list(range(1,9))
    assert math.isclose(model['coefficient'],3,abs_tol=1e-12) and math.isclose(model['intercept'],7,abs_tol=1e-12)
    with (context['outputDir']/'forecast.csv').open() as f: rows=list(csv.DictReader(f))
    assert [int(r['period']) for r in rows]==[9,10,11,12]
    for row in rows:
        expected=3*int(row['period'])+7
        assert int(row['actual'])==expected and math.isclose(float(row['predicted']),expected,abs_tol=1e-10)
        assert int(row['period']) not in model['trainPeriods']
    return {'trainRows':8,'holdoutRows':4,'roundedAbsoluteError':0,'forecastTotal':154}


SCENARIOS={
 'statistical-experiment':{'expectedSummary':{'observations':10,'meanLift':2,'positiveConfidenceInterval':True},'artifacts':['experiment.json'],'prepare':prepare_experiment,'run':run_experiment,'verify':verify_experiment},
 'demand-forecast':{'expectedSummary':{'trainRows':8,'holdoutRows':4,'roundedAbsoluteError':0,'forecastTotal':154},'artifacts':['model.json','forecast.csv'],'prepare':prepare_forecast,'run':run_forecast,'verify':verify_forecast},
}
