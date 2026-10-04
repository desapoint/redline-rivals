import sys
from pathlib import Path
import unittest
import json
import hashlib
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from flat_car_layers import source_shading


class NativeShadingTests(unittest.TestCase):
    def test_selected_revisions_replay_and_preserve_unrelated_artwork(self):
        root=Path(__file__).resolve().parents[1]
        plans=json.loads((root/'docs/art/native-shading-plans.json').read_text(encoding='utf-8'))
        count=0
        for plan in plans:
            p=root/plan['outputPackage']
            if not p.exists():continue
            count+=1;manifest=json.loads((p/'car-sprite.json').read_text(encoding='utf-8'));settings=plan['settings']
            shade=source_shading(Image.open(p/plan['sourceBody']),Image.open(p/'body/paint.png'),Image.open(p/manifest['masks']['paintRegions']),Image.open(p/'body/linework.png'),settings['referenceValue'])
            self.assertEqual(shade.tobytes(),Image.open(p/'body/shading.png').convert('RGBA').tobytes(),plan['vehicle'])
            for path,digest in plan['unchangedFiles'].items():
                self.assertEqual(hashlib.sha256((p/path).read_bytes()).hexdigest(),digest,path)
            runtime=Image.open(root/'src/assets/cars'/plan['vehicle']/'shading.webp').convert('RGBA')
            self.assertEqual(shade.tobytes(),runtime.tobytes(),plan['vehicle']+' lossless runtime shading')
        if not count:self.skipTest('Native art workspace is not included in the public demo')

    def test_factory_brightness_and_sharp_reflections_survive_without_filtering(self):
        for reference in (56,138,229,255):
            body=Image.new('RGBA',(256,2))
            for x in range(256):
                body.putpixel((x,0),(0,x,x//2,255));body.putpixel((x,1),(0,255-x,0,255))
            foundation=Image.new('RGBA',body.size,'white');ink=Image.new('RGBA',body.size)
            shade=source_shading(body,foundation,foundation,ink,reference)
            assembled=Image.new('RGBA',body.size,(0,reference,0,255));assembled.alpha_composite(shade)
            actual=np.asarray(assembled)[:,:,1].astype(int);expected=np.asarray(body)[:,:,1].astype(int)
            self.assertLessEqual(np.abs(actual-expected).max(),1)
            rgb=np.asarray(shade)[:,:,:3]
            self.assertTrue(np.array_equal(rgb[:,:,0],rgb[:,:,1]));self.assertTrue(set(np.unique(rgb))<={0,255})

    def test_fixture_and_outline_exclusions_and_native_alpha(self):
        body=Image.new('RGBA',(4,1),(0,64,128,255));base=Image.new('RGBA',body.size,'white')
        region=base.copy();region.putpixel((0,0),(0,0,0,0))
        ink=Image.new('RGBA',body.size);ink.putpixel((1,0),(0,0,0,255));base.putpixel((3,0),(255,255,255,128))
        shade=source_shading(body,base,region,ink,255)
        self.assertEqual([shade.getpixel((x,0))[3] for x in range(4)],[0,0,127,63])

    def test_invalid_inputs_rejected_and_mazda_replay_unchanged(self):
        image=Image.new('RGBA',(2,2),(170,20,30,255));blank=Image.new('RGBA',image.size);white=Image.new('RGBA',image.size,'white')
        self.assertEqual(source_shading(image,white,white,blank,255,'red').getpixel((0,0)),(0,0,0,85))
        with self.assertRaises(ValueError):source_shading(image,white,white,blank,0)
        with self.assertRaises(ValueError):source_shading(image,white,white,blank,255,'hue')
        with self.assertRaises(ValueError):source_shading(image,Image.new('RGBA',(3,3)),white,blank)


if __name__=='__main__':unittest.main()
