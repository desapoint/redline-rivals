"""Import reviewed shading patches while preserving every other runtime image."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reviewed_importer',ROOT/'scripts/import-reviewed-cars.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)


def main():
    file=base.RUNTIME/'manifest.json';runtime=json.loads(file.read_text(encoding='utf-8'))
    plans=json.loads((ROOT/'docs/art/native-shading-plans.json').read_text(encoding='utf-8'))
    jobs=[]
    for plan in plans:
        id=plan['vehicle'];directory=ROOT/plan['outputPackage'];old=runtime['cars'][id]
        if old['provenance']['sourcePackage']!=plan['sourcePackage']:raise ValueError('Runtime changed during rework: '+id)
        manifest=json.loads((directory/'car-sprite.json').read_text(encoding='utf-8'))
        report=json.loads((directory/'qa/qa-report.json').read_text(encoding='utf-8'))
        review=json.loads((directory/'qa/visual-review.json').read_text(encoding='utf-8'))
        current=base.fingerprint(directory,manifest)
        if not report['passed'] or report['problems'] or not review['accepted'] or review['unresolvedIssues'] or review['contentFingerprint']!=current or review['qaReportHash']!=base.digest(directory/'qa/qa-report.json'):
            raise ValueError('Missing current accepted review: '+id)
        for entry in manifest['sources']:
            if entry.get('archivedFile') and base.digest(directory/entry['archivedFile'])!=entry['sha256']:raise ValueError('Source changed: '+id)
        for path,digest in plan['unchangedFiles'].items():
            if base.digest(directory/path)!=digest:raise ValueError('Unrelated artwork changed: '+id+' '+path)
        jobs.append((plan,directory,manifest,current))
    for plan,directory,manifest,current in jobs:
        id=plan['vehicle'];record=copy.deepcopy(runtime['cars'][id])
        untouched={path:base.digest(base.RUNTIME/path) for path in set(layer['file'] for layer in [*record['layers'].values(),*(l for w in record['wheels'] for l in (w['wheel'],w['rotor'],w['brake']))]) if path!=record['layers']['shading']['file']}
        record['layers']['shading']=base.export_image(Image.open(directory/'body/shading.png'),id,'shading.webp')
        record['flatPaint']=manifest['flatPaint']
        snapshot=ROOT/'docs/art/runtime-provenance'/id
        for name in ('car-sprite.json','native-shading-plan.json'):shutil.copyfile(directory/name,snapshot/name)
        for name in ('qa-report.json','visual-review.json'):shutil.copyfile(directory/'qa'/name,snapshot/name)
        record['provenance'].update(sourcePackage=plan['outputPackage'],revision=manifest['revision'],reviewFingerprint=current,
            sourceManifestSha256=base.digest(directory/'car-sprite.json'),
            conversion='Shading-only source detail restoration: static black/white alpha preserves native panel and reflection contours without filtering or polygon simplification. Uniform paint, fixtures, lamps, linework, arches, wheel/rotor/caliper images, pivots and geometry remain unchanged. Complete source archives and rejected attempts stay in the local art workspace.')
        (base.RUNTIME/id/'provenance.json').write_text(json.dumps(record['provenance'],indent=2)+'\n',encoding='utf-8')
        for path,digest in untouched.items():
            if base.digest(base.RUNTIME/path)!=digest:raise ValueError('Unrelated runtime image changed: '+path)
        runtime['cars'][id]=record;print('Imported source detail:',id)
    file.write_text(json.dumps(runtime,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
