"""Preserve the eight supplied additional car sources without executing ZIP content."""
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/car-integration/20261003-additional/sources'
ARCHIVES = {
 'E:/Téléchargements/racinggame-layered-sprite-review.zip': ['volkswagen-golf-gti-2024','ford-mustang-boss302-1969','toyota-gr-corolla-2024'],
 'E:/Téléchargements/racinggame_asset_batch_001.zip': ['nissan-z-nismo-2024','ford-mustang-dark-horse-2024','acura-integra-type-s-2024','subaru-wrx-tr-2024','cadillac-ct5-v-blackwing-2025'],
}
records=[]
for name, ids in ARCHIVES.items():
 archive_path=Path(name)
 with ZipFile(archive_path) as archive:
  for vehicle in ids:
   directory=OUT/vehicle; directory.mkdir(parents=True,exist_ok=True)
   files={}
   for entry in archive.namelist():
    path=Path(entry)
    selected=(path.parent.name==vehicle or path.name==vehicle+'-2d.png')
    if not selected or path.suffix.lower() not in {'.png','.json'}:continue
    raw=archive.read(entry); target=directory/path.name
    if target.exists() and target.read_bytes()!=raw:raise ValueError('Preserved source differs: '+str(target))
    target.write_bytes(raw)
    files[path.name]={'entry':entry,'sha256':hashlib.sha256(raw).hexdigest()}
   records.append({'id':vehicle,'archive':name,'archiveSha256':hashlib.sha256(archive_path.read_bytes()).hexdigest(),'files':files})
   images=[p for p in sorted(directory.glob('*.png')) if p.name not in {'preview.png'}]
   sheet=Image.new('RGB',(1200,260*((len(images)+2)//3)),(70,70,70)); draw=ImageDraw.Draw(sheet)
   for i,path in enumerate(images):
    im=Image.open(path).convert('RGBA'); im.thumbnail((390,225))
    x=(i%3)*400+(400-im.width)//2; y=(i//3)*260+25+(225-im.height)//2
    sheet.paste(im,(x,y),im); draw.text(((i%3)*400+8,(i//3)*260+6),path.name,fill='white')
   sheet.save(directory/'source-contact.jpg',quality=93)
(OUT/'source-records.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print(f'Preserved {len(records)} source cars at {OUT}')
