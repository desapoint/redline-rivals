"""Readable contacts from the skill's hash-bound QA outputs."""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];RUN=ROOT/'tests/car-integration/20261003-additional'
p=argparse.ArgumentParser();p.add_argument('--revision',type=int,default=1);p.add_argument('--flat',action='store_true');args=p.parse_args()
prefix='flat' if args.flat else 'prepared';folders=sorted(RUN.glob(f'*/{prefix}-v{args.revision}'))
sheet=Image.new('RGB',(1200,285*len(folders)),(60,60,65));d=ImageDraw.Draw(sheet)
for n,folder in enumerate(folders):
 for k,name in enumerate(('on-gray.jpg','recolor-check.jpg')):
  im=Image.open(folder/'qa'/name).convert('RGB');im.thumbnail((580,255))
  sheet.paste(im,(600*k+(600-im.width)//2,n*285+25+(255-im.height)//2))
 d.text((8,n*285+7),folder.parent.name,fill='white')
sheet.save(RUN/f'{prefix}-v{args.revision}-cars.jpg',quality=95)
for folder in folders:
 sheet=Image.new('RGB',(1200,360*3),(60,60,65));d=ImageDraw.Draw(sheet)
 for n,name in enumerate(('isolated-wheel.jpg','isolated-rotor.jpg','isolated-caliper.jpg','isolated-underlay.jpg','rotation-45.png','rotation-180.png')):
  im=Image.open(folder/'qa'/name).convert('RGBA');bounds=im.getchannel('A').getbbox() if name.endswith('png') else None
  if name.endswith('png'):im=im.crop(bounds)
  im.thumbnail((580,320));x=(n%2)*600+(600-im.width)//2;y=(n//2)*360+30+(320-im.height)//2
  sheet.paste(im,(x,y),im);d.text(((n%2)*600+8,(n//2)*360+8),name,fill='white')
 sheet.save(folder/'parts-contact.jpg',quality=95)
sheet=Image.new('RGB',(1600,240*len(folders)),(60,60,65));d=ImageDraw.Draw(sheet)
for n,folder in enumerate(folders):
 for k,name in enumerate(('wheels-hidden.png','on-white.jpg','on-black.jpg','rotation-90.png')):
  im=Image.open(folder/'qa'/name).convert('RGBA');im.thumbnail((395,210))
  sheet.paste(im,(k*400+(400-im.width)//2,n*240+25+(210-im.height)//2),im)
 d.text((6,n*240+6),folder.parent.name,fill='white')
sheet.save(RUN/f'{prefix}-v{args.revision}-contrast.jpg',quality=96)
if args.flat:
 sheet=Image.new('RGB',(1600,240*len(folders)),(70,70,75));d=ImageDraw.Draw(sheet)
 for n,folder in enumerate(folders):
  for k,role in enumerate(('paint','shading','fixtures','linework')):
   im=Image.open(folder/'qa'/f'layer-body-{role}.jpg').convert('RGB');im.thumbnail((395,210))
   sheet.paste(im,(k*400+(400-im.width)//2,n*240+25+(210-im.height)//2))
  d.text((6,n*240+6),folder.parent.name+' / paint | shading | fixtures | linework',fill='white')
 sheet.save(RUN/f'{prefix}-v{args.revision}-layers.jpg',quality=96)
