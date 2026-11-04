"""Small synthetic GeoJSON fixtures, all CRS grids available offline."""
import json
import math
from pyproj import Transformer
from shapely.geometry import shape, Point, Polygon


def write(path,value):
    path.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')


def prepare_transform(directory):
    write(directory/'places.geojson',{'type':'FeatureCollection','features':[{'type':'Feature','properties':{'id':name},'geometry':{'type':'Point','coordinates':coords}} for name,coords in [('origin',[0,0]),('sample-east',[2,49]),('sample-west',[-73,40])]]})


def run_transform(context):
    source=json.loads((context['inputDir']/'places.geojson').read_text())
    forward=Transformer.from_crs('EPSG:4326','EPSG:3857',always_xy=True)
    backward=Transformer.from_crs('EPSG:3857','EPSG:4326',always_xy=True)
    transformed=[];restored=[]
    for feature in source['features']:
        x,y=forward.transform(*feature['geometry']['coordinates'])
        lon,lat=backward.transform(x,y)
        transformed.append({'id':feature['properties']['id'],'x':x,'y':y})
        restored.append({'id':feature['properties']['id'],'longitude':lon,'latitude':lat})
    write(context['outputDir']/'projected.json',{'crs':'EPSG:3857','points':transformed})
    write(context['outputDir']/'roundtrip.json',restored)
    return verify_transform(context)


def verify_transform(context):
    source=json.loads((context['inputDir']/'places.geojson').read_text())['features']
    output=json.loads((context['outputDir']/'projected.json').read_text());restored=json.loads((context['outputDir']/'roundtrip.json').read_text())
    assert output['crs']=='EPSG:3857' and len(output['points'])==len(restored)==len(source)==3
    for original,actual,back in zip(source,output['points'],restored):
        lon,lat=original['geometry']['coordinates'];name=original['properties']['id']
        assert actual['id']==back['id']==name
        x=6378137*math.radians(lon);y=6378137*math.log(math.tan(math.pi/4+math.radians(lat)/2))
        assert math.isclose(actual['x'],x,abs_tol=1e-6) and math.isclose(actual['y'],y,abs_tol=1e-6)
        assert math.isclose(back['longitude'],lon,abs_tol=1e-10) and math.isclose(back['latitude'],lat,abs_tol=1e-10)
    return {'points':3,'axisOrder':'longitude-latitude','roundtripPassed':True}


def prepare_join(directory):
    write(directory/'zones.json',{'zones':[{'id':'west','coordinates':[[0,0],[2,0],[2,2],[0,2],[0,0]]},{'id':'east','coordinates':[[2,0],[4,0],[4,2],[2,2],[2,0]]}], 'points':[{'id':'inside-west','xy':[1,1]},{'id':'shared-boundary','xy':[2,1]},{'id':'inside-east','xy':[3,1]},{'id':'outside','xy':[5,1]}],'invalid':[[0,0],[2,2],[0,2],[2,0],[0,0]]})


def run_join(context):
    data=json.loads((context['inputDir']/'zones.json').read_text())
    zones=[(z['id'],Polygon(z['coordinates'])) for z in data['zones']]
    matches=[{'point':p['id'],'zones':[name for name,polygon in zones if polygon.covers(Point(p['xy']))]} for p in data['points']]
    write(context['outputDir']/'spatial-join.json',{'matches':matches,'totalArea':sum(p.area for _,p in zones),'invalidRejected':not Polygon(data['invalid']).is_valid})
    return verify_join(context)


def verify_join(context):
    actual=json.loads((context['outputDir']/'spatial-join.json').read_text())
    expected={'matches':[{'point':'inside-west','zones':['west']},{'point':'shared-boundary','zones':['west','east']},{'point':'inside-east','zones':['east']},{'point':'outside','zones':[]}],'totalArea':8.0,'invalidRejected':True}
    assert actual==expected
    # Independently check rectangle membership including shared boundaries.
    data=json.loads((context['inputDir']/'zones.json').read_text())
    for point,result in zip(data['points'],actual['matches']):
        x,y=point['xy'];names=[]
        for zone in data['zones']:
            xs,ys=zip(*zone['coordinates'])
            if min(xs)<=x<=max(xs) and min(ys)<=y<=max(ys):names.append(zone['id'])
        assert names==result['zones']
    return {'points':4,'matches':4,'unmatched':1,'invalidRejected':True}


SCENARIOS={
 'geojson-transform':{'expectedSummary':{'points':3,'axisOrder':'longitude-latitude','roundtripPassed':True},'artifacts':['projected.json','roundtrip.json'],'prepare':prepare_transform,'run':run_transform,'verify':verify_transform},
 'spatial-join':{'expectedSummary':{'points':4,'matches':4,'unmatched':1,'invalidRejected':True},'artifacts':['spatial-join.json'],'prepare':prepare_join,'run':run_join,'verify':verify_join},
}
