"""Deterministically adapt the four reviewed native packs to the game contract.

Requires Pillow. Sources/review evidence remain in their original package directories.
Only the selected IDs are updated; existing manifest entries are retained.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/assets/cars'
SOURCE = ROOT / 'tests/skill-runs/20261002-pipeline/examples'
SELECTED = {
    'mazda3-gt-turbo-sedan-2021-red': '#a91f2c',
    'chevrolet-silverado-1500-custom-crew-short-2025-black': '#202226',
    'kia-forte-gt-sedan-2022-orange': '#ef721b',
    'nissan-rogue-2020-red': '#a92331',
}
NEXT_PACKS = {'chevrolet-silverado-1500-custom-crew-short-2025-black':'wheel-fit-v11','kia-forte-gt-sedan-2022-orange': 'wheel-fit-v2', 'nissan-rogue-2020-red': 'wheel-fit-v3'}
PLACEMENT_PACKS = {
    'mazda3-gt-turbo-sedan-2021-red': 'reference-fit-v18',
    'chevrolet-silverado-1500-custom-crew-short-2025-black': 'native-detail-v29',
    'kia-forte-gt-sedan-2022-orange': 'native-detail-v13',
    'nissan-rogue-2020-red': 'native-detail-v14',
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def fingerprint(directory, manifest):
    h = hashlib.sha256(json.dumps(manifest, sort_keys=True, separators=(',', ':'), allow_nan=False).encode())
    paths = {layer['file'] for layer in manifest['layers']}
    paths.update(v for v in manifest.get('masks', {}).values() if v)
    for relative in sorted(paths):
        h.update(relative.encode())
        h.update(bytes.fromhex(digest(directory / relative)))
    return h.hexdigest()

def export_image(image, vehicle_id, filename):
    out = RUNTIME / vehicle_id / filename
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, 'WEBP', lossless=True, exact=True, method=6)
    return {'file': f'{vehicle_id}/{filename}', 'width': image.width, 'height': image.height}

def main(selected=None):
    selected = SELECTED if selected is None else {id: SELECTED[id] for id in selected}
    manifest_path = RUNTIME / 'manifest.json'
    runtime = json.loads(manifest_path.read_text(encoding='utf-8'))
    specifications = {}
    for vehicle_id, color in selected.items():
        selected_pack = PLACEMENT_PACKS.get(vehicle_id) or NEXT_PACKS.get(vehicle_id)
        directory = ROOT / 'tests/car-integration/20261003' / vehicle_id / selected_pack if selected_pack else SOURCE / vehicle_id / 'reviewed-v9'
        qa = 'qa' if selected_pack else 'qa-refined'
        pack = json.loads((directory / 'car-sprite.json').read_text(encoding='utf-8'))
        review = json.loads((directory / qa / 'visual-review.json').read_text(encoding='utf-8'))
        report_path = directory / qa / 'qa-report.json'
        report = json.loads(report_path.read_text(encoding='utf-8'))
        current = fingerprint(directory, pack)
        if not review['accepted'] or review['unresolvedIssues'] or report['problems'] or review['contentFingerprint'] != current or review['qaReportHash'] != digest(report_path):
            raise ValueError(f'{vehicle_id}: reviewed QA does not match source bytes')
        layers = {layer['id']: layer for layer in pack['layers']}
        # Keep the raw selected master archived; export the reviewed decomposed stack.
        source_body = directory/'inputs/body.png'
        staged_body = ROOT/'docs/art/staged-roster'/vehicle_id/'body-2d.png'
        if digest(source_body) != digest(staged_body):
            raise ValueError(f'{vehicle_id}: selected -2d master differs from reviewed source')
        flat = pack.get('bodyLayerMode') == 'flat-cel'
        body = Image.open(directory / layers['body-paint']['file'] if flat else source_body).convert('RGBA')
        record = {**pack['canvas'], 'facing': pack['vehicle']['facing'], 'paintColor': color, 'wheels': [], 'layers': {}}
        if pack.get('archProfiles'):
            record['archProfiles'] = pack['archProfiles']
        record['layers']['body'] = export_image(body, vehicle_id, 'body.webp')
        if flat:
            record['paintMode'] = 'flat-cel'
            record['flatPaint'] = pack['flatPaint']
            for role in ('shading', 'fixtures', 'linework'):
                record['layers'][role] = export_image(Image.open(directory / layers['body-'+role]['file']), vehicle_id, role+'.webp')
            if 'body-lights' in layers:
                record['layers']['lights'] = export_image(Image.open(directory/layers['body-lights']['file']), vehicle_id, 'lights.webp')
        record['layers']['underlay'] = export_image(Image.open(directory / layers['car-underlay']['file']), vehicle_id, 'underlay.webp')
        record['layers']['paintMask'] = export_image(Image.open(directory / pack['masks']['paint']), vehicle_id, 'paint-mask.webp')
        combined = body.copy()
        combined.alpha_composite(Image.open(directory / layers['car-underlay']['file']).convert('RGBA'))
        for axle in ('rear', 'front'):
            anchor = pack['anchors'][f'{axle}Wheel']
            slot = {'axle': axle, **anchor}
            for kind, runtime_kind in [('wheel', 'wheel'), ('caliper', 'brake'), ('rotor', 'rotor')]:
                layer = layers[f'{axle}-{kind}']
                placement = layer['placement']
                if placement['offset'] != [0, 0] or placement['anchor'] != f'{axle}Wheel':
                    raise ValueError('Converter requires same-hub mechanical placement')
                image = Image.open(directory / layer['file']).convert('RGBA')
                output = export_image(image, vehicle_id, f'{axle}-{kind}.webp')
                output['pivot'] = [placement['pivotNormalized'][0] * image.width, placement['pivotNormalized'][1] * image.height]
                output['radius'] = anchor['radius'] / placement['scale']
                slot[runtime_kind] = output
            runtime['cars'][vehicle_id] = record
            record['wheels'].append(slot)
        # Native bounds include the exterior and measured complete tires, excluding empty source margins.
        bounds = combined.getbbox()
        for slot in record['wheels']:
            bounds = (min(bounds[0], slot['x']-slot['radius']), min(bounds[1], slot['y']-slot['radius']), max(bounds[2], slot['x']+slot['radius']), max(bounds[3], slot['y']+slot['radius']))
        record['bounds'] = [bounds[0], bounds[1], bounds[2]-bounds[0], bounds[3]-bounds[1]]
        # The masters contain very faint alpha dust far beyond the visible silhouette.
        # Ignore it only for framing; retain every source pixel in the native runtime images.
        visible = body.getchannel('A').point(lambda alpha: 255 if alpha >= 8 else 0).getbbox()
        for slot in record['wheels']:
            visible = (min(visible[0], slot['x']-slot['radius']), min(visible[1], slot['y']-slot['radius']), max(visible[2], slot['x']+slot['radius']), max(visible[3], slot['y']+slot['radius']))
        record['displayBounds'] = [visible[0], visible[1], visible[2]-visible[0], visible[3]-visible[1]]
        metadata_file = 'referenceMetadata.json'
        reference = json.loads((directory / 'inputs' / metadata_file).read_text(encoding='utf-8'))
        specifications[vehicle_id] = {k: reference[k] for k in ('manufacturerReference', 'gameplayModel')}
        (RUNTIME / vehicle_id / 'specifications.json').write_text(json.dumps(specifications[vehicle_id], indent=2)+'\n', encoding='utf-8')
        snapshot = ROOT/'docs/art/runtime-provenance'/vehicle_id
        snapshot.mkdir(parents=True,exist_ok=True)
        (snapshot/'car-sprite.json').write_bytes((directory/'car-sprite.json').read_bytes())
        (snapshot/'visual-review.json').write_bytes((directory/qa/'visual-review.json').read_bytes())
        record['provenance'] = {'sourcePackage': directory.relative_to(ROOT).as_posix(), 'sourceManifest':(snapshot/'car-sprite.json').relative_to(ROOT).as_posix(), 'bodySource': staged_body.relative_to(ROOT).as_posix(),'bodySourceSha256':digest(source_body), 'revision': pack['revision'], 'reviewFingerprint': current, 'sourceManifestSha256': digest(directory / 'car-sprite.json'), 'conversion': 'Reviewed uniform paint foundation, discrete grayscale/alpha shading, fixed fixtures and independent black line art decoded to lossless WebP. Original -2d master is archived unchanged; runtime recolors only the uniform foundation. Separate underlay follows native arch contours; original mechanical pixels/scales/pivots retained. Display framing ignores alpha below 8. Full source packages stay in the local art workspace; compact manifest/review snapshots accompany the public demo.' if flat else 'Native master and measured mechanical layers converted to lossless WebP.'}
        (RUNTIME / vehicle_id / 'provenance.json').write_text(json.dumps(record['provenance'], indent=2)+'\n', encoding='utf-8')
    # Merge only selected IDs into the latest catalog so another art workflow
    # can add its own cars during conversion without losing those records.
    latest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for vehicle_id in selected:
        latest['cars'][vehicle_id] = runtime['cars'][vehicle_id]
    manifest_path.write_text(json.dumps(latest, indent=2)+'\n', encoding='utf-8')
    if set(selected)==set(SELECTED):
        (ROOT / 'src/real-car-specs.js').write_text('// Derived from the archived manufacturer research. Unknown factory facts remain null.\nexport const REAL_CAR_SPECS = '+json.dumps(specifications, indent=2)+';\n', encoding='utf-8')
    print(f'Imported {len(selected)} reviewed native vehicle packs and archived source specifications.')

if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--car',action='append',choices=SELECTED)
    main(parser.parse_args().car)
