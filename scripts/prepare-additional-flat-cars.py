"""Apply the game's uniform-paint layer contract to the reviewed additions.

The mechanical reconstruction and native exterior/arch geometry remain fixed.
An existing source-derived standard-tools decomposition supplies the same flat
paint, discrete shading, fixtures and panel ink used by the first four cars.
"""
import json
import shutil
from pathlib import Path
from PIL import Image
from flat_car_layers import decompose,sha

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'tests/car-integration/20261003-additional'
for planfile in sorted((ROOT/'docs/art/additional-car-plans').glob('*.json')):
 plan=json.loads(planfile.read_text(encoding='utf-8'));id=plan['id'];source=RUN/id/'prepared-v6';out=RUN/id/'flat-v7'
 if out.exists():raise ValueError('Refusing to overwrite an earlier flat revision: '+str(out))
 old=json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
 body=Image.open(source/'body.png').convert('RGBA');region=Image.open(source/'paint-mask.png').convert('RGBA')
 result,report=decompose(body,region)
 shutil.copytree(source,out,ignore=shutil.ignore_patterns('qa','parts-contact.jpg'))
 (out/'body').mkdir();(out/'processing').mkdir()
 for role,im in result.items():im.save(out/'body'/f'{role}.png')
 region.save(out/'paint-regions.png');result['paint'].save(out/'paint-mask.png')
 shutil.copyfile(ROOT/'scripts/flat_car_layers.py',out/'processing/flat_car_layers.py')
 shutil.copyfile(__file__,out/'processing/prepare-additional-flat-cars.py')
 manifest={**old,'revision':7,'paintLayerMode':'foundation','bodyLayerMode':'flat-cel','flatPaint':{**report,'factoryColor':plan['color']},
  'layers':[l for l in old['layers'] if l['id']!='body-exterior'],'masks':{'paint':'paint-mask.png','paintRegions':'paint-regions.png'},'fixtureSamples':[]}
 for role,z in [('paint',400),('shading',410),('fixtures',440),('linework',460)]:
  manifest['layers'].append({'id':'body-'+role,'file':f'body/{role}.png','z':z,'placement':{'mode':'canvas','x':0,'y':0}})
 for polygon in plan['exclusions']:
  x=round(sum(p[0] for p in polygon)/len(polygon));y=round(sum(p[1] for p in polygon)/len(polygon))
  if result['fixtures'].getpixel((x,y))[3]>=128:manifest['fixtureSamples'].append({'x':x,'y':y,'layer':'body-fixtures','label':'Measured protected fixture region'})
 manifest['sources']+= [{'originalPath':'scripts/flat_car_layers.py','sha256':sha(ROOT/'scripts/flat_car_layers.py'),'archivedFile':'processing/flat_car_layers.py'},
  {'originalPath':'scripts/prepare-additional-flat-cars.py','sha256':sha(Path(__file__)),'archivedFile':'processing/prepare-additional-flat-cars.py'}]
 manifest['notes']+=['Uniform continuous paint foundation covers the native silhouette with unchanged arches. Source-derived black/white shading has discrete alpha levels, fixtures retain fixed source pixels, and independent ink follows panels and silhouette. No source hue is baked into the paint or shading.']
 (out/'car-sprite.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 (out/'flat-paint-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 print(out.relative_to(ROOT))
