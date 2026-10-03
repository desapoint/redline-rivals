"""Source-preserving measured preparation for the staged Forte and Rogue."""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SKILL=Path('C:/Users/jason/.codex/skills/racing-car-sprites/scripts')
RUN=ROOT/'tests/car-integration/20261003'
CONFIG={
 'kia-forte-gt-sedan-2022-orange':{
  'make':'Kia','model':'Forte','year':2022,'trim':'GT Sedan',
  'wheelHub':[690,694],'wheelRadius':590,'brakeHub':[684,691],'rotorRadius':452,
  'caliper':[[900,410],[934,344],[982,328],[1008,382],[1060,397],[1064,380],[1112,423],[1158,497],[1180,556],[1166,596],[1180,750],[1169,823],[1180,885],[1150,951],[1085,997],[1010,1021],[978,992],[942,937],[910,891],[896,843],[901,747],[896,667],[900,578]],
  'arches':[[[326,708],[328,645],[343,591],[380,548],[430,528],[484,520],[540,529],[591,556],[621,601],[639,659],[639,713]],[[1325,717],[1328,652],[1343,596],[1380,548],[1430,529],[1479,521],[1534,529],[1584,558],[1616,602],[1635,660],[1636,718]]],
  'lamps':[[[164,419],[287,420],[292,434],[249,466],[181,476],[164,454]],[[1541,468],[1692,481],[1776,506],[1787,541],[1700,530],[1590,504]]],
  'hue':[.025,.14],
  'samples':[{'x':800,'y':520,'expected':'paint','label':'front door'},{'x':830,'y':255,'expected':'paint','label':'roof'},{'x':850,'y':350,'expected':'protected','label':'glass'},{'x':215,'y':438,'expected':'protected','label':'taillamp'}]
 },
 'nissan-rogue-2020-red':{
  'revision':2,
  'make':'Nissan','model':'Rogue','year':2020,'trim':'SV AWD (provisional)',
  'wheelHub':[691,694],'wheelRadius':569,'brakeHub':[689,690],'rotorRadius':458,
  'caliper':[[919,471],[935,432],[943,367],[986,328],[1015,324],[1083,370],[1130,428],[1157,485],[1159,528],[1183,560],[1197,599],[1203,816],[1182,922],[1140,998],[1097,1028],[996,1025],[968,1000],[945,959],[932,932],[925,881],[918,794],[922,738],[918,651],[922,561]],
  'arches':[[[325,651],[329,588],[350,532],[391,489],[445,463],[504,458],[564,467],[620,492],[664,540],[682,595],[684,657]],[[1505,661],[1510,599],[1532,542],[1575,496],[1627,472],[1684,465],[1743,474],[1800,500],[1841,548],[1859,609],[1862,664]]],
  'lamps':[[[156,359],[195,325],[230,317],[267,314],[279,338],[317,358],[321,369],[302,382],[262,409],[158,415]],[[1814,434],[1908,441],[1980,449],[2005,450],[2030,480],[2063,515],[2052,521],[1970,500],[1928,486],[1920,491],[1880,478]]],
  'hue':[.94,.045],
  'samples':[{'x':900,'y':500,'expected':'paint','label':'door'},{'x':830,'y':160,'expected':'paint','label':'roof'},{'x':800,'y':270,'expected':'protected','label':'glass'},{'x':230,'y':330,'expected':'protected','label':'taillamp'}]
 }
}

for id,c in CONFIG.items():
 source=ROOT/'docs/art/staged-roster'/id
 directory=RUN/id
 inputs=directory/'inputs'
 inputs.mkdir(parents=True,exist_ok=True)
 sources={}
 for role,name in [('body','body-2d.png'),('wheel','wheel.png'),('brake','brake.png'),('referenceMetadata','metadata.json')]:
  target=inputs/name
  if target.exists() and target.read_bytes()!=(source/name).read_bytes():raise ValueError('Preserved source changed')
  shutil.copyfile(source/name,target)
  sources[role]={'file':'inputs/'+name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
 metadata=json.loads((inputs/'metadata.json').read_text(encoding='utf-8'))
 anchors={axle+'Wheel':circle for axle,circle in metadata['art']['geometry']['wheelPivots'].items()}
 width=metadata['art']['geometry']['canvas']['width'];height=metadata['art']['geometry']['canvas']['height']
 revision=c.get('revision',1)
 plan={'schemaVersion':1,'revision':revision,'vehicle':{k:c[k] for k in ['make','model','year','trim']},'sources':sources,'anchors':anchors,
 'bodyParts':[{'id':'body-lights','file':'body/lights.png','z':430,'polygons':c['lamps']}],
 'exterior':{'id':'body-exterior','file':'body/exterior.png','z':400},
 'underlay':{'rgb':[16,18,22],'polygons':c['arches']},
 'mechanical':{'wheelHub':c['wheelHub'],'wheelRadius':c['wheelRadius'],'brakeHub':c['brakeHub'],'rotorRadius':c['rotorRadius'],'caliperPolygons':[c['caliper']],'rotorOcclusionPolygons':[[[p[0]-20,p[1]] for p in c['caliper']]],'repairOccludedRotor':'mirror-x','brakeRadiusRatio':{'front':.70,'rear':.60}},
 'paint':{'includePolygons':[[[0,0],[width-1,0],[width-1,height-1],[0,height-1]]],'excludePolygons':c['lamps'],'minimumValue':0,'minimumSaturation':.30,'hueRange':c['hue'],'samples':c['samples']},
 'notes':['Existing staged master and native parts preserved. Fine trim, glass, mirrors and shading remain in the exterior.','Component circles and caliper/arch contours measured against the native source. Brake size ratios and source OEM identity remain illustrative assumptions.','Factory paint names are inherited; digital colors remain illustrative.']}
 plan['vehicle'].update(id=id,facing='right')
 plan_path=directory/('preparation-plan.json' if revision==1 else f'preparation-plan-v{revision}.json')
 if not plan_path.exists():
  plan_path.write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
 elif json.loads(plan_path.read_text(encoding='utf-8'))['sources']!=sources:
  raise ValueError('Archived preparation plan has different source hashes')
 output=directory/f'prepared-v{revision}'
 if not output.exists():
  subprocess.run([sys.executable,str(SKILL/'prepare_sprite_set.py'),str(plan_path),str(output)],check=True)
  subprocess.run([sys.executable,str(SKILL/'sprite_qa.py'),str(output)],check=True)
 print(output.relative_to(ROOT))
