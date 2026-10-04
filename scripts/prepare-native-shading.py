"""Restore source reflections without changing accepted body/component geometry."""
import argparse
import copy
import json
from pathlib import Path
import shutil
from PIL import Image
import numpy as np
from flat_car_layers import sha, source_shading

ROOT=Path(__file__).resolve().parents[1]


def prepare(ids=None, revision_offset=1):
    runtime=json.loads((ROOT/'src/assets/cars/manifest.json').read_text(encoding='utf-8'))
    selected=ids or [id for id in runtime['cars'] if id!='mazda3-gt-turbo-sedan-2021-red']
    jobs=[]
    for id in selected:
        record=runtime['cars'][id];source=ROOT/record['provenance']['sourcePackage']
        old=json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
        target=source.parent/f'native-detail-v{old["revision"]+revision_offset}'
        if target.exists():raise ValueError('Preserve earlier evidence: '+str(target))
        for entry in old.get('sources',[]):
            if entry.get('archivedFile') and sha(source/entry['archivedFile'])!=entry['sha256']:
                raise ValueError('Source hash changed: '+entry['archivedFile'])
        bodyfile=next(source/f for f in ('inputs/body.png','body.png') if (source/f).exists())
        pixels=np.asarray(Image.open(bodyfile).convert('RGBA'));rgb=pixels[:,:,:3].astype(np.float32)
        maximum=rgb.max(axis=2);minimum=rgb.min(axis=2)
        regions=np.asarray(Image.open(source/old['masks']['paintRegions']).convert('RGBA'))[:,:,3]>0
        chromatic=regions&(pixels[:,:,3]>=128)&((maximum-minimum)>maximum*.25)
        # Normalize against the source pigment, not the darker selected repaint.
        # Otherwise a red master repainted maroon turns its panels pink/white.
        factory=[int(record['paintColor'][i:i+2],16) for i in (1,3,5)]
        colored=max(factory)-min(factory)>max(factory)*.25
        reference=max(56,int(np.rint(np.percentile(maximum[chromatic],99.5)))) if colored and chromatic.sum()>regions.sum()*.01 else max(56,max(factory))
        if colored and reference>=235:reference=255
        jobs.append((id,source,target,old,bodyfile,reference))
    plans=[]
    for id,source,target,old,bodyfile,reference in jobs:
        settings={**old['flatPaint'].get('decompositionSettings',{}),'shadingStyle':'source-native-cel',
                  'sourceChannel':'max','referenceValue':reference,'algorithm':'flat_car_layers.source_shading'}
        manifest=copy.deepcopy(old);manifest['revision']+=revision_offset
        shutil.copytree(source,target,ignore=shutil.ignore_patterns('qa','qa-refined','*.zip','__pycache__'))
        shade=source_shading(Image.open(bodyfile),Image.open(source/'body/paint.png'),
            Image.open(source/old['masks']['paintRegions']),Image.open(source/'body/linework.png'),reference)
        shade.save(target/'body/shading.png')
        manifest['flatPaint'].update(shadingStyle='source-native-cel',decompositionSettings=settings,
            classificationBlurPixels=0,shadowAlphaPalette=list(range(256)),
            highlightAlphaPalette=list(range(256)) if reference<255 else [0],
            sourceContourPreservation='Native maximum-channel illumination; no averaging, simplification or lost reflection contours')
        manifest['notes'].append('Shading-only source-detail repair after user review: native panel/reflection detail replaces simplified polygon patches. Static black/white RGB with per-pixel transparency remains recolorable. All other layers, masks, fixtures, native alpha, hubs, scales and mechanical bytes are unchanged.')
        archive=target/'processing/native-detail';archive.mkdir(parents=True,exist_ok=True)
        for name in ('flat_car_layers.py','prepare-native-shading.py'):
            script=ROOT/'scripts'/name;shutil.copyfile(script,archive/name)
            manifest['sources'].append({'originalPath':'scripts/'+name,'archivedFile':'processing/native-detail/'+name,'sha256':sha(script)})
        unchanged={l['file']:sha(source/l['file']) for l in old['layers'] if l['id']!='body-shading'}
        unchanged.update({f:sha(source/f) for f in old['masks'].values()})
        for file,digest in unchanged.items():
            if sha(target/file)!=digest:raise ValueError('Unrelated artwork changed: '+file)
        plan={'vehicle':id,'sourcePackage':source.relative_to(ROOT).as_posix(),
              'outputPackage':target.relative_to(ROOT).as_posix(),'revision':manifest['revision'],
              'sourceBody':bodyfile.relative_to(source).as_posix(),'sourceBodySha256':sha(bodyfile),
              'settings':settings,'unchangedFiles':unchanged}
        (target/'car-sprite.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
        (target/'native-shading-plan.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
        (target/'flat-paint-report.json').write_text(json.dumps(manifest['flatPaint'],indent=2)+'\n',encoding='utf-8')
        plans.append(plan);print(target)
    (ROOT/'docs/art/native-shading-plans.json').write_text(json.dumps(plans,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--car',action='append');parser.add_argument('--revision-offset',type=int,default=1)
    args=parser.parse_args();prepare(args.car,args.revision_offset)
