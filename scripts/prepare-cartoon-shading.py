"""Replace only the shading of the current reviewed cars in fresh revisions."""
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image
from flat_car_layers import decompose, sha

ROOT=Path(__file__).resolve().parents[1]
SETTINGS={'shadingStyle':'cartoon-cel','shapeGridWidth':256,'shapeToleranceCells':1.25,'minimumShapeCells':18}


def prepare(ids=None):
    runtime=json.loads((ROOT/'src/assets/cars/manifest.json').read_text(encoding='utf-8'))
    selected=ids or list(runtime['cars'])
    jobs=[]
    for id in selected:
        record=runtime['cars'][id]
        source=ROOT/record['provenance']['sourcePackage']
        old=json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
        target=source.parent/f'cartoon-v{old["revision"]+1}'
        if target.exists():raise ValueError('Preserve earlier evidence; choose a new revision: '+str(target))
        jobs.append((id,record,source,target,old))
    records=[]
    for id,record,source,target,old in jobs:
        bodyfile=source/'inputs/body.png' if (source/'inputs/body.png').exists() else source/'body.png'
        regions=source/old['masks']['paintRegions']
        settings={**old['flatPaint'].get('decompositionSettings',{}),**SETTINGS,'referenceLuminance':old['flatPaint']['sourceReferenceLuminance']}
        lamp=Image.open(source/old['masks']['lights']) if old['masks'].get('lights') else None
        result,report=decompose(Image.open(bodyfile),Image.open(regions),settings,lamp)
        for role,image in result.items():
            if role!='shading':
                assert image.tobytes()==Image.open(source/'body'/f'{role}.png').convert('RGBA').tobytes(),id+' unchanged '+role
        shutil.copytree(source,target,ignore=shutil.ignore_patterns('qa','qa-refined','*.zip','__pycache__'))
        result['shading'].save(target/'body/shading.png')
        manifest={**old,'revision':old['revision']+1,'flatPaint':{**old['flatPaint'],**report,'decompositionSettings':settings}}
        manifest['notes']=old.get('notes',[])+['Shading-only cartoon rework: two flat shadow opacities and one flat highlight opacity. Broad source-lit regions are traced into simplified polygons with small islands removed. No rendered blur or gradient; paint, fixtures, lamps, linework, arch alpha, hubs and mechanical bytes are preserved.']
        archive=target/'processing/cartoon';archive.mkdir(parents=True,exist_ok=True)
        for name in ('flat_car_layers.py','cartoon_car_shading.py','prepare-cartoon-shading.py'):
            original=ROOT/'scripts'/name;shutil.copyfile(original,archive/name)
            manifest['sources']=manifest.get('sources',[])+[{'originalPath':'scripts/'+name,'archivedFile':'processing/cartoon/'+name,'sha256':sha(original)}]
        plan={'vehicle':id,'sourcePackage':source.relative_to(ROOT).as_posix(),'outputPackage':target.relative_to(ROOT).as_posix(),'sourceBody':bodyfile.relative_to(source).as_posix(),'sourceBodySha256':sha(bodyfile),'paintRegionsSha256':sha(regions),'revision':manifest['revision'],'settings':settings}
        (target/'car-sprite.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
        (target/'cartoon-shading-plan.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
        (target/'flat-paint-report.json').write_text(json.dumps(manifest['flatPaint'],indent=2)+'\n',encoding='utf-8')
        for layer in old['layers']:
            if layer['id']!='body-shading':assert sha(source/layer['file'])==sha(target/layer['file'])
        for mask in old['masks'].values():assert sha(source/mask)==sha(target/mask)
        records.append(plan);print(target)
    (ROOT/'docs/art/cartoon-shading-plans.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--car',action='append')
    prepare(parser.parse_args().car)
