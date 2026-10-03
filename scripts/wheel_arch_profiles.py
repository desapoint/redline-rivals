"""Explicit native-coordinate arch masks, independent of tire circles.

Rounded rectangles and measured polygons bound the wheel-well backing. Source
alpha supplies the final inner fender edge; this never cuts or repaints a body.
"""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter


def profile_mask(size, profiles):
    mask = Image.new('L', size)
    draw = ImageDraw.Draw(mask)
    for profile in profiles:
        if profile['shape'] == 'rounded-rectangle':
            left, top, right, bottom = profile['bounds']
            radii = profile['cornerRadii']  # top-left, top-right, bottom-right, bottom-left
            if not (0 <= left < right < size[0] and 0 <= top < bottom < size[1]):
                raise ValueError('Arch bounds must stay within the native canvas')
            if len(radii) != 4 or any(not math.isfinite(r) or r < 0 or r > min(right-left, bottom-top)/2 for r in radii):
                raise ValueError('Invalid arch corner radii')
            points = []
            corners = [(left+radii[0], top+radii[0], 180),
                       (right-radii[1], top+radii[1], 270),
                       (right-radii[2], bottom-radii[2], 0),
                       (left+radii[3], bottom-radii[3], 90)]
            for radius, (cx, cy, start) in zip(radii, corners):
                for step in range(25):
                    angle = math.radians(start+step*90/24)
                    points.append((cx+radius*math.cos(angle), cy+radius*math.sin(angle)))
        elif profile['shape'] == 'contour':
            points = profile['points']
            if len(points) < 3 or any(not (0 <= x < size[0] and 0 <= y < size[1]) for x, y in points):
                raise ValueError('Measured contours need at least three in-canvas points')
        else:
            raise ValueError('Specify rounded-rectangle or contour; tire anchors are not arch profiles')
        draw.polygon(points, fill=255)
    return mask


def source_opening_mask(body, profile):
    """Trace a connected alpha opening, rejecting a ROI that cuts its fender.

    No geometric fit is involved. The supplied seed selects the intended well;
    ROI bottom defines the rocker cutoff. Side/top contacts require a wider ROI.
    Alpha threshold selects connectivity only; original alpha defines the edge.
    """
    left, top, right, bottom = profile['bounds']
    x, y = profile['seed']
    if not (0 <= left < right < body.width and 0 <= top < bottom < body.height):
        raise ValueError('Opening bounds must stay within the native canvas')
    if not (left < x < right and top < y < bottom):
        raise ValueError('Opening seed must lie inside its bounds')
    threshold = profile.get('connectivityAlpha', 128)
    if not isinstance(threshold, int) or not 1 <= threshold <= 254:
        raise ValueError('Connectivity alpha must be between 1 and 254')
    alpha = body.getchannel('A').crop((left, top, right+1, bottom+1))
    available = alpha.point(lambda a: 255 if a < threshold else 0)
    seed = (x-left, y-top)
    if available.getpixel(seed) != 255:
        raise ValueError('Opening seed lies on body pixels, not inside the wheel well')
    ImageDraw.floodfill(available, seed, 128)
    selected = available.point(lambda a: 255 if a == 128 else 0)
    w, h = selected.size
    if any(selected.crop(box).getbbox() for box in [(0, 0, w, 1), (0, 0, 1, h), (w-1, 0, w, h)]):
        raise ValueError('Opening reaches top/side bounds; enlarge ROI or raise rocker cutoff')
    # Include one pixel of the original antialiased fender edge, never invent it.
    selected = selected.filter(ImageFilter.MaxFilter(3))
    mask = Image.new('L', body.size)
    mask.paste(selected, (left, top))
    return mask


def underlay_for(body, profiles, color=(16, 18, 22)):
    mask = Image.new('L', body.size)
    for profile in profiles:
        current = source_opening_mask(body, profile) if profile['shape'] == 'source-opening' else profile_mask(body.size, [profile])
        mask = ImageChops.lighter(mask, current)
    result = Image.new('RGBA', body.size, (*color, 0))
    result.putalpha(ImageChops.multiply(mask, ImageChops.invert(body.getchannel('A'))))
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def repair(plan_path, target):
    plan = json.loads(plan_path.read_text(encoding='utf-8'))
    root = Path(__file__).resolve().parents[1]
    source = root / plan['sourcePackage']
    body_path = source / 'inputs/body.png'
    if digest(body_path) != plan['bodySha256']:
        raise ValueError('Source body differs from measured arch plan')
    # Compute and validate before creating a new revision; preserve all earlier runs.
    underlay = underlay_for(Image.open(body_path).convert('RGBA'), plan['profiles'])
    if target.exists():
        raise ValueError('Use a new revision directory')
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('qa', 'qa-refined', '*.zip', '__pycache__'))
    manifest_path = target / 'car-sprite.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    layer_file = next(layer['file'] for layer in manifest['layers'] if layer['id'] == 'car-underlay')
    underlay.save(target / layer_file)
    manifest['revision'] = plan['revision']
    manifest['archProfiles'] = plan['profiles']
    manifest['notes'].append('Independent arch profiles follow original body alpha; source-opening profiles trace connected native contours of any shape. Tire circles only locate rotating components. Native fenders, wheel placement, paint masks and separated mechanical pixels unchanged.')
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (target / 'arch-preparation-plan.json').write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    files = {layer['file'] for layer in manifest['layers']} | set(manifest['masks'].values())
    unchanged = {file: digest(source / file) for file in files if file != layer_file}
    assert all(digest(target / file) == expected for file, expected in unchanged.items())
    (target / 'arch-correction.json').write_text(json.dumps({'unchangedLayerHashes': unchanged,
        'bodySha256': digest(body_path), 'changedLayer': layer_file,
        'constraints': ['Profiles are independent of tire anchors.', 'No body pixels modified.',
                        'Backing bounded above rocker; source alpha preserves the illustrated edge.']}, indent=2)+'\n', encoding='utf-8')
    print(target)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('target', type=Path)
    args = parser.parse_args()
    repair(args.plan, args.target)
