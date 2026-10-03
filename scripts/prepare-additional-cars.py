"""Replay measured full-car sources into isolated runtime-ready sprite packs.

Pillow/NumPy only. No wheel detection, model inference or AI-generated pixels.
Plans lock source SHA, native contours and hubs. Brakes are complete procedural
illustrations; hidden tire tread is reconstructed from the opposite source side.
Never overwrites an earlier preparation revision.
"""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
RUN=ROOT/'tests/car-integration/20261003-additional'
PLANS=ROOT/'docs/art/additional-car-plans'

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')

# Visually traced native coordinates. Arch contours are independent of tires.
CONFIG={
 'volkswagen-golf-gti-2024':dict(make='Volkswagen',model='Golf GTI',year=2024,trim='S / illustrated wheels',color='#dc1826',facing='right',r=139,hubs=[(299,639),(1376,639)],rocker=691,wheelStyle='golf',
  arches=[[(145,679),(146,616),(167,561),(207,520),(253,500),(303,493),(358,503),(407,530),(439,575),(452,632),(455,689)],[(1219,690),(1223,627),(1249,568),(1290,525),(1339,501),(1392,498),(1445,510),(1489,541),(1521,589),(1533,650),(1535,697)]],
  exclusions=[[(309,324),(359,248),(425,230),(670,220),(711,365),(324,355)],[(717,222),(860,231),(968,260),(1078,315),(1198,391),(776,370)],[(1040,337),(1119,343),(1139,381),(1060,416)],[(49,380),(135,377),(166,444),(53,446)],[(1480,467),(1601,476),(1677,495),(1681,531),(1575,534)],[(1602,562),(1697,560),(1696,678),(1586,674)]]),
 'ford-mustang-boss302-1969':dict(make='Ford',model='Mustang',year=1969,trim='Boss 302',color='#ef2417',facing='right',r=150,hubs=[(456,553),(1663,553)],rocker=596,wheelStyle='boss',rearDrum=True,
  arches=[[(292,592),(295,521),(317,463),(359,422),(410,403),(465,398),(518,409),(564,436),(602,479),(620,530),(627,598)],[(1493,590),(1498,521),(1523,468),(1564,427),(1612,407),(1669,404),(1727,416),(1775,444),(1809,489),(1829,539),(1832,602)]],
  exclusions=[[(683,268),(759,190),(1067,182),(1107,201),(1210,272),(1300,307),(777,305)],[(1901,386),(1985,381),(1969,461),(1897,466)],[(1843,509),(1888,507),(1888,528),(1844,529)],[(103,439),(148,439),(148,460),(103,459)]]),
 'toyota-gr-corolla-2024':dict(make='Toyota',model='GR Corolla',year=2024,trim='Circuit Edition / illustrated',color='#0866e8',facing='left',r=133,hubs=[(1382,659),(339,659)],rocker=711,wheelStyle='ten',
  arches=[[(1228,705),(1232,640),(1249,585),(1288,544),(1332,523),(1386,516),(1440,527),(1484,554),(1517,601),(1530,656),(1533,705)],[(189,715),(194,638),(215,584),(253,544),(296,523),(342,515),(388,523),(431,547),(470,589),(492,651),(496,714)]],
  exclusions=[[(488,399),(614,316),(777,259),(975,245),(1184,253),(1250,276),(1339,360),(1201,390),(685,410)],[(574,360),(625,359),(637,445),(576,445)],[(54,498),(254,461),(230,498),(177,521),(92,553),(55,522)],[(1470,400),(1593,397),(1592,465),(1533,448)],[(435,480),(495,477),(524,568),(481,572)]]),
 'ford-mustang-dark-horse-2024':dict(make='Ford',model='Mustang',year=2024,trim='Dark Horse',color='#24518a',facing='right',r=137,hubs=[(535,696),(1587,696)],rocker=792,wheelStyle='split-five',caliper='#327dc5',
  outline=[(143,774),(143,648),(158,622),(151,559),(193,516),(184,451),(208,427),(176,369),(265,370),(324,390),(374,425),(682,321),(755,302),(1048,290),(1089,294),(1208,357),(1350,435),(1463,433),(1630,443),(1800,480),(1904,514),(1970,549),(1964,581),(1971,632),(1956,701),(1949,746),(1973,765),(1960,780),(1742,791),(683,793),(370,781)],
  arches=[[(369,783),(375,690),(389,639),(422,589),(474,558),(529,548),(583,555),(630,580),(665,627),(681,691),(686,790)],[(1433,789),(1438,688),(1453,634),(1490,586),(1533,558),(1588,548),(1643,556),(1691,584),(1722,631),(1737,687),(1741,790)]],
  exclusions=[[(618,401),(750,356),(863,335),(1032,334),(1099,356),(1210,409),(1277,455),(801,455),(695,433)],[(1142,414),(1203,408),(1230,478),(1169,480)],[(193,476),(244,478),(274,497),(243,527),(193,539)],[(1721,531),(1897,546),(1933,553),(1878,591),(1786,582)],[(1820,624),(1952,635),(1940,681),(1830,683)]]),
 'nissan-z-nismo-2024':dict(make='Nissan',model='Z',year=2024,trim='NISMO',color='#a0a3a7',facing='right',r=139,hubs=[(511,718),(1510,718)],rocker=812,wheelStyle='split-five',neutralPaint=True,
  outline=[(150,760),(152,651),(164,611),(198,573),(199,486),(216,477),(294,474),(475,405),(658,354),(782,335),(961,325),(1007,337),(1251,469),(1351,471),(1654,500),(1761,541),(1833,585),(1880,640),(1863,668),(1820,681),(1814,737),(1868,777),(1862,797),(1668,807),(662,813),(325,796)],
  arches=[[(327,798),(333,708),(351,654),(386,611),(431,585),(482,576),(530,582),(578,605),(616,645),(639,702),(654,805)],[(1348,807),(1352,706),(1373,651),(1408,610),(1455,584),(1506,575),(1560,582),(1607,607),(1642,650),(1660,707),(1668,807)]],
  exclusions=[[(296,467),(500,403),(724,352),(962,347),(1010,364),(1243,478),(1044,494),(827,493),(677,471),(594,435)],[(1045,442),(1115,432),(1158,493),(1107,512),(1049,492)],[(201,524),(253,528),(286,570),(210,570)],[(1620,558),(1720,576),(1787,598),(1753,628),(1647,600)]]),
 'acura-integra-type-s-2024':dict(make='Acura',model='Integra',year=2024,trim='Type S',color='#e4e5e5',facing='right',r=142,hubs=[(505,718),(1507,718)],rocker=791,wheelStyle='split-five',neutralPaint=True,
  outline=[(140,753),(137,653),(151,626),(151,579),(189,534),(189,473),(179,446),(197,439),(267,450),(452,381),(607,325),(628,312),(671,333),(829,309),(1025,314),(1104,337),(1327,475),(1464,480),(1608,492),(1702,511),(1778,542),(1847,573),(1854,590),(1848,633),(1862,672),(1856,731),(1853,748),(1877,769),(1860,784),(1661,790),(652,793),(340,782)],
  arches=[[(339,782),(345,704),(362,650),(395,609),(439,587),(489,580),(541,585),(585,608),(620,650),(644,706),(651,791)],[(1349,790),(1355,703),(1376,648),(1411,608),(1459,582),(1508,574),(1561,583),(1608,609),(1641,652),(1658,710),(1663,790)]],
  exclusions=[[(482,413),(633,368),(791,343),(1020,344),(1086,365),(1210,422),(1304,494),(915,495),(572,477)],[(1164,452),(1237,448),(1258,509),(1219,530),(1175,515)],[(190,495),(346,497),(281,542),(203,555)],[(1600,551),(1762,574),(1840,574),(1790,603),(1680,600)]]),
 'subaru-wrx-tr-2024':dict(make='Subaru',model='WRX',year=2024,trim='TR / accessory spoiler',color='#1459b3',facing='right',r=136,hubs=[(516,739),(1509,739)],rocker=820,wheelStyle='split-five',
  outline=[(169,771),(166,691),(176,643),(185,602),(213,553),(216,495),(237,466),(218,379),(267,378),(330,387),(383,438),(513,377),(627,320),(652,308),(696,326),(794,311),(1040,313),(1104,332),(1217,398),(1359,473),(1444,478),(1503,469),(1574,472),(1594,490),(1701,508),(1790,548),(1866,584),(1870,655),(1881,689),(1880,741),(1863,778),(1888,797),(1867,817),(1669,825),(680,821),(365,801)],
  arches=[[(367,807),(373,737),(389,683),(422,637),(466,611),(515,602),(565,609),(611,635),(647,677),(669,733),(679,820)],[(1343,820),(1349,733),(1365,681),(1399,636),(1450,608),(1506,599),(1559,609),(1607,634),(1640,678),(1664,735),(1671,822)]],
  exclusions=[[(541,426),(659,371),(810,346),(1041,344),(1111,366),(1215,426),(1340,498),(594,478)],[(1177,453),(1245,449),(1260,510),(1220,534),(1186,515)],[(221,493),(354,498),(288,547),(221,569)],[(1640,557),(1774,576),(1850,589),(1821,627),(1743,627)]]),
 'cadillac-ct5-v-blackwing-2025':dict(make='Cadillac',model='CT5-V',year=2025,trim='Blackwing',color='#bc1831',facing='right',r=140,hubs=[(518,706),(1600,706)],rocker=794,wheelStyle='split-five',caliper='#c79b35',
  outline=[(141,755),(137,655),(143,608),(174,581),(178,533),(169,454),(187,443),(280,450),(492,371),(624,317),(621,295),(683,306),(815,290),(1044,298),(1101,319),(1369,455),(1533,465),(1693,483),(1818,515),(1911,548),(1942,570),(1931,598),(1940,640),(1950,681),(1943,739),(1954,761),(1955,781),(1756,792),(685,794),(356,781)],
  arches=[[(359,782),(365,700),(386,646),(421,606),(465,582),(516,575),(565,582),(612,606),(648,648),(669,701),(684,793)],[(1439,792),(1444,699),(1464,648),(1500,606),(1549,581),(1601,574),(1651,581),(1698,606),(1732,649),(1750,701),(1756,792)]],
  exclusions=[[(509,409),(649,356),(798,326),(1039,330),(1101,350),(1211,407),(1304,480),(573,467)],[(184,495),(298,485),(270,542),(197,589)],[(1702,537),(1824,553),(1925,582),(1877,600),(1785,588)],[(1817,591),(1851,595),(1846,718),(1817,717)]]),
}

def init_plans():
 for id,config in CONFIG.items():
  folder=RUN/'sources'/id
  source=next(folder.glob('*-2d.png'),None) or next(folder.glob('*-composite.png'))
  plan=dict(config,id=id,source=source.relative_to(ROOT).as_posix(),sha256=sha(source),alphaFloor=64 if config.get('outline') else 8,
   mechanicalMethod='Source rims and hubs isolated by measured spoke support; upper tire restored by 180-degree source symmetry; complete rotors and calipers drawn with Pillow, separately for each axle.',
   notes=['Illustrated source geometry, wheel styles and accessories are preserved; this is not an OEM CAD reconstruction.','Brake colors, positions and dimensions are visual modeling choices. Existing source discs/calipers are rejected because they contain clipped or spoke-occluded regions.'])
  target=PLANS/(id+'.json')
  if target.exists():raise ValueError('Plan exists; edit it deliberately rather than resetting measurements: '+str(target))
  write_json(target,plan)

def mask_polygon(size,points,smooth=False):
 mask=Image.new('L',(size[0]*2,size[1]*2));d=ImageDraw.Draw(mask)
 if smooth and len(points)>2:
  # Catmull-Rom along the inspected contour; closing segments stay straight.
  out=[]
  padded=[points[0],*points,points[-1]]
  for i in range(1,len(padded)-2):
   a,b,c,e=(np.array(padded[j],dtype=float) for j in (i-1,i,i+1,i+2))
   for t in np.linspace(0,1,16,endpoint=False):
    p=.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-e)*t*t+(-a+3*b-3*c+e)*t*t*t)
    out.append(tuple(p))
  out.append(points[-1]);points=out
 d.polygon([(round(x*2),round(y*2)) for x,y in points],fill=255)
 return mask.resize(size,Image.Resampling.LANCZOS)

def arch_opening(size,points,bottom):
 curved=mask_polygon(size,points,True)
 # The top curve is rasterized with a closing chord, then the lower opening is filled.
 lower=mask_polygon(size,[points[-1],(points[-1][0],bottom),(points[0][0],bottom),points[0]])
 return ImageChops.lighter(curved,lower)

def draw_brakes(plan,axle,n):
 r=plan['r'];side=2*(r+8);center=side/2
 yy,xx=np.mgrid[:side,:side];dx=xx+.5-center;dy=yy+.5-center;rad=np.hypot(dx,dy)
 drum=axle=='rear' and plan.get('rearDrum')
 disc_r=r*(.55 if drum else .58 if axle=='rear' else .69)
 light=(48 if drum else 78)+4*np.sin(rad*2.3)+6*(-dy/disc_r)
 rgb=np.clip(light,0,255).astype('uint8')
 array=np.zeros((side,side,4),dtype='uint8')
 array[:,:,:3]=rgb[:,:,None];array[:,:,3]=np.clip((disc_r+.5-rad)*255,0,255).astype('uint8')
 rotor=Image.fromarray(array);d=ImageDraw.Draw(rotor)
 for rr,color in [(disc_r-1,'#272b30'),(disc_r-3,'#666b70'),(disc_r*.44,'#373b40'),(disc_r*.20,'#60666c')]:
  d.ellipse((center-rr,center-rr,center+rr,center+rr),outline=color,width=2)
 d.ellipse((center-disc_r*.42,center-disc_r*.42,center+disc_r*.42,center+disc_r*.42),fill='#464b50')
 d.ellipse((center-9,center-9,center+9,center+9),fill='#20252b',outline='#abb1b6',width=2)
 for angle in range(0,360,72):
  theta=math.radians(angle);x=center+disc_r*.30*math.cos(theta);y=center+disc_r*.30*math.sin(theta)
  d.ellipse((x-3,y-3,x+3,y+3),fill='#a4a7ac',outline='#252a2e')
 caliper=Image.new('RGBA',(side*3,side*3));d=ImageDraw.Draw(caliper)
 if drum:
  # Fixed backing plate hardware, rather than inventing a rear disc caliper.
  x=center*3;y=(center-disc_r*.55)*3
  d.rounded_rectangle((x-14*3,y-5*3,x+14*3,y+5*3),radius=6,fill='#363b40',outline='#666e73',width=3)
 else:
  direction=-1 if plan['id']=='toyota-gr-corolla-2024' and axle=='front' else 1
  if plan['id']=='ford-mustang-boss302-1969':direction=-1
  color=plan.get('caliper','#cd2630') if plan['id']!='ford-mustang-boss302-1969' else '#454950'
  x=center+direction*disc_r*.86;length=disc_r*(.98 if axle=='front' else .83);width=disc_r*.34
  bbox=((x-width/2)*3,(center-length/2)*3,(x+width/2)*3,(center+length/2)*3)
  d.rounded_rectangle(bbox,radius=width*.35*3,fill=color,outline='#282b30',width=6)
  d.line(((x-direction*width*.24)*3,(center-length*.36)*3,(x-direction*width*.24)*3,(center+length*.36)*3),fill='#ffffff60',width=4)
  for y in (center-length*.32,center+length*.32):
   d.ellipse(((x-3)*3,(y-3)*3,(x+3)*3,(y+3)*3),fill='#30343b',outline='#9b9fa2',width=2)
  d.rounded_rectangle(((x-width*.15)*3,(center-length*.21)*3,(x+width*.15)*3,(center+length*.21)*3),radius=3,fill='#ffffff45')
 return rotor,caliper.resize((side,side),Image.Resampling.LANCZOS)

def wheel_source(master,plan,hub):
 r=plan['r'];margin=8;half=r+margin;side=half*2;x,y=hub
 im=master.crop((x-half,y-half,x+half,y+half)).convert('RGBA');a=np.array(im)
 yy,xx=np.mgrid[:side,:side];dx=xx+.5-half;dy=yy+.5-half;rad=np.hypot(dx,dy)
 # Upper tire tread can be hidden by the fender. Copy only that annulus,
 # never the source brake or a body panel. Keep the original exposed lower tread.
 repair=(dy<-r*.40)&(rad>r*.78)&(rad<=r+.5)
 opposite=a[::-1,::-1].copy();a[repair,:3]=opposite[repair,:3]
 # A crop alone still retains painted fender fragments at the tire's side
 # when the illustrated source tire is slightly elliptical. Reconstruct a
 # complete circular sidewall from its clean lower radial profile. This is
 # source sampling plus standard radial shading, not synthesized artwork.
 native=np.array(im);inner=.73 if plan['wheelStyle']=='boss' else .80
 profile=np.zeros((r+2,3),dtype=float)
 for rr in range(round(r*inner)-2,r+2):
  pixels=native[(abs(rad-rr)<1.25)&(dy>rad*.80)&(native[:,:,3]>128),:3]
  if pixels.size:profile[rr]=np.clip(np.median(pixels,axis=0),7,88)
  else:profile[rr]=profile[rr-1] if rr else 18
 index=np.clip(np.round(rad).astype(int),0,r+1)
 brightness=1-.08*dy/max(r,1)+.015*np.sin(np.arctan2(dy,dx)*57+rad*2.1)
 tread=np.clip(profile[index]*brightness[:,:,None],0,255)
 ring=(rad>=r*inner)&(rad<=r+.5)
 a[ring,:3]=tread[ring].astype('uint8')
 alpha=np.clip((r+.5-rad)*255,0,255).astype('uint8')
 support=Image.new('L',(side*4,side*4));d=ImageDraw.Draw(support);c=half*4
 # Retain native rim/tire annulus. Interior holes expose the independent brakes.
 rim=.77 if plan['wheelStyle']=='golf' else .64 if plan['wheelStyle']=='boss' else .76
 d.ellipse((c-r*4,c-r*4,c+r*4,c+r*4),fill=255)
 d.ellipse((c-r*rim*4,c-r*rim*4,c+r*rim*4,c+r*rim*4),fill=0)
 d.ellipse((c-r*.20*4,c-r*.20*4,c+r*.20*4,c+r*.20*4),fill=255)
 def p(angle,radius):
  t=math.radians(angle);return(c+math.cos(t)*r*radius*4,c+math.sin(t)*r*radius*4)
 style=plan['wheelStyle']
 if style=='golf':
  d.ellipse((c-r*.77*4,c-r*.77*4,c+r*.77*4,c+r*.77*4),fill=255)
  # Five petal-shaped source openings, fitted independently to the native wheel.
  for angle in (-90,-18,54,126,198):
   pts=[p(angle-27,.32),p(angle-22,.63),p(angle-16,.73),p(angle+16,.73),p(angle+22,.63),p(angle+27,.32)]
   d.polygon(pts,fill=0)
 elif style=='split-five':
  # Subtract source cavity contours rather than replacing native spokes with
  # thin procedural strips. The split arms, bevels and spoke roots remain.
  d.ellipse((c-r*.76*4,c-r*.76*4,c+r*.76*4,c+r*.76*4),fill=255)
  for angle in (-90,-18,54,126,198):
   d.polygon([p(angle,.34),p(angle-10,.70),p(angle+10,.70)],fill=0)
   d.polygon([p(angle+27,.25),p(angle+16,.70),p(angle+56,.70),p(angle+45,.25)],fill=0)
 elif style=='boss':
  d.ellipse((c-r*.64*4,c-r*.64*4,c+r*.64*4,c+r*.64*4),fill=255)
  for angle in (-90,-18,54,126,198):d.polygon([p(angle-22,.27),p(angle-17,.56),p(angle+17,.56),p(angle+22,.27)],fill=0)
 else:
  for angle in range(0,360,36):d.line((p(angle,.16),p(angle,.76)),fill=255,width=round(r*.046*4))
 keep=np.array(support.resize((side,side),Image.Resampling.LANCZOS))
 # Any source color at a cavity boundary came from an occluded brake; the
 # native rim itself is neutral. Reconstruct that fringe as dark spoke metal.
 colors=a[:,:,:3].astype('int16');chromatic=(colors.max(2)-colors.min(2)>30)&(rad<r*.77)&(rad>r*.22)
 a[chromatic,:3]=np.clip(colors[chromatic].mean(1)*.52,18,48).astype('uint8')[:,None]
 a[:,:,3]=(alpha.astype('uint16')*keep//255).astype('uint8');a[a[:,:,3]==0,:3]=0
 wheel=Image.fromarray(a)
 if style=='split-five':
  # The five composite masters repeat a brake in every spoke cavity. Rebuild
  # the inner ten-spoke design using standard drawing; keep the native tire,
  # rim lip and their lighting. This avoids retaining any rotating brake RGB.
  a[rad<r*.758]=0;wheel=Image.fromarray(a)
  metal=Image.new('RGBA',(side*4,side*4));d=ImageDraw.Draw(metal)
  def spoke_polygon(angle,branch):
   return [p(angle-9,.18),p(angle-7,.39),p(angle+branch-3.6,.77),p(angle+branch+3.6,.77),p(angle+7,.39),p(angle+9,.18)]
  for angle in (-90,-18,54,126,198):
   for branch in (-15,15):
    points=spoke_polygon(angle,branch);d.polygon(points,fill='#5c626c',outline='#1c1e22',width=3)
    d.line((p(angle-3,.27),p(angle-2,.38),p(angle+branch-1,.765)),fill='#858991',width=max(2,round(r*.012*4)))
    d.line((p(angle+3,.30),p(angle+2,.40),p(angle+branch+1,.755)),fill='#2e3238',width=max(2,round(r*.010*4)))
  rr=r*.205*4;d.ellipse((c-rr,c-rr,c+rr,c+rr),fill='#292d34',outline='#525860',width=4)
  for angle in range(-90,270,72):
   x1,y1=p(angle,.142);d.ellipse((x1-9,y1-9,x1+9,y1+9),fill='#a0a4ad',outline='#16191e',width=3)
  rr=r*.086*4;d.ellipse((c-rr,c-rr,c+rr,c+rr),fill='#3a4049',outline='#787f88',width=3)
  d.arc((c-rr*.65,c-rr*.65,c+rr*.65,c+rr*.65),210,320,fill='#afb5bb',width=3)
  wheel.alpha_composite(metal.resize((side,side),Image.Resampling.LANCZOS))
 return wheel

def prepare(path,revision):
 plan=json.loads(path.read_text(encoding='utf-8'));source=ROOT/plan['source']
 if sha(source)!=plan['sha256']:raise ValueError('Source changed: '+str(source))
 out=RUN/plan['id']/('prepared-v'+str(revision))
 if out.exists():raise ValueError('Refusing to overwrite preparation: '+str(out))
 (out/'inputs').mkdir(parents=True);shutil.copyfile(source,out/'inputs/master.png');shutil.copyfile(path,out/'preparation-plan.json')
 shutil.copyfile(__file__,out/'preparation-script.py')
 master=Image.open(source).convert('RGBA');size=master.size;a=np.array(master)
 a[a[:,:,3]<plan['alphaFloor'],3]=0
 body=Image.fromarray(a)
 if plan.get('outline'):body.putalpha(ImageChops.multiply(body.getchannel('A'),mask_polygon(size,plan['outline'])))
 if plan['id']=='ford-mustang-boss302-1969':
  # The archived master omitted the cabin behind the open side window.
  # A fixed, neutral interior sits behind the retained seat/steering pixels.
  interior=Image.new('RGBA',size);inside=mask_polygon(size,[(799,200),(1058,194),(1114,222),(1180,280),(1196,299),(799,299)])
  fill=Image.new('RGBA',size,(32,35,39,255));fill.putalpha(inside);interior.alpha_composite(fill);interior.alpha_composite(body);body=interior
 underlay=Image.new('RGBA',size)
 for points in plan['arches']:
  opening=arch_opening(size,points,size[1]);body.putalpha(ImageChops.multiply(body.getchannel('A'),ImageChops.invert(opening)))
  backing=arch_opening(size,points,plan['rocker'])
  # Vehicle-local backing terminates at the native rocker. No road shadow is baked.
  cut=Image.new('L',size);ImageDraw.Draw(cut).rectangle((0,0,size[0],plan['rocker']),fill=255)
  backing=ImageChops.multiply(backing,cut);fill=Image.new('RGBA',size,(14,16,20,0));fill.putalpha(backing);underlay.alpha_composite(fill)
 body.save(out/'inputs/body-2d.png');body.save(out/'body.png');underlay.save(out/'underlay.png')
 rgb=np.array(body).astype('int16');red,green,blue=(rgb[:,:,i] for i in range(3))
 if plan.get('neutralPaint'):paint=(rgb[:,:,:3].max(2)>55)&((rgb[:,:,:3].max(2)-rgb[:,:,:3].min(2))<55)
 elif plan['color'].startswith(('#0','#1','#2')):paint=(blue>red*1.15)&(blue>green*1.04)&(blue>32)
 else:paint=(red>green*1.035)&(red>blue*1.035)&(red>32)
 mask=Image.fromarray(np.where(paint,np.array(body.getchannel('A')),0).astype('uint8'))
 if plan['id']=='volkswagen-golf-gti-2024':
  # This quarter-panel reflection is almost achromatic pink, so hue alone
  # misses it. The measured painted region excludes the taillamp below.
  panel=mask_polygon(size,[(139,388),(303,385),(348,453),(213,471),(154,520),(85,487)])
  mask=ImageChops.lighter(mask,ImageChops.multiply(panel,body.getchannel('A')))
 for points in plan['exclusions']:mask=ImageChops.multiply(mask,ImageChops.invert(mask_polygon(size,points)))
 # Painted mirror caps remain paintable while black mounts and glass are
 # protected. Explicit cap contours override the broad window exclusions.
 caps={
  'volkswagen-golf-gti-2024':[(1043,355),(1056,343),(1085,345),(1115,357),(1124,372),(1087,371),(1044,365)],
  'ford-mustang-boss302-1969':[(1174,271),(1196,268),(1217,285),(1219,299),(1175,297)],
  'ford-mustang-dark-horse-2024':[(1147,429),(1158,418),(1182,414),(1201,424),(1205,440),(1172,440),(1148,438)],
  'subaru-wrx-tr-2024':[(1181,467),(1198,454),(1223,454),(1245,468),(1247,481),(1183,480)],
 }
 if plan['id'] in caps:
  cap=ImageChops.multiply(mask_polygon(size,caps[plan['id']]),Image.fromarray(np.where(paint,np.array(body.getchannel('A')),0).astype('uint8')))
  mask=ImageChops.lighter(mask,cap)
 paint_im=Image.new('RGBA',size,'white');paint_im.putalpha(mask);paint_im.save(out/'paint-mask.png')
 manifest=dict(schemaVersion=1,revision=revision,vehicle={k:plan[k] for k in ('id','make','model','year','trim','facing')},canvas=dict(width=size[0],height=size[1]),anchors={},layers=[],masks={'paint':'paint-mask.png'},
  sources=[dict(originalPath=plan['source'],sha256=plan['sha256'],archivedFile='inputs/master.png'),dict(originalPath='scripts/prepare-additional-cars.py',sha256=sha(Path(__file__)),archivedFile='preparation-script.py'),dict(originalPath=path.relative_to(ROOT).as_posix(),sha256=sha(path),archivedFile='preparation-plan.json')],notes=plan['notes']+[plan['mechanicalMethod'],'The five composite-source rims retain native tire/lip pixels; their inner split ten-spoke geometry is reconstructed with Pillow because the source repeats calipers in all cavities.','Merged original exterior retained: the deferred flat-paint/fixture redesign is not applied.'],
  archProfiles=[dict(axle=axle,shape='measured-contour',points=points) for axle,points in zip(('rear','front'),plan['arches'])])
 for id,file,z in [('car-underlay','underlay.png',200),('body-exterior','body.png',400)]:manifest['layers'].append(dict(id=id,file=file,z=z,placement=dict(mode='canvas',x=0,y=0)))
 for n,axle in enumerate(('rear','front')):
  x,y=plan['hubs'][n];manifest['anchors'][axle+'Wheel']=dict(x=x,y=y,radius=plan['r'])
  rotor,caliper=draw_brakes(plan,axle,n);wheel=wheel_source(master,plan,(x,y))
  for part,im,z in [('rotor',rotor,300+n*30),('caliper',caliper,310+n*30),('wheel',wheel,320+n*30)]:
   im.save(out/f'{axle}-{part}.png')
   manifest['layers'].append(dict(id=f'{axle}-{part}',file=f'{axle}-{part}.png',z=z,placement=dict(mode='anchor',anchor=axle+'Wheel',scale=1,offset=[0,0],pivotNormalized=[.5,.5]),rotateWithWheel=part!='caliper'))
 if plan.get('rearDrum'):manifest['notes'].append('Rear rotor role contains the rotating drum; stationary caliper role contains backing-plate hardware. The classic Boss uses front discs and rear drums.')
 write_json(out/'car-sprite.json',manifest)
 print(out.relative_to(ROOT))

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--init-plans',action='store_true');parser.add_argument('--revision',type=int,default=1);parser.add_argument('--id');args=parser.parse_args()
 if args.init_plans:init_plans()
 else:
  for path in sorted(PLANS.glob('*.json')):
   if args.id is None or path.stem==args.id:prepare(path,args.revision)
