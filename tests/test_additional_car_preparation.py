"""Checks the defects found in the supplied source sheets, not visual taste."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
from PIL import Image,ImageDraw

spec=importlib.util.spec_from_file_location('preparation',Path(__file__).resolve().parents[1]/'scripts/prepare-additional-cars.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)

class PreparationTests(unittest.TestCase):
 def test_complete_brake_discs_have_no_occluded_wedge(self):
  for axle in ('front','rear'):
   rotor,caliper=pipeline.draw_brakes({'r':140,'id':'sample','caliper':'#c79b35'},axle,0)
   alpha=np.array(rotor)[:,:,3];side=rotor.width;c=side/2
   yy,xx=np.mgrid[:side,:side];rad=np.hypot(xx+.5-c,yy+.5-c)
   radius=140*(.69 if axle=='front' else .58)
   self.assertTrue((alpha[rad<radius-3]==255).all(),'the complete disc includes the caliper-hidden region')
   self.assertIsNotNone(caliper.getbbox());self.assertLess(caliper.getbbox()[2]-caliper.getbbox()[0],rotor.width*.3)

 def test_painted_fender_fragments_never_enter_rotating_tire_annulus(self):
  source=Image.new('RGBA',(320,320),(220,40,10,255));d=ImageDraw.Draw(source)
  d.ellipse((60,60,260,260),fill=(36,38,40,255));d.rectangle((60,60,260,105),fill=(245,245,245,255))
  plan={'r':100,'id':'sample','wheelStyle':'split-five'}
  wheel=pipeline.wheel_source(source,plan,(160,160));a=np.array(wheel)
  yy,xx=np.mgrid[:wheel.height,:wheel.width];rad=np.hypot(xx+.5-wheel.width/2,yy+.5-wheel.height/2)
  ring=(rad>83)&(rad<98)
  self.assertTrue((a[ring,3]>=250).all(),'complete tire, allowing the mask filter\'s small antialiasing undershoot')
  self.assertLess(int(a[ring,:3].max()),100,'white/red fender pixels are reconstructed as tire rubber')
  self.assertEqual(a[10,10,3],0,'outside the tire stays transparent')
  self.assertGreater(np.count_nonzero((a[:,:,3]==0)&(rad<70)),100,'spoke cavities remain open')
  self.assertEqual(wheel.tobytes(),pipeline.wheel_source(source,plan,(160,160)).tobytes(),'replay is deterministic')

 def test_changed_sources_and_existing_revisions_are_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);source=root/'master.png';Image.new('RGBA',(30,30),'red').save(source)
   path=root/'plan.json';plan={'id':'example','source':str(source),'sha256':'0'*64}
   path.write_text(json.dumps(plan),encoding='utf-8')
   with self.assertRaisesRegex(ValueError,'Source changed'):pipeline.prepare(path,1)
   plan['sha256']=pipeline.sha(source);path.write_text(json.dumps(plan),encoding='utf-8')
   (root/'example/prepared-v1').mkdir(parents=True)
   with patch.object(pipeline,'RUN',root):
    with self.assertRaisesRegex(ValueError,'overwrite'):pipeline.prepare(path,1)

 def test_front_and_rear_brake_sizes_are_independent(self):
  plan={'r':140,'id':'sample'}
  front,_=pipeline.draw_brakes(plan,'front',0);rear,_=pipeline.draw_brakes(plan,'rear',1)
  self.assertGreater(front.getbbox()[2]-front.getbbox()[0],rear.getbbox()[2]-rear.getbbox()[0])
  plan.update(id='ford-mustang-boss302-1969',rearDrum=True)
  drum,backing=pipeline.draw_brakes(plan,'rear',1)
  self.assertIsNotNone(drum.getbbox());self.assertLess(backing.getbbox()[3]-backing.getbbox()[1],25)

if __name__=='__main__':unittest.main()
