import importlib.util
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

spec=importlib.util.spec_from_file_location('mazda',Path(__file__).resolve().parents[1]/'scripts/prepare-mazda-reference.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class MazdaReferenceTests(unittest.TestCase):
    def test_source_contours_survive_without_blurring_or_grid_blocks(self):
        body=Image.new('RGBA',(9,5),(255,20,30,255));pixels=np.asarray(body).copy()
        pixels[1:4,4:,0]=147;pixels[2,3,0]=91;body=Image.fromarray(pixels)
        base=Image.new('RGBA',body.size,'white');region=Image.new('RGBA',body.size,'white');ink=Image.new('RGBA',body.size)
        region.putpixel((5,2),(0,0,0,0));ink.putpixel((6,2),(0,0,0,255))
        out=np.asarray(mod.reference_shading(body,base,region,ink))
        self.assertEqual(out[2,3,3],164);self.assertEqual(out[1,4,3],108);self.assertEqual(out[0,4,3],0)
        self.assertEqual(out[2,5,3],0);self.assertEqual(out[2,6,3],0)
        self.assertTrue(np.all(out[:,:,:3]==0),'source paint hue cannot enter the shader')
        with self.assertRaises(ValueError):mod.reference_shading(body,Image.new('RGBA',(1,1)),region,ink)

if __name__=='__main__':unittest.main()
