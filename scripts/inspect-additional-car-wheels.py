"""Native crops for explicit hub, spoke and fender inspection (no inference)."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'tests/car-integration/20261003-additional'
CIRCLES={
 'volkswagen-golf-gti-2024':[(299,639,139),(1376,639,139)],
 'ford-mustang-boss302-1969':[(456,553,150),(1663,553,150)],
 'toyota-gr-corolla-2024':[(1382,659,133),(339,659,133)],
 'ford-mustang-dark-horse-2024':[(535,696,137),(1587,696,137)],
 'nissan-z-nismo-2024':[(511,718,139),(1510,718,139)],
 'acura-integra-type-s-2024':[(505,718,142),(1507,718,142)],
 'subaru-wrx-tr-2024':[(516,739,136),(1509,739,136)],
 'cadillac-ct5-v-blackwing-2025':[(518,706,140),(1600,706,140)],
}
for id,circles in CIRCLES.items():
 folder=RUN/'sources'/id
 source=next(folder.glob('*-2d.png'),None) or next(folder.glob('*-composite.png'))
 im=Image.open(source).convert('RGBA')
 contact=Image.new('RGB',(800,430),(75,75,75));d=ImageDraw.Draw(contact)
 for n,(x,y,r) in enumerate(circles):
  tile=im.crop((x-190,y-190,x+190,y+190))
  contact.paste(tile,(n*400,30),tile)
  d.text((n*400+6,6),f'{id} {"rear" if n==0 else "front"}',fill='white')
  d.line((n*400+180,220,n*400+200,220),fill='#00ffaa')
  d.line((n*400+190,210,n*400+190,230),fill='#00ffaa')
 contact.save(RUN/f'{id}-hub-crops.jpg',quality=97)
