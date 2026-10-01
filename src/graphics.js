let svgId=0;
export function carSVG(c,extraClass=''){
  const id=`car${svgId++}`,v=c.visual||{},paint=c.color||'#e6603b',rim={silver:'#9ca6b0',black:'#353a43',bronze:'#a98050'}[v.wheels]||'#9ca6b0';
  const hatch=c.shape==='hatch',supercar=c.shape==='super',muscle=c.shape==='muscle',roadster=c.shape==='roadster';
  const body=supercar?'M54 145 L72 121 L164 104 L229 68 Q248 58 283 59 L374 65 L447 105 L529 117 L553 133 L549 164 L506 169 Q503 123 465 123 Q425 123 423 172 L173 172 Q173 125 135 125 Q96 125 96 171 L57 166Z':hatch?'M61 116 L86 83 L147 73 L205 49 Q220 43 245 43 L357 47 L421 103 L514 120 L543 139 L537 164 L503 169 Q500 125 464 125 Q425 125 422 173 L174 173 Q173 125 136 125 Q98 125 95 171 L57 165Z':'M54 140 L67 117 L141 104 L209 63 Q224 54 250 55 L341 58 L415 105 L501 115 L544 136 L540 166 L506 171 Q503 124 465 124 Q425 124 422 172 L175 172 Q172 126 135 126 Q98 126 95 172 L57 165Z';
  const roof=roadster?'M177 104 L213 74 L225 76 L203 102Z M346 80 L375 100 L350 103Z':hatch?'M114 98 L157 82 L211 56 L239 56 L232 99Z M249 56 L348 59 L396 100 L249 100Z':supercar?'M194 105 L239 74 L286 72 L282 103Z M293 73 L363 78 L407 105 L293 103Z':'M163 103 L219 69 L251 68 L247 102Z M261 68 L334 72 L385 104 L261 102Z';
  const wheel=(x)=>`<g transform="translate(${x} 161)"><circle r="35" fill="#090a0d"/><circle r="31" fill="#15171b" stroke="#31353b" stroke-width="2"/><circle r="23" fill="#30353c"/><circle r="18" fill="#171b20"/><circle r="15" fill="#575c60"/><path d="M10 -14 L17 0 L10 13" fill="none" stroke="#dc553c" stroke-width="6"/>${[0,60,120,180,240,300].map(a=>`<path d="M-3 -5 L-4 -21 L1 -23 L4 -6Z" fill="${rim}" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="${rim}"/><circle r="2.5" fill="#25272b"/></g>`;
  return `<svg class="car-art ${extraClass}" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.name}, ${paint} paint"><defs><linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${v.finish==='matte'?paint:'#f6c7ac'}" stop-opacity="${v.finish==='matte'?1:.9}"/><stop offset=".24" stop-color="${paint}"/><stop offset=".60" stop-color="${paint}"/><stop offset="1" stop-color="#231c20"/></linearGradient><linearGradient id="${id}-glass" x2=".3" y2="1"><stop stop-color="#344654"/><stop offset="1" stop-color="#0c121a"/></linearGradient><filter id="${id}-blur"><feGaussianBlur stdDeviation="6"/></filter></defs><ellipse cx="300" cy="191" rx="257" ry="12" fill="#000" opacity=".65" filter="url(#${id}-blur)"/><g transform="translate(0 ${v.rideHeight||0})"><path d="${body}" fill="url(#${id}-paint)" stroke="#1d2027" stroke-width="2"/><path d="M73 120 L141 113 L408 114 L503 125" stroke="#ffe7cb" opacity=".45" fill="none" stroke-width="2"/><path d="M65 151 L538 151 L540 166 L508 172 L420 174 L176 175 L95 173 L58 165Z" fill="#090c11" opacity=".30"/><path d="${roof}" fill="url(#${id}-glass)" stroke="#17232e" stroke-width="2" opacity="${1-(v.tint||0)*.35}"/>${roadster?'<path d="M225 102 L348 103 L335 86 L238 85Z" fill="#11161e"/>':''}<path d="M252 109 L253 155 Q248 164 230 165 L184 165 M394 111 L406 144" stroke="#2c2730" opacity=".65" fill="none"/><path d="M265 118 h23" stroke="#222731" stroke-width="4" stroke-linecap="round"/><path d="M69 132 L92 128 L88 144 L62 144Z" fill="#fa574f"/><path d="M500 125 L533 136 L531 143 L501 140Z" fill="#f8f4d4"/><path d="M513 153 h26 v8 h-26Z" fill="#0b1017"/><path d="M179 169 L419 169" stroke="#929097" opacity=".5" stroke-width="3"/>${muscle?'<path d="M416 108 L479 115 L495 121 L407 116Z" fill="#35333a" opacity=".7"/>':''}${v.stripe?'<path d="M71 145 L533 145" stroke="#f4e5d4" stroke-width="7" opacity=".85"/><text x="312" y="144" font-family="sans-serif" font-style="italic" font-weight="900" font-size="20" fill="#fff">07</text>':''}${v.spoiler?'<path d="M75 111 v-21 M111 108 v-17 M58 88 h79 v8 H58Z" stroke="#24262b" stroke-width="5" fill="#292c33"/>':''}<path d="M414 110 l-8 -11 -14 1 4 10" fill="${paint}" stroke="#252833"/></g>${wheel(135)}${wheel(465)}</svg>`;
}
const carImages=new Map();
export function carImage(c){
  const key=JSON.stringify([c.id,c.color,c.visual]);if(carImages.has(key))return carImages.get(key);
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(carSVG(c));carImages.set(key,image);return image;
}
export function drawTrack(ctx,w,h,race){
  const day=race.time==='Day',desert=race.track.id==='desert',camera=Math.max(0,race.player.x*4-w*.26),sky=ctx.createLinearGradient(0,0,0,h*.66);
  sky.addColorStop(0,day?'#637e92':desert?'#232538':'#111829');sky.addColorStop(1,day?'#e6c5a3':desert?'#6e494e':'#493c49');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  if(!day){ctx.fillStyle='#ddd6c9';ctx.beginPath();ctx.arc(w*.78,h*.14,18,0,Math.PI*2);ctx.fill();for(let i=0;i<32;i++){ctx.fillStyle=`rgba(255,255,255,${.15+(i%3)*.1})`;ctx.fillRect((i*197%w),30+(i*53%(h*.28)),1,1);}}
  if(desert){for(let layer=0;layer<3;layer++){ctx.fillStyle=['#665358','#58484e','#37353f'][layer];ctx.beginPath();ctx.moveTo(0,h*.50);for(let x=0;x<=w+100;x+=100)ctx.lineTo(x,h*(.35+layer*.05)-Math.sin((x+camera*.04)/140+layer)*25);ctx.lineTo(w,h*.6);ctx.lineTo(0,h*.6);ctx.fill();}}
  else {for(let layer=0;layer<2;layer++){const offset=(camera*(.04+layer*.045))%125;for(let i=-1;i<w/125+2;i++){const bh=40+((i+40)*71%95),x=i*125-offset;ctx.fillStyle=layer?'#242731':'#2d2c3a';ctx.fillRect(x,h*.49-bh,105,bh);ctx.fillStyle=day?'#607080':'#c99569';for(let a=0;a<5;a++)for(let b=0;b<bh/17;b++){if((a+b+i)%3!==0)ctx.fillRect(x+10+a*18,h*.49-bh+9+b*17,5,7);}}}}
  ctx.fillStyle='#34343b';ctx.fillRect(0,h*.47,w,h*.11);ctx.fillStyle='#15191e';ctx.fillRect(0,h*.50,w,9);
  const lampOffset=camera*.3%240;
  for(let i=-1;i<w/240+2;i++){let x=i*240-lampOffset;ctx.fillStyle='#6b6b72';ctx.fillRect(x,h*.24,3,h*.28);ctx.fillRect(x,h*.24,45,3);if(!day){let glow=ctx.createRadialGradient(x+44,h*.26,0,x+44,h*.26,85);glow.addColorStop(0,'rgba(255,222,162,.14)');glow.addColorStop(1,'rgba(255,222,162,0)');ctx.fillStyle=glow;ctx.fillRect(x-45,h*.14,180,180);ctx.fillStyle='#ffe6b7';ctx.fillRect(x+38,h*.245,16,4);}}
  ctx.fillStyle='#272b32';ctx.fillRect(0,h*.57,w,h*.43);ctx.fillStyle='#32363d';ctx.fillRect(0,h*.57,w,5);
  ctx.strokeStyle='#797574';ctx.setLineDash([65,45]);ctx.lineWidth=3;ctx.lineDashOffset=camera%110;ctx.beginPath();ctx.moveTo(0,h*.77);ctx.lineTo(w,h*.77);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#c7bbad';ctx.fillRect(0,h*.97,w,4);
  for(let i=0;i<25;i++){ctx.fillStyle='rgba(255,255,255,.022)';ctx.fillRect((i*73+camera)%w,h*.60+(i*37%(h*.35)),35,1);}
  for(const mark of [0,18.288,201.168,402.336,804.672,1609.344]){
    if(mark>race.distance+.01)continue;const x=mark*4-camera+90;if(x<-60||x>w+60)continue;
    if(mark===0||Math.abs(mark-race.distance)<.1){for(let r=0;r<12;r++)for(let a=0;a<3;a++){ctx.fillStyle=(r+a)%2?'#ddd8cb':'#33353b';ctx.fillRect(x+a*8,h*.57+r*h*.034,8,h*.034);}}
    else {ctx.fillStyle='#73747a';ctx.fillRect(x,h*.54,2,20);ctx.font='10px monospace';ctx.fillText(mark<20?'60 FT':Math.round(mark)+' M',x-14,h*.53);}
  }
  const size=Math.min(245,w*.28),draw=(s,y,isPlayer)=>{
    const x=s.x*4-camera+70;
    if(s.slip>.10&&s.started&&!s.finished){for(let i=0;i<6;i++){ctx.fillStyle=`rgba(206,207,215,${.06+s.slip*.04})`;ctx.beginPath();ctx.ellipse(x-size*.18-i*12,y+size*.18,18+i*5,12+i*2,0,0,Math.PI*2);ctx.fill();}}
    const img=carImage(s.car);if(img.complete&&img.naturalWidth)ctx.drawImage(img,x-size*.23,y-size*.20,size,size*220/600);
    if(isPlayer){ctx.fillStyle='#ff6740';ctx.fillRect(x+size*.1,y+size*.21,30,2);}
    ctx.font='bold 10px monospace';ctx.fillStyle=isPlayer?'#ff916e':'#d2d5de';ctx.fillText(isPlayer?'YOU':race.opponentName.split(' ')[0].toUpperCase(),x+size*.10,y-size*.03);
  };
  draw(race.opponent,h*.65,false);draw(race.player,h*.86,true);
  if(race.weather==='Wet'){ctx.fillStyle='rgba(102,124,154,.1)';ctx.fillRect(0,h*.57,w,h*.43);ctx.strokeStyle='rgba(181,204,233,.23)';for(let i=0;i<40;i++){const x=(i*127+race.clock*280)%w,y=(i*53+race.clock*230)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-8,y+18);ctx.stroke();}}
}
