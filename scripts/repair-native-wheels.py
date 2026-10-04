"""Targeted, source-hashed rim extraction; retain every unrelated accepted layer.

Measured centers and spoke supports come from the archived illustration, not
wheel detection. Full tires remain circular; hidden brakes are drawn separately.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import shutil
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(path, data):
    path.write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')

def extract_rim(master, accepted, radius, measurement, style):
    """Keep measured native metal; remove the source's repeated brake cavities."""
    side=accepted.width; half=side/2; scale=4
    yy,xx=np.mgrid[:side,:side]; dx=xx+.5-half; dy=yy+.5-half; rad=np.hypot(dx,dy)
    rim_radius=radius*measurement['targetRimRatio']
    ratio=measurement['sourceRimRadius']/rim_radius
    cx,cy=measurement['sourceCenter']
    # Map the measured visual hub to the existing exact component pivot.
    native=master.transform((side,side),Image.Transform.AFFINE,
        (ratio,0,cx-ratio*half,0,ratio,cy-ratio*half),Image.Resampling.BICUBIC)
    pixels=np.asarray(native).copy()
    support=Image.new('L',(side*scale,side*scale));d=ImageDraw.Draw(support)
    c=half*scale; rr=rim_radius*scale
    def point(angle,r):
        theta=math.radians(angle)
        return c+math.cos(theta)*rr*r,c+math.sin(theta)*rr*r
    d.ellipse((c-rr,c-rr,c+rr,c+rr),fill=255)
    if style=='ten-native':
        # Ten straight native arms, not the old invented five Y branches.
        d.ellipse((c-rr*.89,c-rr*.89,c+rr*.89,c+rr*.89),fill=0)
        for angle in measurement['spokeAngles']:
            d.polygon([point(angle-9,.23),point(angle-3,.89),
                       point(angle+3,.89),point(angle+9,.23)],fill=255)
        d.ellipse((c-rr*.29,c-rr*.29,c+rr*.29,c+rr*.29),fill=255)
    else:
        # Boss holes stop inside the chrome rim, between the native five arms.
        for angle in measurement['openingAngles']:
            d.polygon([point(angle-9,.32),point(angle-23,.68),
                       point(angle-16,.86),point(angle+16,.86),
                       point(angle+23,.68),point(angle+9,.32)],fill=0)
    mask=np.asarray(support.resize((side,side),Image.Resampling.LANCZOS))
    # Remove only colored fringe adjacent to the measured metal boundary.
    rgb=pixels[:,:,:3].astype(np.int16)
    fringe=(rgb.max(2)-rgb.min(2)>24)&(rad<rim_radius*.90)&(rad>rim_radius*.30)&(mask>0)
    pixels[fringe,:3]=np.clip(rgb[fringe].mean(1)*.55,14,50).astype('uint8')[:,None]
    pixels[:,:,3]=mask
    # The accepted circular tire has verified tread, alpha and ground contact.
    tire=np.asarray(accepted).copy()
    inside=rad<=rim_radius+.5
    tire[inside]=pixels[inside]
    tire[tire[:,:,3]==0,:3]=0
    return Image.fromarray(tire)

def brakes(radius, side, axle, style, color):
    """Complete dark steel disc/drum and one fixed, shaded caliper per axle."""
    s=4;center=side*s/2
    drum=style=='boss-native' and axle=='rear'
    ratio=(.43 if drum else .48) if style=='boss-native' else (.56 if axle=='rear' else .66)
    r=radius*ratio*s
    yy,xx=np.mgrid[:side*s,:side*s];dist=np.hypot(xx+.5-center,yy+.5-center)
    brightness=(34 if drum else 58)+3*np.sin(dist*.9)+7*(center-yy)/max(r,1)
    array=np.zeros((side*s,side*s,4),dtype='uint8')
    array[:,:,:3]=np.clip(brightness,0,255).astype('uint8')[:,:,None]
    array[:,:,3]=np.clip((r+.5-dist)*255,0,255).astype('uint8')
    rotor=Image.fromarray(array);d=ImageDraw.Draw(rotor)
    for fraction,c in [(1,'#23272c'),(.97,'#73767a'),(.47,'#272b30')]:
        rr=r*fraction;d.ellipse((center-rr,center-rr,center+rr,center+rr),outline=c,width=s)
    rr=r*.43;d.ellipse((center-rr,center-rr,center+rr,center+rr),fill='#30353b',outline='#555b61',width=s)
    for angle in range(0,360,72):
        t=math.radians(angle);x=center+math.cos(t)*r*.30;y=center+math.sin(t)*r*.30
        d.ellipse((x-2*s,y-2*s,x+2*s,y+2*s),fill='#8e9398')
    caliper=Image.new('RGBA',rotor.size);d=ImageDraw.Draw(caliper)
    if drum:
        d.rounded_rectangle((center-12*s,center-r*.64-4*s,center+12*s,center-r*.64+4*s),radius=3*s,fill='#363b40',outline='#73797e',width=s)
    else:
        x=center-r*.86;length=r*(.92 if axle=='front' else .72);width=r*.30
        d.rounded_rectangle((x-width/2,center-length/2,x+width/2,center+length/2),radius=width*.25,fill='#171b20')
        rgb=tuple(int(color[i:i+2],16) for i in (1,3,5))
        mid=tuple(round(v*.77) for v in rgb);light=tuple(min(255,round(v*.7+44)) for v in rgb)
        d.rounded_rectangle((x-width*.43,center-length*.46,x+width*.43,center+length*.46),radius=width*.22,fill=mid)
        d.line((x-width*.27,center-length*.35,x-width*.27,center+length*.35),fill=light,width=2*s)
        for offset in (-.30,.30):
            y=center+length*offset;d.ellipse((x-2*s,y-2*s,x+2*s,y+2*s),fill='#1b2026',outline='#737980',width=s)
        d.line((x+width*.13,center-length*.23,x+width*.13,center+length*.23),fill='#24282d',width=s)
    return tuple(im.resize((side,side),Image.Resampling.LANCZOS) for im in (rotor,caliper))

def prepare(workspace, plans_path):
    plans=json.loads(plans_path.read_text(encoding='utf-8'))
    for plan in plans:
        source=workspace/plan['sourcePackage'];out=workspace/plan['outputPackage']
        if out.exists():raise ValueError('Refusing to overwrite previous revision: '+str(out))
        master_path=source/'inputs/master.png'
        if sha(master_path)!=plan['masterSha256']:raise ValueError('Native master hash changed')
        old=json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
        if sha(source/'car-sprite.json')!=plan['manifestSha256']:raise ValueError('Accepted manifest changed')
        manifest=copy.deepcopy(old);manifest['revision']=plan['revision']
        changed={f'{axle}-{part}.png' for axle in ('rear','front') for part in ('wheel','rotor','caliper')}
        unchanged={l['file']:sha(source/l['file']) for l in old['layers'] if l['file'] not in changed}
        unchanged.update({file:sha(source/file) for file in old['masks'].values()})
        shutil.copytree(source,out,ignore=shutil.ignore_patterns('qa','qa-refined','*.zip','__pycache__'))
        master=Image.open(master_path).convert('RGBA')
        for axle in ('rear','front'):
            radius=old['anchors'][axle+'Wheel']['radius']
            accepted=Image.open(source/f'{axle}-wheel.png').convert('RGBA')
            wheel=extract_rim(master,accepted,radius,plan['measurements'][axle],plan['style'])
            rotor,caliper=brakes(radius,wheel.width,axle,plan['style'],plan['caliperColor'])
            for kind,im in [('wheel',wheel),('rotor',rotor),('caliper',caliper)]:im.save(out/f'{axle}-{kind}.png')
        archive=out/'processing/native-wheels';archive.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(__file__,archive/'repair-native-wheels.py')
        write(archive/'plan.json',plan)
        for name in ('repair-native-wheels.py','plan.json'):
            manifest['sources'].append({'originalPath':'scripts/repair-native-wheels.py' if name.endswith('.py') else plans_path.name,
                'archivedFile':'processing/native-wheels/'+name,'sha256':sha(archive/name)})
        manifest['notes'].append('Targeted native-rim repair: measured source hub remapped to unchanged component pivot; source spoke metal, bevels, hub and rim lip retained with transparent cavities. Circular accepted tires and all body/shader/fixture/underlay/paint bytes unchanged. Complete steel rotors and single fixed calipers modeled independently; mechanical details are illustrated approximations.')
        write(out/'car-sprite.json',manifest)
        write(out/'wheel-repair-plan.json',{**plan,'unchangedFiles':unchanged})
        for file,digest in unchanged.items():
            if sha(out/file)!=digest:raise ValueError('Unrelated artwork changed: '+file)
        print(out)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--workspace',type=Path,default=ROOT)
    p.add_argument('--plans',type=Path,default=ROOT/'docs/art/native-wheel-plans.json')
    args=p.parse_args();prepare(args.workspace,args.plans)
