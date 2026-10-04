"""Derive uniform paint, discrete grayscale shading, fixtures and line art.

The approved native silhouette/paint regions define geometry. This is a
source-derived cel decomposition, not a color blend over a baked body image.
"""
import argparse
from pathlib import Path
import hashlib
import json
import shutil
import numpy as np
from PIL import Image, ImageChops, ImageFilter


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decompose(body, paint_mask, settings=None, lights_mask=None):
    settings = settings or {}
    if body.size != paint_mask.size:
        raise ValueError('Paint regions must use the same native canvas as the body')
    pixels = np.asarray(body.convert('RGBA')).copy()
    source_alpha = pixels[:, :, 3]
    silhouette = Image.fromarray(source_alpha).point(lambda value: 255 if value >= 8 else 0)
    opaque_core = np.asarray(silhouette.filter(ImageFilter.MinFilter(5))) > 0
    a = np.where(opaque_core, 255, source_alpha).astype(np.uint8)
    # Flatten interior opacity as well as RGB. Keep native boundary antialiasing
    # and actual arch openings; source opacity noise is not paint texture.
    region = np.asarray(paint_mask.convert('RGBA'))[:, :, 3] > 0
    if not np.any(region & (a > 128)):
        raise ValueError('Measured paint regions must contain visible body pixels')
    alpha = Image.fromarray(a)
    base = Image.new('RGBA', body.size, (255, 255, 255, 0))
    base.putalpha(alpha)  # Continuous, uniform foundation beneath all fixtures.

    rgb = pixels[:, :, :3].astype(np.float32)
    luminance = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
    reference = float(settings.get('referenceLuminance', np.percentile(luminance[region & (a > 128)], settings.get('referencePercentile', 75))))
    line_luma = np.asarray(Image.fromarray(np.clip(luminance, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))).astype(np.float32)
    # Detect thin dark ridges from both sides; a broad shadow is not line art.
    contrast = np.zeros(a.shape, dtype=np.float32)
    for distance in (3, 5, 8):
        horizontal = np.minimum(np.roll(line_luma, distance, 1)-line_luma,
                                np.roll(line_luma, -distance, 1)-line_luma)
        vertical = np.minimum(np.roll(line_luma, distance, 0)-line_luma,
                              np.roll(line_luma, -distance, 0)-line_luma)
        contrast = np.maximum(contrast, np.maximum(horizontal, vertical))
    neutral = rgb.max(axis=2)-rgb.min(axis=2) < 20
    ridge = (contrast > settings.get('lineContrast', 10)) & (neutral | (luminance < reference*.45)) & (luminance < 75) & (a > 0)
    # Native silhouette, including arbitrary fender holes, supplies outer ink.
    silhouette = alpha.point(lambda value: 255 if value >= 8 else 0)
    edge = np.asarray(ImageChops.subtract(silhouette, silhouette.filter(ImageFilter.MinFilter(11)))) > 0
    # Ignore source opacity jitter inside a solid panel. Only real silhouette
    # boundaries become ink; original edge alpha supplies antialiasing.
    ink_alpha = np.where(ridge | edge, a, 0).astype(np.uint8)
    ink = Image.new('RGBA', body.size, (0, 0, 0, 0))
    ink.putalpha(Image.fromarray(ink_alpha))

    cartoon = settings.get('shadingStyle') == 'cartoon-cel'
    if cartoon:
        from cartoon_car_shading import cel_shading
        shade = cel_shading(luminance, reference, a, region, ink_alpha, settings)
    else:
        # Retained for replay of archived earlier revisions only.
        smooth = np.asarray(Image.fromarray(np.clip(luminance, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(settings.get('classificationBlur', 12))))
        ratio = smooth.astype(np.float32)/max(1, reference)
        shade = np.zeros_like(pixels)
        shade[:, :, 3] = np.select([ratio < .25, ratio < .5, ratio < .7, ratio < .9,
                                   ratio > 1.7, ratio > 1.2],
                                  [176, 132, 88, 40, 80, 40], default=0).astype(np.uint8)
        shade[ratio > 1, :3] = 255
        shade[:, :, 3] = np.where(region & (ink_alpha == 0), shade[:, :, 3], 0)
        shade[:, :, 3] = (shade[:, :, 3].astype(np.uint16)*a//255).astype(np.uint8)
    fixtures = pixels.copy()
    native=settings.get('sourceChannel')=='red'
    if native:
        shade=np.zeros_like(pixels)
        shade[:,:,3]=np.where(region&(ink_alpha==0),(255-pixels[:,:,0]).astype(np.uint16)*a//255,0).astype(np.uint8)
    fixtures[:, :, 3] = np.where(region | (ink_alpha > 0), 0, a)
    layers = {'paint': base, 'shading': Image.fromarray(shade),
              'fixtures': Image.fromarray(fixtures), 'linework': ink}
    if lights_mask is not None:
        if lights_mask.size != body.size:
            raise ValueError('Light contours must use the same native canvas as the body')
        coverage = np.asarray(lights_mask.getchannel('A') if 'A' in lights_mask.getbands() else lights_mask.convert('L')).astype(np.uint16)
        lights = pixels.copy()
        lights[:, :, 3] = np.where(ink_alpha > 0, 0, a.astype(np.uint16)*coverage//255).astype(np.uint8)
        fixtures[:, :, 3] = (fixtures[:, :, 3].astype(np.uint16)*(255-coverage)//255).astype(np.uint8)
        layers.update(lights=Image.fromarray(lights), fixtures=Image.fromarray(fixtures))
    return layers, {
                'sourceReferenceLuminance': reference,
                'shadingStyle': 'source-native-cel' if native else 'cartoon-cel' if cartoon else 'source-posterized',
                'shadowAlphaPalette': list(range(256)) if native else [0, 72, 140] if cartoon else [0, 40, 88, 132, 176],
                'highlightAlphaPalette': [0] if native else [0, 56] if cartoon else [0, 40, 80],
                'shadingRGBPalette': [[0, 0, 0], [255, 255, 255]],
                'baseRGB': [255, 255, 255], 'gradientInterpolation': False,
                'foundationOpacity': 'opaque interior; native antialiasing at silhouette and arch boundaries',
                'classificationBlurPixels': 0 if native or cartoon else settings.get('classificationBlur', 12)}


def prepare(source, target, revision, color):
    if target.exists():
        raise ValueError('Choose a new output revision; prior evidence is preserved')
    old = json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
    body = Image.open(source/'inputs/body.png').convert('RGBA')
    region_file = old['masks'].get('paintRegions', old['masks']['paint'])
    mask = Image.open(source/region_file).convert('RGBA')
    settings = old.get('flatPaint', {}).get('decompositionSettings', {})
    lights_file = old.get('masks', {}).get('lights')
    lights_mask = Image.open(source/lights_file) if lights_file else None
    result, report = decompose(body, mask, settings, lights_mask)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('qa', 'qa-refined', '*.zip', '__pycache__'))
    for role, image in result.items():
        image.save(target/'body'/f'{role}.png')
    shutil.copyfile(source/region_file, target/'masks/paint-regions.png')
    # Mask the entire base, including foundation hidden beneath fixed fixtures.
    result['paint'].save(target/'masks/paint-mask.png')
    manifest = old.copy()
    manifest['revision'] = revision
    manifest['paintLayerMode'] = 'foundation'
    manifest['bodyLayerMode'] = 'flat-cel'
    manifest['masks'] = {**old['masks'], 'paintRegions': 'masks/paint-regions.png'}
    manifest['layers'] = [l for l in old['layers'] if l['placement']['mode'] == 'anchor' or l['id'] == 'car-underlay']
    roles = [('paint', 400), ('shading', 410), ('fixtures', 440)] + ([('lights', 450)] if lights_file else []) + [('linework', 460)]
    for role, z in roles:
        manifest['layers'].append({'id': 'body-'+role, 'file': f'body/{role}.png', 'z': z,
                                   'placement': {'mode': 'canvas', 'x': 0, 'y': 0}})
    manifest['paintSamples'] = [{**point, 'expected': 'paint'} for point in old.get('paintSamples', [])]
    protected = old.get('fixtureSamples', []) if old.get('bodyLayerMode') == 'flat-cel' else [p for p in old.get('paintSamples', []) if p['expected'] == 'protected']
    manifest['fixtureSamples'] = [{k: v for k, v in point.items() if k != 'expected'} | {'layer': 'body-fixtures'}
                                  for point in protected
                                  if result['fixtures'].getpixel((point['x'], point['y']))[3] >= 128]
    manifest['flatPaint'] = {**report, 'factoryColor': color, 'decompositionSettings': settings,
        'stack': ['body-'+role for role, _ in roles]}
    manifest['notes'] = old.get('notes', []) + ['Uniform white paint foundation accepts an arbitrary RGB color. Separate black/white grayscale shading uses discrete opacity shapes; separate black linework defines silhouette/panels/details. Glass/lights/trim remain fixed above paint. No source hue or gradients are baked into paint/shading. Native body source, arbitrary arch contours, axle geometry and mechanical pixels are preserved.']
    (target/'car-sprite.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (target/'flat-paint-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    (target/'flat-paint-plan.json').write_text(json.dumps({'sourcePackage': source.as_posix(), 'sourceBodySha256': sha(source/'inputs/body.png'),
        'sourcePaintMaskSha256': sha(source/region_file), 'revision': revision, 'factoryColor': color,
        'algorithm': 'flat_car_layers.decompose', 'settings': settings}, indent=2)+'\n', encoding='utf-8')
    (target/'processing').mkdir(exist_ok=True)
    shutil.copyfile(Path(__file__), target/'processing/flat_car_layers.py')
    if settings.get('shadingStyle') == 'cartoon-cel':
        shutil.copyfile(Path(__file__).with_name('cartoon_car_shading.py'), target/'processing/cartoon_car_shading.py')
    for layer in manifest['layers']:
        if layer['id'] == 'car-underlay' or layer['placement']['mode'] == 'anchor':
            assert sha(source/layer['file']) == sha(target/layer['file'])
    print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision-offset', type=int, default=1)
    parser.add_argument('--source', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--revision', type=int)
    parser.add_argument('--color')
    parser.add_argument('--car', action='append', help='Runtime art ID from the original native-input packages; repeat to select several')
    args = parser.parse_args()
    if args.source or args.output:
        if not (args.source and args.output and args.revision and args.color):
            parser.error('Standalone replay requires --source, --output, --revision and --color')
        prepare(args.source, args.output, args.revision, args.color)
        raise SystemExit(0)
    root = Path(__file__).resolve().parents[1]
    catalog = json.loads((root/'src/assets/cars/manifest.json').read_text(encoding='utf-8'))
    if not args.car:
        parser.error('Select --car IDs or use standalone --source/--output. Additional-car packages use prepare-additional-flat-cars.py with this same decompose function.')
    jobs = []
    for id in dict.fromkeys(args.car):
        if id not in catalog['cars']:
            parser.error('Unknown runtime art ID: '+id)
        record = catalog['cars'][id]
        source = root/record['provenance']['sourcePackage']
        revision = record['provenance']['revision']+args.revision_offset
        target = root/'tests/car-integration/20261003'/id/f'flat-paint-v{revision}'
        if not (source/'inputs/body.png').is_file():
            parser.error(id+': use prepare-additional-flat-cars.py for its reviewed native body format')
        if target.exists():
            parser.error('Choose a new revision; output already exists: '+str(target))
        jobs.append((source, target, revision, record['paintColor']))
    # Validate the entire selection before creating any new package.
    for source, target, revision, color in jobs:
        prepare(source, target, revision, color)
