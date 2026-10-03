"""Rework only attachment geometry against measured native body openings.

Keeps every source layer byte-for-byte; creates a new reviewable package revision.
Circle-fit evidence guides tire placement only, not the shape of an arch.
Rounded or squared fenders retain their source contours. Use wheel_arch_profiles.py
for independently measured wheel-well backing profiles. Neither is a factory
measurement. Final coordinates preserve a common tire contact line.
"""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'tests/car-integration/20261003'
SKILL=Path('C:/Users/jason/.codex/skills/racing-car-sprites/scripts')
CONFIG={
 'chevrolet-silverado-1500-custom-crew-short-2025-black':{
  'source':'tests/skill-runs/20261002-pipeline/examples/chevrolet-silverado-1500-custom-crew-short-2025-black/reviewed-v9',
  'revision':11,'rear':[464,660,145],'front':[1750,660,145]},
 'nissan-rogue-2020-red':{
  'source':'tests/car-integration/20261003/nissan-rogue-2020-red/prepared-v2',
  'revision':3,'rear':[499,675,172],'front':[1673,675,172]},
 'kia-forte-gt-sedan-2022-orange':{
  'source':'tests/car-integration/20261003/kia-forte-gt-sedan-2022-orange/prepared-v1',
  'revision':2,'rear':[464,665,134],'front':[1487,665,134]},
}

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

for id,config in CONFIG.items():
 source=ROOT/config['source'];target=RUN/id/f"wheel-fit-v{config['revision']}"
 if target.exists():
  print(f'Preserved existing correction: {target.relative_to(ROOT)}');continue
 shutil.copytree(source,target,ignore=shutil.ignore_patterns('qa','qa-refined','*.zip','__pycache__'))
 manifest=json.loads((target/'car-sprite.json').read_text(encoding='utf-8'))
 old=json.loads(json.dumps(manifest['anchors']))
 manifest['revision']=config['revision']
 for axle in ['rear','front']:
  x,y,radius=config[axle];anchor=axle+'Wheel';scale=radius/old[anchor]['radius']
  manifest['anchors'][anchor]={'x':x,'y':y,'radius':radius}
  for layer in manifest['layers']:
   if layer['id'] in [axle+'-wheel',axle+'-rotor',axle+'-caliper']:
    assert layer['placement']['anchor']==anchor
    layer['placement']['scale']*=scale
 manifest.setdefault('notes',[]).append('Wheel centers/radii remeasured against the alpha openings after user placement review; rotor/caliper scales follow each corrected hub; tire contact lines match. No source pixels or factory physics changed.')
 (target/'car-sprite.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 files={layer['file'] for layer in manifest['layers']}|set(manifest.get('masks',{}).values())
 hashes={f:digest(source/f) for f in files if f}
 assert all(digest(target/f)==h for f,h in hashes.items())
 shutil.copyfile(RUN/'wheel-opening-fit.json',target/'wheel-opening-fit.json')
 correction={'sourcePackage':config['source'],'previousAnchors':old,'correctedAnchors':manifest['anchors'],'unchangedLayerHashes':hashes,'measurementEvidence':'wheel-opening-fit.json','constraints':['Common tire contact line for both axles.','Separate wheel, rotating rotor and stationary caliper use the same corrected anchor.','Original noncircular illustrated fender shapes retained; no factory dimensions inferred from pixels.']}
 (target/'placement-correction.json').write_text(json.dumps(correction,indent=2)+'\n',encoding='utf-8')
 (target/'PATCH-NOTES.md').write_text(f"# {id}: wheel placement revision {config['revision']}\n\nChanged axle centers, tire radii and dependent wheel/rotor/caliper placement scales. All referenced native image bytes remain unchanged. The prior package is preserved at `{config['source']}`. Native opening diagnostics and a common contact line guide placement; these are artwork measurements. Fresh full sprite QA and visual review are required before runtime import.\n",encoding='utf-8')
 subprocess.run([sys.executable,str(SKILL/'sprite_qa.py'),str(target)],check=True)
 print(target.relative_to(ROOT))
