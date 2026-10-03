import importlib.util
import json
from pathlib import Path
import unittest
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('arch', Path(__file__).resolve().parents[1]/'scripts/wheel_arch_profiles.py')
arch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(arch)


class ArchProfileTests(unittest.TestCase):
    def setUp(self):
        self.profile = {'shape': 'rounded-rectangle', 'bounds': [10, 10, 90, 80], 'cornerRadii': [15, 15, 0, 0]}

    def test_flat_crown_rounded_corners_and_straight_sides(self):
        mask = arch.profile_mask((100, 100), [self.profile])
        self.assertEqual(mask.getpixel((25, 10)), 255)
        self.assertEqual(mask.getpixel((75, 10)), 255)
        self.assertEqual(mask.getpixel((10, 10)), 0)
        self.assertEqual(mask.getpixel((10, 40)), 255)
        self.assertEqual(mask.getpixel((10, 80)), 255)
        self.assertEqual(mask.getpixel((50, 81)), 0)

    def test_body_edge_and_lower_cutoff_protect_against_leaks(self):
        body = Image.new('RGBA', (100, 100), (40, 40, 40, 255))
        ImageDraw.Draw(body).rectangle((20, 20, 80, 99), fill=(0, 0, 0, 0))
        original = body.tobytes()
        result = arch.underlay_for(body, [self.profile])
        self.assertEqual(result.getpixel((50, 30))[3], 255)
        self.assertEqual(result.getpixel((15, 40))[3], 0)  # original fender
        self.assertEqual(result.getpixel((50, 90))[3], 0)  # below bounded well
        self.assertEqual(body.tobytes(), original)

    def test_measured_contour_supported_and_invalid_shapes_rejected(self):
        mask = arch.profile_mask((100, 100), [{'shape': 'contour', 'points': [[10, 10], [80, 15], [70, 80], [15, 75]]}])
        self.assertEqual(mask.getpixel((40, 40)), 255)
        for profile in [{**self.profile, 'cornerRadii': [60]*4}, {'shape': 'tire-radius'}, {**self.profile, 'bounds': [-1, 10, 90, 80]}]:
            with self.assertRaises(ValueError):
                arch.profile_mask((100, 100), [profile])

    def test_silverado_replay_preserves_fenders_and_mechanical_layers(self):
        root = Path(__file__).resolve().parents[1]
        plan = json.loads((root/'docs/art/silverado-arch-plan.json').read_text(encoding='utf-8'))
        source = root/plan['sourcePackage']
        target = source.parent/'arch-fit-v12'
        if not target.exists():
            self.skipTest('Native review workspace unavailable')
        body = Image.open(source/'inputs/body.png').convert('RGBA')
        actual = Image.open(target/'body/car-underlay.png').convert('RGBA')
        self.assertEqual(actual.tobytes(), arch.underlay_for(body, plan['profiles']).tobytes())
        self.assertEqual(arch.digest(target/'inputs/body.png'), plan['bodySha256'])
        before = json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
        after = json.loads((target/'car-sprite.json').read_text(encoding='utf-8'))
        self.assertEqual(before['anchors'], after['anchors'])
        for layer in before['layers']:
            if layer['id'] != 'car-underlay':
                self.assertEqual(arch.digest(source/layer['file']), arch.digest(target/layer['file']))
        self.assertEqual(actual.getchannel('A').crop((0, 675, body.width, body.height)).getbbox(), None)


if __name__ == '__main__':
    unittest.main()
