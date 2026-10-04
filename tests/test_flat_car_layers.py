import importlib.util
import json
from pathlib import Path
import unittest
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
spec = importlib.util.spec_from_file_location('flat', ROOT/'scripts/flat_car_layers.py')
flat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(flat)


class FlatCarLayersTests(unittest.TestCase):
    def test_uniform_base_native_holes_and_independent_ink(self):
        body = Image.new('RGBA', (140, 90))
        d = ImageDraw.Draw(body)
        d.rectangle((10, 10, 130, 75), fill=(220, 30, 45, 255))
        d.ellipse((20, 55, 55, 89), fill=(0, 0, 0, 0))
        d.rectangle((64, 30, 67, 75), fill=(0, 0, 0, 255))
        mask = Image.new('RGBA', body.size, 'white')
        layers, _ = flat.decompose(body, mask)
        base = np.asarray(layers['paint'])
        self.assertTrue(np.all(base[base[:, :, 3] > 0, :3] == 255))
        self.assertIsNone(ImageChops.difference(body.getchannel('A'), layers['paint'].getchannel('A')).getbbox())
        self.assertEqual(layers['paint'].getpixel((37, 65))[3], 0)
        self.assertEqual(layers['linework'].getpixel((65, 50))[:3], (0, 0, 0))
        self.assertGreater(layers['linework'].getpixel((65, 50))[3], 128)

    def test_shading_is_grayscale_with_discrete_opacities(self):
        body = Image.new('RGBA', (140, 90), (230, 40, 40, 255))
        d = ImageDraw.Draw(body)
        d.rectangle((10, 30, 70, 70), fill=(100, 10, 10, 255))
        d.rectangle((90, 30, 120, 70), fill=(250, 150, 150, 255))
        mask = Image.new('RGBA', body.size, 'white')
        layers, report = flat.decompose(body, mask)
        shade = np.asarray(layers['shading'])
        self.assertTrue(np.array_equal(shade[:, :, 0], shade[:, :, 1]))
        self.assertTrue(np.array_equal(shade[:, :, 1], shade[:, :, 2]))
        self.assertTrue(set(np.unique(shade[:, :, 0])) <= {0, 255})
        self.assertTrue(set(np.unique(shade[:, :, 3])) <= set(report['shadowAlphaPalette']+report['highlightAlphaPalette']))
        self.assertFalse(report['gradientInterpolation'])

    def test_fixed_fixtures_keep_pixels_and_arbitrary_paint_is_exact(self):
        body = Image.new('RGBA', (140, 90), (220, 30, 45, 255))
        ImageDraw.Draw(body).rectangle((30, 20, 110, 40), fill=(100, 130, 170, 255))
        mask = Image.new('RGBA', body.size, 'white')
        ImageDraw.Draw(mask).rectangle((30, 20, 110, 40), fill=(0, 0, 0, 0))
        layers, _ = flat.decompose(body, mask)
        self.assertEqual(layers['fixtures'].getpixel((70, 30)), body.getpixel((70, 30)))
        for color in [(0, 0, 0), (255, 255, 255), (17, 123, 231), (255, 21, 203)]:
            base = Image.new('RGBA', body.size, (*color, 0))
            base.putalpha(layers['paint'].getchannel('A'))
            self.assertEqual(base.getpixel((70, 60)), (*color, 255))
            base.alpha_composite(layers['fixtures'])
            self.assertEqual(base.getpixel((70, 30)), body.getpixel((70, 30)))

    def test_rejects_misaligned_and_empty_paint_regions(self):
        body = Image.new('RGBA', (140, 90), 'red')
        for mask in [Image.new('RGBA', (10, 10), 'white'), Image.new('RGBA', body.size)]:
            with self.assertRaises(ValueError):
                flat.decompose(body, mask)

    def test_rgba_lamp_mask_uses_alpha_and_keeps_other_dark_fixtures_separate(self):
        body = Image.new('RGBA', (140, 90), (10, 10, 10, 255))
        ImageDraw.Draw(body).rectangle((30, 30, 50, 50), fill=(245, 240, 235, 255))
        lamp = Image.new('RGBA', body.size, (255, 255, 255, 0))
        ImageDraw.Draw(lamp).rectangle((30, 30, 50, 50), fill=(255, 255, 255, 255))
        paint = Image.new('RGBA', body.size)
        ImageDraw.Draw(paint).rectangle((60, 20, 110, 70), fill='white')
        layers, _ = flat.decompose(body, paint, lights_mask=lamp)
        self.assertGreaterEqual(layers['lights'].getpixel((40, 40))[3], 128)
        self.assertEqual(layers['fixtures'].getpixel((40, 40))[3], 0)
        self.assertEqual(layers['lights'].getpixel((15, 40))[3], 0)
        self.assertEqual(layers['fixtures'].getpixel((15, 40))[3], 255)
        with self.assertRaisesRegex(ValueError, 'Light contours'):
            flat.decompose(body, paint, lights_mask=Image.new('RGBA', (10, 10)))

    def test_source_opacity_jitter_is_not_mistaken_for_outline(self):
        body = Image.new('RGBA', (140, 90), (200, 20, 30, 255))
        body.putpixel((70, 50), (200, 20, 30, 254))
        layers, _ = flat.decompose(body, Image.new('RGBA', body.size, 'white'))
        self.assertEqual(layers['linework'].getpixel((70, 50))[3], 0)
        self.assertEqual(layers['linework'].getpixel((69, 50))[3], 0)
        self.assertEqual(layers['paint'].getpixel((70, 50))[3], 255)

    def test_cartoon_shading_has_three_solid_tones_and_keeps_other_layers(self):
        body=Image.new('RGBA',(256,128),(200,80,40,255))
        draw=ImageDraw.Draw(body)
        draw.rectangle((10,60,210,110),fill=(60,20,10,255))
        draw.rectangle((40,75,110,95),fill=(20,10,5,255))
        draw.rectangle((120,20,240,45),fill=(250,210,180,255))
        mask=Image.new('RGBA',body.size,'white')
        original,_=flat.decompose(body,mask)
        cartoon,report=flat.decompose(body,mask,{'shadingStyle':'cartoon-cel'})
        for role in ('paint','fixtures','linework'):
            self.assertEqual(original[role].tobytes(),cartoon[role].tobytes())
        shade=np.asarray(cartoon['shading'])
        self.assertTrue(set(np.unique(shade[:,:,3]))<={0,56,72,140})
        self.assertGreater(np.count_nonzero(shade[:,:,3]),500)
        self.assertEqual(report['classificationBlurPixels'],0)
        self.assertFalse(report['gradientInterpolation'])
        self.assertTrue(np.all(shade[:,:,0]==shade[:,:,1]))
        self.assertTrue(np.all(shade[:,:,1]==shade[:,:,2]))
        for settings in [{'shapeGridWidth':0},{'shapeToleranceCells':float('nan')},{'minimumShapeCells':0}]:
            with self.assertRaises(ValueError):
                flat.decompose(body,mask,{'shadingStyle':'cartoon-cel',**settings})

    def test_all_native_packs_are_uniform_and_replay_from_preserved_regions(self):
        count = 0
        catalog = json.loads((ROOT/'src/assets/cars/manifest.json').read_text(encoding='utf-8'))
        for id, record in catalog['cars'].items():
            self.assertEqual(record.get('paintMode'), 'flat-cel', id+' uses the independent body stack')
            p = ROOT/record['provenance']['sourcePackage']
            if not p.exists():
                continue
            count += 1
            manifest = json.loads((p/'car-sprite.json').read_text(encoding='utf-8'))
            body_file = p/'inputs/body.png' if (p/'inputs/body.png').exists() else p/'body.png'
            body = Image.open(body_file).convert('RGBA')
            region = Image.open(p/manifest['masks']['paintRegions']).convert('RGBA')
            settings = manifest.get('flatPaint', {}).get('decompositionSettings', {})
            lamp = Image.open(p/manifest['masks']['lights']) if manifest['masks'].get('lights') else None
            result, report = flat.decompose(body, region, settings, lamp)
            if settings.get('algorithm') == 'prepare-mazda-reference.reference_shading':
                archived = p/'processing/prepare-mazda-reference.py'
                reference_spec = importlib.util.spec_from_file_location('archived_reference', archived)
                reference_module = importlib.util.module_from_spec(reference_spec)
                reference_spec.loader.exec_module(reference_module)
                result['shading'] = reference_module.reference_shading(body, result['paint'], region, result['linework'])
                report = manifest['flatPaint']
            for role, expected in result.items():
                self.assertEqual(expected.tobytes(), Image.open(p/'body'/f'{role}.png').convert('RGBA').tobytes(), id+' '+role)
            base = np.asarray(result['paint'])
            self.assertTrue(np.all(base[base[:, :, 3] > 0, :3] == 255))
            original_alpha = np.asarray(body)[:, :, 3]
            solid = Image.fromarray(original_alpha).point(lambda a: 255 if a >= 8 else 0)
            core = np.asarray(solid.filter(ImageFilter.MinFilter(5))) > 0
            self.assertTrue(np.all(base[core, 3] == 255))
            self.assertTrue(np.array_equal(base[~core, 3], original_alpha[~core]), 'native arch and exterior edges are retained')
            self.assertEqual(result['paint'].tobytes(), Image.open(p/manifest['masks']['paint']).convert('RGBA').tobytes())
            shade = np.asarray(result['shading'])
            opaque = base[:, :, 3] == 255
            self.assertTrue(set(np.unique(shade[opaque, 3])) <= set(report['shadowAlphaPalette']+report['highlightAlphaPalette']))
            self.assertTrue(np.all(shade[:, :, 0] == shade[:, :, 1]))
            self.assertTrue(np.all(shade[:, :, 1] == shade[:, :, 2]))
            ink = np.asarray(result['linework'])[:, :, 3] > 0
            self.assertTrue(np.all(shade[ink, 3] == 0), 'outline belongs only to line art')
            self.assertTrue(np.all(np.asarray(result['fixtures'])[ink, 3] == 0), 'fixtures exclude independent outline')
            self.assertEqual(manifest['bodyLayerMode'], 'flat-cel')
        if not count:
            self.skipTest('Native review workspace is not included in public demo')

    def test_silverado_fixed_trim_excludes_painted_bumpers_and_rocker(self):
        plan = json.loads((ROOT/'docs/art/fixture-plans/silverado-fixed-trim-v26.json').read_text(encoding='utf-8'))
        p, old = ROOT/plan['outputPackage'], ROOT/plan['sourcePackage']
        if not p.exists():
            self.skipTest('Native trim review workspace is not included in public demo')
        fixtures = Image.open(p/'body/fixtures.png').convert('RGBA')
        regions = Image.open(p/'masks/paint-regions.png').convert('RGBA')
        for point in plan['paintSamples']:
            self.assertEqual(fixtures.getpixel(tuple(point))[3], 0, 'painted bumper/rocker has no fixed source color')
            self.assertGreaterEqual(regions.getpixel(tuple(point))[3], 128, 'painted body belongs to semantic paint regions')
        for point in plan['trimSamples']:
            self.assertGreaterEqual(fixtures.getpixel(tuple(point))[3], 128, 'actual plastic insert/step/grille remains fixed')
            self.assertEqual(regions.getpixel(tuple(point))[3], 0)
        for role in ('paint', 'linework', 'lights'):
            self.assertEqual((p/'body'/f'{role}.png').read_bytes(), (old/'body'/f'{role}.png').read_bytes())
        self.assertEqual(fixtures.crop((700,170,1605,425)).tobytes(), Image.open(old/'body/fixtures.png').convert('RGBA').crop((700,170,1605,425)).tobytes(), 'cab glass, mirror and window seals are preserved')
        manifest = json.loads((p/'car-sprite.json').read_text(encoding='utf-8'))
        original = json.loads((old/'car-sprite.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['anchors'], original['anchors'])
        self.assertEqual(manifest['flatPaint']['decompositionSettings'], original['flatPaint']['decompositionSettings'])
        for layer in original['layers']:
            if layer['id'] not in ('body-fixtures', 'body-shading'):
                self.assertEqual(flat.sha(p/layer['file']), flat.sha(old/layer['file']))
        for source in manifest['sources']:
            self.assertEqual(flat.sha(p/source['archivedFile']), source['sha256'])

    def test_silverado_lights_exclude_grille_bumper_and_hollow_lamp_interior(self):
        plan = json.loads((ROOT/'docs/art/fixture-plans/chevrolet-silverado-1500-custom-crew-short-2025-black.json').read_text(encoding='utf-8'))
        p = ROOT/plan['outputPackage']
        if not p.exists():
            self.skipTest('Native lamp review workspace is not included in public demo')
        lights = Image.open(p/'body/lights.png').convert('RGBA')
        region = Image.open(p/'masks/paint-regions.png').convert('RGBA')
        fixtures = Image.open(p/'body/fixtures.png').convert('RGBA')
        for point in plan['lightSamples']:
            self.assertGreaterEqual(lights.getpixel(tuple(point))[3], 128, 'actual white/amber/red lamp lens')
            self.assertEqual(region.getpixel(tuple(point))[3], 0, 'lamp does not repaint')
            self.assertEqual(fixtures.getpixel(tuple(point))[3], 0, 'lamp is separated from other fixtures')
        for point in plan['excludedLightSamples']:
            self.assertEqual(lights.getpixel(tuple(point))[3], 0, 'bumper/grille/body and open C interior do not become lights')
        for point in plan['paintSamples']:
            self.assertGreaterEqual(region.getpixel(tuple(point))[3], 128, 'previously captured painted surround returns to paint')


if __name__ == '__main__':
    unittest.main()
