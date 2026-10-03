"""Show isolated flat-body layers, arbitrary colors and current full sprite QA."""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw

sys.path.insert(0, 'C:/Users/jason/.codex/skills/racing-car-sprites/scripts')
from sprite_qa import render

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('packages', type=Path, nargs='+')
args = parser.parse_args()
for package in args.packages:
    manifest = json.loads((package/'car-sprite.json').read_text(encoding='utf-8'))
    mask = Image.open(package/'body/paint.png').convert('RGBA')
    sheet = Image.new('RGB', (1500, 900), '#b0b0b0')
    draw = ImageDraw.Draw(sheet)
    for i, role in enumerate(['paint', 'shading', 'fixtures', 'linework']):
        im = Image.open(package/'body'/f'{role}.png').convert('RGBA')
        im.thumbnail((740, 200))
        x, y = i%2*750, i//2*220
        sheet.paste(im, (x+(750-im.width)//2, y+25), im)
        draw.text((x+6, y+5), role, fill='black')
    for i, color in enumerate([manifest['flatPaint']['factoryColor'], '#009cff', '#ffffff', '#000000']):
        im = render(package, manifest, recolor=(mask, color))
        im.thumbnail((740, 200))
        x, y = i%2*750, 440+i//2*225
        sheet.paste(im, (x+(750-im.width)//2, y+25), im)
        draw.text((x+6, y+5), color, fill='black')
    sheet.save(package.parent/(package.name+'-layers.jpg'), quality=96)
    names = ['rotation-0.png', 'rotation-45.png', 'rotation-90.png', 'rotation-180.png',
        'calipers-0.jpg', 'calipers-45.jpg', 'calipers-90.jpg', 'calipers-180.jpg',
        'isolated-wheel.jpg', 'isolated-rotor.jpg', 'isolated-caliper.jpg', 'isolated-underlay.jpg',
        'wheels-hidden.png', 'checkerboard.jpg', 'on-black.jpg', 'on-white.jpg', 'on-gray.jpg',
        'paint-mask-overlay.jpg', 'recolor-check.jpg']
    sheet = Image.new('RGB', (1500, 7*235), '#888888')
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        im = Image.open(package/'qa'/name).convert('RGBA')
        im.thumbnail((490, 204))
        x, y = i%3*500, i//3*235
        sheet.paste(im, (x+(500-im.width)//2, y+25), im)
        draw.text((x+6, y+5), name, fill='black')
    sheet.save(package.parent/(package.name+'-full-qa.jpg'), quality=95)
    print(package)
