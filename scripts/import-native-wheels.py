"""Import accepted mechanical repairs only; preserve other cars and body bytes."""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
import shutil
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reviewed_importer',ROOT/'scripts/import-reviewed-cars.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)

def main(workspace, runtime_root):
    base.RUNTIME=runtime_root/'src/assets/cars'
    file=base.RUNTIME/'manifest.json';runtime=json.loads(file.read_text(encoding='utf-8'))
    plans=json.loads((ROOT/'docs/art/native-wheel-plans.json').read_text(encoding='utf-8'))
    jobs=[]
    for plan in plans:
        id=plan['vehicle'];directory=workspace/plan['outputPackage'];old=runtime['cars'][id]
        if old['provenance']['sourcePackage']!=plan['sourcePackage']:raise ValueError('Runtime changed during rework: '+id)
        manifest=json.loads((directory/'car-sprite.json').read_text(encoding='utf-8'))
        report=json.loads((directory/'qa/qa-report.json').read_text(encoding='utf-8'))
        review=json.loads((directory/'qa/visual-review.json').read_text(encoding='utf-8'))
        current=base.fingerprint(directory,manifest)
        if not report['passed'] or report['problems'] or not review['accepted'] or review['unresolvedIssues'] or review['contentFingerprint']!=current or review['qaReportHash']!=base.digest(directory/'qa/qa-report.json'):
            raise ValueError('Missing current accepted review: '+id)
        for entry in manifest['sources']:
            if entry.get('archivedFile') and base.digest(directory/entry['archivedFile'])!=entry['sha256']:raise ValueError('Source changed: '+id)
        repair=json.loads((directory/'wheel-repair-plan.json').read_text(encoding='utf-8'))
        for path,digest in repair['unchangedFiles'].items():
            if base.digest(directory/path)!=digest:raise ValueError('Unrelated artwork changed: '+id+' '+path)
        if manifest['anchors']!=json.loads((workspace/plan['sourcePackage']/'car-sprite.json').read_text(encoding='utf-8'))['anchors']:
            raise ValueError('Unexpected axle geometry change: '+id)
        jobs.append((plan,directory,manifest,current))
    for plan,directory,manifest,current in jobs:
        id=plan['vehicle'];record=copy.deepcopy(runtime['cars'][id])
        untouched={l['file']:base.digest(base.RUNTIME/l['file']) for l in record['layers'].values()}
        for slot in record['wheels']:
            for part,role in [('wheel','wheel'),('rotor','rotor'),('caliper','brake')]:
                old=slot[role];new=base.export_image(Image.open(directory/f'{slot["axle"]}-{part}.png'),id,f'{slot["axle"]}-{part}.webp')
                if (new['width'],new['height'])!=(old['width'],old['height']):raise ValueError('Unexpected component canvas change')
                slot[role]={**old,**new}
        snapshot=runtime_root/'docs/art/runtime-provenance'/id
        for name in ('car-sprite.json','wheel-repair-plan.json'):shutil.copyfile(directory/name,snapshot/name)
        for name in ('qa-report.json','visual-review.json'):shutil.copyfile(directory/'qa'/name,snapshot/name)
        record['provenance'].update(sourcePackage=plan['outputPackage'],revision=manifest['revision'],reviewFingerprint=current,
            sourceManifestSha256=base.digest(directory/'car-sprite.json'),
            conversion='Mechanical-only native rim repair: measured source spokes, hubs, bevels and lip replace generic rims. Transparent spoke cavities expose complete modeled steel rotors/drum and single stationary calipers. Circular tire alpha/contact, axle positions, pivots, scales, body, shader, fixtures, linework, underlay and paint masks are preserved. Illustrated mechanical hardware is a visual approximation; full sources and replay metadata stay in the local art workspace.')
        (base.RUNTIME/id/'provenance.json').write_text(json.dumps(record['provenance'],indent=2)+'\n',encoding='utf-8')
        for path,digest in untouched.items():
            if base.digest(base.RUNTIME/path)!=digest:raise ValueError('Unrelated runtime image changed: '+path)
        runtime['cars'][id]=record;print('Imported native wheel detail:',id)
    # Merge only owned entries, retaining another workflow's unrelated new cars.
    latest=json.loads(file.read_text(encoding='utf-8'))
    for plan in plans:latest['cars'][plan['vehicle']]=runtime['cars'][plan['vehicle']]
    file.write_text(json.dumps(latest,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--workspace',type=Path,default=ROOT)
    p.add_argument('--runtime-root',type=Path,default=ROOT);args=p.parse_args();main(args.workspace,args.runtime_root)
