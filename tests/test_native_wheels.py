import importlib.util
import json
import math
import os
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=Path(os.environ.get('REDLINE_ART_WORKSPACE',ROOT))
spec=importlib.util.spec_from_file_location('wheel_repair',ROOT/'scripts/repair-native-wheels.py')
repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)
PLANS=json.loads((ROOT/'docs/art/native-wheel-plans.json').read_text(encoding='utf-8'))

class NativeWheelTests(unittest.TestCase):
    def test_runtime_has_reviewed_separate_parts_and_keeps_accepted_geometry(self):
        catalog=json.loads((ROOT/'src/assets/cars/manifest.json').read_text(encoding='utf-8'))
        for plan in PLANS:
            id=plan['vehicle'];car=catalog['cars'][id]
            snapshot=ROOT/'docs/art/runtime-provenance'/id
            manifest=json.loads((snapshot/'car-sprite.json').read_text(encoding='utf-8'))
            review=json.loads((snapshot/'visual-review.json').read_text(encoding='utf-8'))
            self.assertTrue(review['accepted']);self.assertEqual(review['unresolvedIssues'],[])
            self.assertEqual(car['provenance']['reviewFingerprint'],review['contentFingerprint'])
            self.assertEqual(car['provenance']['sourcePackage'],plan['outputPackage'])
            self.assertEqual(manifest['revision'],12)
            for slot in car['wheels']:
                anchor=manifest['anchors'][slot['axle']+'Wheel']
                self.assertEqual([slot[k] for k in ('x','y','radius')],[anchor[k] for k in ('x','y','radius')])
                for role,part in [('wheel','wheel'),('rotor','rotor'),('brake','caliper')]:
                    desc=slot[role];im=Image.open(ROOT/'src/assets/cars'/desc['file']).convert('RGBA')
                    self.assertEqual(desc['pivot'],[im.width/2,im.height/2])
                    layer=next(l for l in manifest['layers'] if l['id']==slot['axle']+'-'+part)
                    self.assertEqual(layer['rotateWithWheel'],role!='brake')
                wheel=np.asarray(Image.open(ROOT/'src/assets/cars'/slot['wheel']['file']).convert('RGBA'))
                c=wheel.shape[0]/2;r=slot['radius']
                # Measured cavity centers, safely between the retained source spokes.
                angles=(-90,-18,54,126,198) if plan['style']=='boss-native' else (-90,-54,-18,18,54,90,126,162,198,234)
                for angle in angles:
                    rad=r*(.38 if plan['style']=='boss-native' else .5);t=math.radians(angle)
                    self.assertEqual(wheel[round(c+math.sin(t)*rad),round(c+math.cos(t)*rad),3],0,(id,slot['axle'],angle))
                self.assertEqual(wheel[round(c),round(c),3],255,'native hub remains opaque')
                self.assertEqual(wheel[-1,:,3].max(),0,'transparent safety margin')

    def test_native_replay_preserves_source_pixels_and_every_unrelated_file(self):
        count=0
        for plan in PLANS:
            source=WORKSPACE/plan['sourcePackage'];out=WORKSPACE/plan['outputPackage']
            if not out.exists():continue
            count+=1;manifest=json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
            proof=json.loads((out/'wheel-repair-plan.json').read_text(encoding='utf-8'))
            master=Image.open(source/'inputs/master.png').convert('RGBA')
            self.assertEqual(repair.sha(source/'inputs/master.png'),plan['masterSha256'])
            for path,digest in proof['unchangedFiles'].items():
                self.assertEqual(repair.sha(out/path),digest,plan['vehicle']+' '+path)
            for axle in ('rear','front'):
                old=Image.open(source/f'{axle}-wheel.png').convert('RGBA');r=manifest['anchors'][axle+'Wheel']['radius']
                replay=repair.extract_rim(master,old,r,plan['measurements'][axle],plan['style'])
                new=Image.open(out/f'{axle}-wheel.png').convert('RGBA')
                self.assertEqual(new.tobytes(),replay.tobytes())
                yy,xx=np.mgrid[:new.height,:new.width];ring=np.hypot(xx+.5-new.width/2,yy+.5-new.height/2)>r*.81
                self.assertTrue(np.array_equal(np.asarray(new)[ring],np.asarray(old)[ring]),'accepted full tire and contact pixels preserved')
                rotor,caliper=repair.brakes(r,new.width,axle,plan['style'],plan['caliperColor'])
                for part,image in [('wheel',new),('rotor',rotor),('caliper',caliper)]:
                    self.assertEqual(Image.open(out/f'{axle}-{part}.png').convert('RGBA').tobytes(),image.tobytes())
                    runtime=Image.open(ROOT/'src/assets/cars'/plan['vehicle']/f'{axle}-{part}.webp').convert('RGBA')
                    self.assertEqual(runtime.tobytes(),image.tobytes(),'lossless reviewed runtime '+part)
        if not count:self.skipTest('Full native sources remain in the local art workspace')

if __name__=='__main__':unittest.main()
