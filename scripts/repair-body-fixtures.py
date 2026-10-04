"""Apply source-hashed semantic fixture contours in a new native-body revision."""
import argparse
import json
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from flat_car_layers import decompose, sha

ROOT = Path(__file__).resolve().parents[1]


def contours(size, polygons):
    scale = 4
    image = Image.new('L', (size[0]*scale, size[1]*scale))
    draw = ImageDraw.Draw(image)
    for points in polygons:
        if len(points) < 3 or any(not (0 <= x < size[0] and 0 <= y < size[1]) for x, y in points):
            raise ValueError('Semantic contours must be inside the native canvas')
        draw.polygon([(round(x*scale), round(y*scale)) for x, y in points], fill=255)
    return image.resize(size, Image.Resampling.LANCZOS)


def repair(planfile):
    plan = json.loads(planfile.read_text(encoding='utf-8'))
    source, target = ROOT/plan['sourcePackage'], ROOT/plan['outputPackage']
    if not source.resolve().is_relative_to(ROOT) or not target.resolve().is_relative_to(ROOT):
        raise ValueError('Package paths must stay inside the workspace')
    if target.exists():
        raise ValueError('Choose a new revision; prior evidence is preserved')
    bodyfile = source/'inputs/body.png'
    if sha(bodyfile) != plan['sourceBodySha256']:
        raise ValueError('Measured contours do not match the source body hash')
    old = json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
    body = Image.open(bodyfile).convert('RGBA')
    region = np.asarray(Image.open(source/old['masks']['paintRegions']).convert('RGBA')).copy()
    restore = np.asarray(contours(body.size, plan['paintRestore'])) > 0
    trim = np.asarray(contours(body.size, plan['fixedTrim'])) > 0
    lamp = contours(body.size, [part['points'] for part in plan['lights']])
    region[restore, 3] = np.asarray(body)[:, :, 3][restore]
    region[trim | (np.asarray(lamp) > 0), 3] = 0
    regions = Image.fromarray(region)
    settings = {**old['flatPaint'].get('decompositionSettings', {}), 'referenceLuminance': old['flatPaint']['sourceReferenceLuminance']}
    layers, report = decompose(body, regions, settings, lamp)
    # Source-painted surface and mechanical geometry stay unchanged outside the
    # measured repair. Lighting is only separated from the fixed fixture stack.
    for role in ('paint', 'linework', *(['lights'] if old['masks'].get('lights') else [])):
        assert layers[role].tobytes() == Image.open(source/'body'/f'{role}.png').convert('RGBA').tobytes()
    affected = restore | trim | (np.asarray(lamp) > 0)
    for role in ('shading', 'fixtures'):
        before = np.asarray(Image.open(source/'body'/f'{role}.png').convert('RGBA'))
        assert np.array_equal(before[~affected], np.asarray(layers[role])[~affected])
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('qa', 'qa-refined', '*.zip', '__pycache__'))
    for role, image in layers.items():
        image.save(target/'body'/f'{role}.png')
    regions.save(target/'masks/paint-regions.png')
    lamp_rgba = Image.new('RGBA', body.size, (255, 255, 255, 0))
    lamp_rgba.putalpha(lamp)
    lamp_rgba.save(target/'masks/lights-mask.png')
    manifest = {**old, 'revision': plan['revision'], 'masks': {**old['masks'], 'lights': 'masks/lights-mask.png'}}
    manifest['layers'] = old['layers'] + ([] if any(l['id']=='body-lights' for l in old['layers']) else [{'id': 'body-lights', 'file': 'body/lights.png', 'z': 450, 'placement': {'mode': 'canvas', 'x': 0, 'y': 0}}])
    manifest['flatPaint'] = {**old['flatPaint'], **report, 'decompositionSettings': settings, 'stack': ['body-paint','body-shading','body-fixtures','body-lights','body-linework']}
    manifest['fixtureSamples'] = [p for p in old.get('fixtureSamples', []) if layers['fixtures'].getpixel((p['x'], p['y']))[3] >= 128]
    manifest['fixtureSamples'] += [{'x': x, 'y': y, 'layer': 'body-lights', 'label': 'Measured lamp lens'} for x, y in plan['lightSamples']]
    manifest['fixtureSamples'] += [{'x': x, 'y': y, 'layer': 'body-fixtures', 'label': 'Measured fixed trim'} for x, y in plan.get('trimSamples', [])]
    manifest['paintSamples'] = old.get('paintSamples', []) + [{'x': x, 'y': y, 'expected': 'paint', 'label': 'Restored painted surface'} for x, y in plan['paintSamples']]
    manifest['notes'] = old.get('notes', []) + [plan['notes']]
    (target/'car-sprite.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (target/'fixture-repair-plan.json').write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    (target/'flat-paint-report.json').write_text(json.dumps(manifest['flatPaint'], indent=2)+'\n', encoding='utf-8')
    (target/'flat-paint-plan.json').write_text(json.dumps({'sourcePackage': plan['sourcePackage'], 'sourceBodySha256': sha(bodyfile), 'settings': settings, 'semanticRepair': 'fixture-repair-plan.json'}, indent=2)+'\n', encoding='utf-8')
    archive = target/'processing'/f'fixtures-v{plan["revision"]}'
    archive.mkdir(parents=True)
    files = ['flat_car_layers.py', 'repair-body-fixtures.py'] + (['cartoon_car_shading.py'] if settings.get('shadingStyle')=='cartoon-cel' else [])
    for file in files:
        saved = archive/file
        shutil.copyfile(ROOT/'scripts'/file, saved)
        manifest['sources'] = manifest.get('sources', []) + [{'originalPath': 'scripts/'+file, 'archivedFile': saved.relative_to(target).as_posix(), 'sha256': sha(saved)}]
    (target/'car-sprite.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    for layer in old['layers']:
        if layer['id'] not in ('body-shading', 'body-fixtures'):
            assert sha(source/layer['file']) == sha(target/layer['file'])
    print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    repair(parser.parse_args().plan)
