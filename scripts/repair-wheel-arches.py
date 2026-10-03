"""Replay source-contour arch plans for every reviewed real car.

Run full sprite QA afterwards; visual review is required before runtime import.
"""
import json
from pathlib import Path
import subprocess
import sys
from wheel_arch_profiles import repair

ROOT = Path(__file__).resolve().parents[1]
for plan_path in sorted((ROOT/'docs/art/arch-plans').glob('*.json')):
    plan = json.loads(plan_path.read_text(encoding='utf-8'))
    vehicle = plan_path.stem
    target = ROOT/'tests/car-integration/20261003'/vehicle/f"contour-fit-v{plan['revision']}"
    if target.exists():
        print(f'Preserved existing run: {target}')
        continue
    repair(plan_path, target)
    subprocess.run([sys.executable, 'C:/Users/jason/.codex/skills/racing-car-sprites/scripts/sprite_qa.py', str(target)], check=True)
