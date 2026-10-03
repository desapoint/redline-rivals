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

    def test_native_tracing_follows_round_squared_sloped_and_concave_edges(self):
        outlines = [
            [(25, 70), (25, 35), (35, 20), (65, 20), (75, 35), (75, 70)],
            [(20, 70), (20, 25), (30, 15), (70, 15), (80, 25), (80, 70)],
            [(20, 70), (30, 25), (75, 35), (80, 70)],
            [(20, 70), (20, 25), (40, 25), (40, 40), (60, 40), (60, 25), (80, 25), (80, 70)],
        ]
        for points in outlines:
            body = Image.new('RGBA', (100, 100), (40, 40, 40, 255))
            ImageDraw.Draw(body).polygon(points, fill=(0, 0, 0, 0))
            profile = {'shape': 'source-opening', 'bounds': [10, 10, 90, 70], 'seed': [50, 60]}
            result = arch.underlay_for(body, [profile])
            # Every transparent interior pixel is backed; every opaque fender is intact.
            for y in range(10, 71):
                for x in range(10, 91):
                    self.assertEqual(result.getpixel((x, y))[3], 255-body.getpixel((x, y))[3])

    def test_tracing_rejects_bad_seeds_and_contours_cut_by_roi(self):
        body = Image.new('RGBA', (100, 100), (40, 40, 40, 255))
        ImageDraw.Draw(body).rectangle((20, 20, 80, 99), fill=(0, 0, 0, 0))
        good = {'shape': 'source-opening', 'bounds': [10, 10, 90, 70], 'seed': [50, 60]}
        for bad in [{**good, 'seed': [15, 15]}, {**good, 'bounds': [25, 10, 90, 70]}, {**good, 'bounds': [10, 25, 90, 70]}, {**good, 'connectivityAlpha': 255}]:
            with self.assertRaises(ValueError):
                arch.underlay_for(body, [bad])

    def test_tracing_selects_only_seeded_opening_and_preserves_alpha_edge(self):
        body = Image.new('RGBA', (100, 100), (40, 40, 40, 255))
        d = ImageDraw.Draw(body)
        d.rectangle((30, 30, 70, 70), fill=(0, 0, 0, 0))
        d.line((29, 30, 29, 70), fill=(40, 40, 40, 190))
        d.rectangle((15, 15, 20, 20), fill=(0, 0, 0, 0))
        result = arch.underlay_for(body, [{'shape': 'source-opening', 'bounds': [10, 10, 90, 80], 'seed': [50, 50]}])
        self.assertEqual(result.getpixel((15, 15))[3], 0)
        self.assertEqual(result.getpixel((29, 40))[3], 65)
        self.assertEqual(result.getpixel((28, 40))[3], 0)

    def test_all_four_native_contours_replay_without_geometry_changes(self):
        root = Path(__file__).resolve().parents[1]
        for path in (root/'docs/art/arch-plans').glob('*.json'):
            plan = json.loads(path.read_text(encoding='utf-8'))
            source = root/plan['sourcePackage']
            if not source.exists():
                continue  # Native packages remain outside the public demo.
            body = Image.open(source/'inputs/body.png').convert('RGBA')
            result = arch.underlay_for(body, plan['profiles'])
            self.assertIsNotNone(result.getbbox())
            self.assertEqual(arch.digest(source/'inputs/body.png'), plan['bodySha256'])
            target = root/'tests/car-integration/20261003'/path.stem/f"contour-fit-v{plan['revision']}"
            if target.exists():
                self.assertEqual(result.tobytes(), Image.open(target/'body/car-underlay.png').convert('RGBA').tobytes())
                before = json.loads((source/'car-sprite.json').read_text(encoding='utf-8'))
                after = json.loads((target/'car-sprite.json').read_text(encoding='utf-8'))
                self.assertEqual(before['anchors'], after['anchors'])
                for layer in before['layers']:
                    if layer['id'] != 'car-underlay':
                        self.assertEqual(arch.digest(source/layer['file']), arch.digest(target/layer['file']))


if __name__ == '__main__':
    unittest.main()
