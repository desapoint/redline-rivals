"""Inventory supplied archives without trusting their metadata as game-ready assets.

Preserves explicitly named -2d masters for inspection. Does not import assets,
change the roster, or run any code supplied by an archive.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile

from PIL import Image


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inventory(archives, output):
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for archive_path in archives:
        archive_path = Path(archive_path)
        record = {"archive": str(archive_path), "sha256": sha256(archive_path.read_bytes()),
                  "packs": [], "explicit2dMasters": [], "compositeCandidates": []}
        with ZipFile(archive_path) as archive:
            for entry in sorted(archive.namelist()):
                path = Path(entry)
                if path.name == "metadata.json":
                    data = json.loads(archive.read(entry))
                    record["packs"].append({"id": path.parent.name, "metadata": entry,
                                            "claimsGenerated2d": data.get("generated2d"),
                                            "status": "unreviewed-source"})
                is_master = path.stem.lower().endswith("-2d")
                is_composite = path.stem.lower().endswith("-composite")
                if (is_master or is_composite) and path.suffix.lower() in {".png", ".webp"}:
                    raw = archive.read(entry)
                    target = output / archive_path.stem / path.name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    if target.exists() and target.read_bytes() != raw:
                        raise ValueError(f"Refusing to overwrite preserved source {target}")
                    target.write_bytes(raw)
                    with Image.open(io.BytesIO(raw)) as image:
                        alpha = image.convert("RGBA").getchannel("A")
                        category = "explicit2dMasters" if is_master else "compositeCandidates"
                        record[category].append({"entry": entry, "sha256": sha256(raw),
                            "file": target.relative_to(output).as_posix(), "canvas": list(image.size),
                            "alphaBounds": alpha.getbbox(), "alphaExtrema": alpha.getextrema(),
                            "status": "unreviewed-source"})
        records.append(record)
    report = {"archives": records, "note": "Existence and alpha checks only; no visual, identity, layer or wheel-fit approval."}
    (output / "inventory.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"packs": sum(len(r["packs"]) for r in records),
                      "explicit2dMasters": sum(len(r["explicit2dMasters"]) for r in records),
                      "compositeCandidates": sum(len(r["compositeCandidates"]) for r in records),
                      "report": str(output / "inventory.json")}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("archives", nargs="+")
    args = parser.parse_args()
    inventory(args.archives, args.output)
