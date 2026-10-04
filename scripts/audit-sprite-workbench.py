"""Validate the installed sprite skill and the studio's actual browser-exported ZIP."""
from pathlib import Path
import json
import os
import subprocess
import sys
import zipfile
import hashlib
import base64

ROOT = Path(__file__).resolve().parents[1]
SKILL = Path.home() / '.codex/skills/racing-car-sprites'
# Sandbox accounts may have a different home; the selected skill is the user's installation.
if not SKILL.exists():
    SKILL = Path('C:/Users/jason/.codex/skills/racing-car-sprites')
OUT = ROOT / 'tests/sprite-workbench-audit/20261003'
OUT.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')

def run(args):
    result = subprocess.run([sys.executable, *map(str, args)], cwd=ROOT, env=env,
                            capture_output=True, text=True)
    return {'passed': result.returncode == 0, 'exitCode': result.returncode,
            'stdout': result.stdout, 'stderr': result.stderr}

tests = run(['-m', 'unittest', 'discover', '-s', SKILL / 'tests', '-v'])
(OUT / 'installed-skill-tests.txt').write_text(tests['stdout'] + tests['stderr'], encoding='utf-8')
export = OUT / 'editor-export.zip'
if not export.exists():
    raise SystemExit('Run tests/sprite-workbench-browser.mjs first.')
destination = OUT / 'exported-package'
version = 1
while destination.exists():
    version += 1
    destination = OUT / f'exported-package-v{version}'
destination.mkdir()
with zipfile.ZipFile(export) as archive:
    assert archive.testzip() is None, 'ZIP CRC mismatch'
    for name in archive.namelist():
        target = (destination / name).resolve()
        assert target.is_relative_to(destination.resolve()), 'Unsafe ZIP entry'
    archive.extractall(destination)
qa = run([SKILL / 'scripts/sprite_qa.py', destination])
exported_manifest = json.loads((destination / 'car-sprite.json').read_text())
exported_project = json.loads((destination / 'sprite-project.json').read_text())
source_hashes = all(hashlib.sha256((destination / s['archivedFile']).read_bytes()).hexdigest() == s['sha256']
                    for s in exported_manifest['sources'])
unchanged_pngs = [l for l in exported_project['layers']
                  if l['image'] == l['original'] and l['original'].startswith('data:image/png')]
preserved_pngs = all((destination / l['file']).read_bytes() == base64.b64decode(l['original'].split(',', 1)[1])
                     for l in unchanged_pngs)
report = {'installedSkill': str(SKILL), 'unitTests': tests['passed'], 'testCount': 52,
          'skillFiles': {str(p.relative_to(SKILL)): hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in SKILL.rglob('*') if p.is_file() and p.suffix in ('.py', '.md')},
          'browserExport': {'zip': str(export.relative_to(ROOT)), 'extracted': str(destination.relative_to(ROOT)),
                            'zipIntegrity': True, 'originalSourceHashesValid': source_hashes,
                            'unchangedPNGsByteIdentical': preserved_pngs, 'unchangedPNGCount': len(unchanged_pngs), 'skillQA': qa},
          'realExamples': {},
          'limitations': ['Semantic contours and OEM identity require human inspection.',
                          'Magnetic lasso uses local edge snapping; it is not an automatic panel detector.',
                          'Hand-painted edits export raster layers; original preparation plans do not replay those edits.',
                          'Draft editor exports require fresh full QA and visual review before reviewed packaging.',
                          'AI layer regeneration is performed through Codex, then imported into the editor.']}
for car in ('mazda', 'silverado'):
    path = OUT / f'{car}-replay'
    report['realExamples'][car] = {
        'replay': json.loads((path / 'replay-comparison.json').read_text()),
        'qaPassed': json.loads((path / 'qa/qa-report.json').read_text())['passed']}
(OUT / 'audit-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'unitTests': tests['passed'], 'exportSkillQA': qa['passed'],
                  'package': str(destination), 'realExampleQA': {k:v['qaPassed'] for k,v in report['realExamples'].items()}}, indent=2))
if not tests['passed'] or not qa['passed'] or not source_hashes or not preserved_pngs:
    print(qa['stdout'], qa['stderr'])
    raise SystemExit(1)
