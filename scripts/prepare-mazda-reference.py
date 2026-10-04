"""Preserve native Mazda shading contours and fit its complete tire artwork.

This targeted revision keeps the uniform foundation, fixed fixtures, panel ink,
underlay, hub positions and all mechanical image bytes unchanged. Source red
channel intensity supplies a black alpha overlay; no polygon simplification or
blur invents new lighting shapes. Requires the preserved local source package.
"""
import hashlib
import json
from pathlib import Path
import shutil
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ID='mazda3-gt-turbo-sedan-2021-red'
SOURCE=ROOT/'tests/car-integration/20261003'/ID/'cartoon-v17'
TARGET=SOURCE.parent/'reference-fit-v18'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def reference_shading(body, foundation, region, ink):
    if len({im.size for im in (body,foundation,region,ink)})!=1:raise ValueError('Native layers must align')
    pixels=np.asarray(body.convert('RGBA'));alpha=np.asarray(foundation.convert('RGBA'))[:,:,3]
    selected=np.asarray(region.convert('RGBA'))[:,:,3]>0
    selected &= np.asarray(ink.convert('RGBA'))[:,:,3]==0
    shade=np.zeros_like(pixels)
    # Preserve the actual source-lit polygons and fine reflections. The source
    # is red: its red-channel strength records illumination without baking hue.
    shade[:,:,3]=np.where(selected,(255-pixels[:,:,0]).astype(np.uint16)*alpha//255,0).astype(np.uint8)
    return Image.fromarray(shade)

def prepare():
    if TARGET.exists():raise ValueError('Preserve previous runs; choose a new revision')
    old=json.loads((SOURCE/'car-sprite.json').read_text())
    for source in old.get('sources',[]):
        if source.get('archivedFile') and sha(SOURCE/source['archivedFile'])!=source['sha256']:raise ValueError('Preserved source changed')
    shutil.copytree(SOURCE,TARGET,ignore=shutil.ignore_patterns('qa','qa-refined','*.zip'))
    body=Image.open(SOURCE/'inputs/body.png').convert('RGBA')
    reference_shading(body,Image.open(SOURCE/'body/paint.png'),Image.open(SOURCE/old['masks']['paintRegions']),Image.open(SOURCE/'body/linework.png')).save(TARGET/'body/shading.png')
    manifest={**old,'revision':18}
    for layer in manifest['layers']:
        if layer['id'] in ('rear-wheel','front-wheel'):
            im=Image.open(SOURCE/layer['file']).convert('RGBA');pivot=layer['placement']['pivotNormalized'][1]*im.height
            bounds=im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
            visible_radius=bounds[3]-pivot
            layer['placement']['scale']=manifest['anchors'][layer['placement']['anchor']]['radius']/visible_radius
    manifest['flatPaint']={**old['flatPaint'],'shadingStyle':'source-native-cel','classificationBlurPixels':0,
        'decompositionSettings':{'algorithm':'prepare-mazda-reference.reference_shading','sourceChannel':'red'},
        'shadowAlphaPalette':list(range(256)),'highlightAlphaPalette':[0],
        'sourceContourPreservation':'Native red-channel illumination; no spatial filtering, tracing or simplification'}
    manifest['notes']+=['User reference repair: retain the original Mazda painted-panel shading contours with static black alpha over a uniform recolorable foundation. Tire images are unchanged; their placement scales now use the measured visible opaque radius (504 px) instead of an overstated 600 px, preserving axle hubs and the common ground line.']
    (TARGET/'processing').mkdir(exist_ok=True);shutil.copyfile(__file__,TARGET/'processing/prepare-mazda-reference.py')
    manifest['sources']+= [{'originalPath':'scripts/prepare-mazda-reference.py','archivedFile':'processing/prepare-mazda-reference.py','sha256':sha(Path(__file__))}]
    (TARGET/'car-sprite.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    for layer in manifest['layers']:
        if layer['id']!='body-shading':assert sha(SOURCE/layer['file'])==sha(TARGET/layer['file'])
    print(TARGET)
if __name__=='__main__':prepare()
