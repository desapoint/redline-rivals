"""Import only the eight hash-bound reviewed additional packages.

Existing production car bytes and their specification archive are preserved.
Full sources, rejected revisions and replay scripts stay in the local art run;
the public demo retains compact source/review snapshots and lossless sprites.
"""
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reviewed_importer',ROOT/'scripts/import-reviewed-cars.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)

def rgba(path):
 a=np.array(Image.open(path).convert('RGBA'));a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)

def main():
 target=base.RUNTIME/'manifest.json';runtime=json.loads(target.read_text(encoding='utf-8'))
 count=0
 for planfile in sorted((ROOT/'docs/art/additional-car-plans').glob('*.json')):
  plan=json.loads(planfile.read_text(encoding='utf-8'));id=plan['id']
  directory=ROOT/'tests/car-integration/20261003-additional'/id/'cartoon-v8'
  pack=json.loads((directory/'car-sprite.json').read_text(encoding='utf-8'))
  reportpath=directory/'qa/qa-report.json';report=json.loads(reportpath.read_text(encoding='utf-8'))
  review=json.loads((directory/'qa/visual-review.json').read_text(encoding='utf-8'));current=base.fingerprint(directory,pack)
  if not review['accepted'] or review['unresolvedIssues'] or report['problems'] or review['contentFingerprint']!=current or review['qaReportHash']!=base.digest(reportpath):
   raise ValueError(id+': reviewed QA does not match current source bytes')
  for source in pack['sources']:
   if base.digest(directory/source['archivedFile'])!=source['sha256']:raise ValueError('Preserved source changed: '+source['archivedFile'])
  layers={l['id']:l for l in pack['layers']};body=rgba(directory/'body/paint.png')
  record={**pack['canvas'],'facing':pack['vehicle']['facing'],'paintColor':plan['color'],'layers':{},'wheels':[],'archProfiles':pack['archProfiles']}
  record['paintMode']='flat-cel';record['flatPaint']=pack['flatPaint']
  for role,file,name in [('body','body/paint.png','body.webp'),('underlay','underlay.png','underlay.webp'),('paintMask','paint-mask.png','paint-mask.webp'),('shading','body/shading.png','shading.webp'),('fixtures','body/fixtures.png','fixtures.webp'),('linework','body/linework.png','linework.webp')]:
   record['layers'][role]=base.export_image(rgba(directory/file),id,name)
  for axle in ('rear','front'):
   anchor=pack['anchors'][axle+'Wheel'];slot={'axle':axle,**anchor}
   for part,role in [('wheel','wheel'),('rotor','rotor'),('caliper','brake')]:
    layer=layers[f'{axle}-{part}'];p=layer['placement'];im=rgba(directory/layer['file'])
    if p['anchor']!=axle+'Wheel' or p['offset']!=[0,0]:raise ValueError('Mechanical hub mismatch')
    slot[role]={**base.export_image(im,id,f'{axle}-{part}.webp'),'pivot':[p['pivotNormalized'][0]*im.width,p['pivotNormalized'][1]*im.height],'radius':anchor['radius']/p['scale']}
   record['wheels'].append(slot)
  bounds=body.getchannel('A').point(lambda v:255 if v>=8 else 0).getbbox()
  for slot in record['wheels']:
   bounds=(min(bounds[0],slot['x']-slot['radius']),min(bounds[1],slot['y']-slot['radius']),max(bounds[2],slot['x']+slot['radius']),max(bounds[3],slot['y']+slot['radius']))
  record['bounds']=record['displayBounds']=[bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]]
  snapshot=ROOT/'docs/art/runtime-provenance'/id;snapshot.mkdir(parents=True,exist_ok=True)
  for file in ['car-sprite.json','preparation-plan.json']:(snapshot/file).write_bytes((directory/file).read_bytes())
  for file in ['visual-review.json','qa-report.json']:(snapshot/file).write_bytes((directory/'qa'/file).read_bytes())
  record['provenance']={'sourcePackage':directory.relative_to(ROOT).as_posix(),'sourceManifest':(snapshot/'car-sprite.json').relative_to(ROOT).as_posix(),
   'bodySource':(directory/'inputs/body-2d.png').relative_to(ROOT).as_posix(),'bodySourceSha256':base.digest(directory/'inputs/body-2d.png'),
   'masterSource':plan['source'],'masterSourceSha256':plan['sha256'],'revision':pack['revision'],'reviewFingerprint':current,'sourceManifestSha256':base.digest(directory/'car-sprite.json'),
   'conversion':'Measured native silhouette and arch contours; complete circular source-sampled tires; independently reconstructed complete brake hardware. Five composite-source inner rims are rebuilt with standard drawing to remove duplicated baked calipers. Uniform paint, discrete black/white alpha shading, fixed fixtures and independent ink follow the same contract as the original four cars. Lossless WebP with RGB cleared only at alpha-zero pixels. Factory identity is illustrated; reconstruction is a visual approximation.'}
  (base.RUNTIME/id/'provenance.json').write_text(json.dumps(record['provenance'],indent=2)+'\n',encoding='utf-8')
  runtime['cars'][id]=record;count+=1
 target.write_text(json.dumps(runtime,indent=2)+'\n',encoding='utf-8')
 print(f'Imported {count} reviewed additional car packs; {len(runtime["cars"])} production cars total.')

if __name__=='__main__':main()
