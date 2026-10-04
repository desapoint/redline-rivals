import { spriteSVG, drawSprite } from './sprite-renderer.js';
import { spriteRevision } from './car-assets.js';
import { drawRaceScene } from './race-scene.js';
let svgId=0;
export function carSVG(c,extraClass='',includeWheels=true){
  if(includeWheels){const sprite=spriteSVG(c,extraClass);if(sprite)return sprite;}
  const id=`car${svgId++}`,v=c.visual||{},paint=c.color||'#e6603b',rim={silver:'#9ca6b0',black:'#353a43',bronze:'#a98050'}[v.wheels]||'#9ca6b0';
  const hatch=c.shape==='hatch',supercar=c.shape==='super',muscle=c.shape==='muscle',roadster=c.shape==='roadster';
  const body=supercar?'M54 145 L72 121 L164 104 L229 68 Q248 58 283 59 L374 65 L447 105 L529 117 L553 133 L549 164 L506 169 Q503 123 465 123 Q425 123 423 172 L173 172 Q173 125 135 125 Q96 125 96 171 L57 166Z':hatch?'M61 116 L86 83 L147 73 L205 49 Q220 43 245 43 L357 47 L421 103 L514 120 L543 139 L537 164 L503 169 Q500 125 464 125 Q425 125 422 173 L174 173 Q173 125 136 125 Q98 125 95 171 L57 165Z':'M54 140 L67 117 L141 104 L209 63 Q224 54 250 55 L341 58 L415 105 L501 115 L544 136 L540 166 L506 171 Q503 124 465 124 Q425 124 422 172 L175 172 Q172 126 135 126 Q98 126 95 172 L57 165Z';
  const roof=roadster?'M177 104 L213 74 L225 76 L203 102Z M346 80 L375 100 L350 103Z':hatch?'M114 98 L157 82 L211 56 L239 56 L232 99Z M249 56 L348 59 L396 100 L249 100Z':supercar?'M194 105 L239 74 L286 72 L282 103Z M293 73 L363 78 L407 105 L293 103Z':'M163 103 L219 69 L251 68 L247 102Z M261 68 L334 72 L385 104 L261 102Z';
  const wheel=(x)=>`<g transform="translate(${x} 161)"><circle r="35" fill="#090a0d"/><circle r="31" fill="#15171b" stroke="#31353b" stroke-width="2"/><circle r="23" fill="#30353c"/><circle r="18" fill="#171b20"/><circle r="15" fill="#575c60"/><path d="M10 -14 L17 0 L10 13" fill="none" stroke="#dc553c" stroke-width="6"/>${[0,60,120,180,240,300].map(a=>`<path d="M-3 -5 L-4 -21 L1 -23 L4 -6Z" fill="${rim}" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="${rim}"/><circle r="2.5" fill="#25272b"/></g>`;
  return `<svg class="car-art ${extraClass}" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.name}, ${paint} paint"><defs><linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${v.finish==='matte'?paint:'#f6c7ac'}" stop-opacity="${v.finish==='matte'?1:.9}"/><stop offset=".24" stop-color="${paint}"/><stop offset=".60" stop-color="${paint}"/><stop offset="1" stop-color="#231c20"/></linearGradient><linearGradient id="${id}-glass" x2=".3" y2="1"><stop stop-color="#344654"/><stop offset="1" stop-color="#0c121a"/></linearGradient><filter id="${id}-blur"><feGaussianBlur stdDeviation="6"/></filter></defs><ellipse cx="300" cy="191" rx="257" ry="12" fill="#000" opacity=".65" filter="url(#${id}-blur)"/><g transform="translate(0 ${v.rideHeight||0})"><path d="${body}" fill="url(#${id}-paint)" stroke="#1d2027" stroke-width="2"/><path d="M73 120 L141 113 L408 114 L503 125" stroke="#ffe7cb" opacity=".45" fill="none" stroke-width="2"/><path d="M65 151 L538 151 L540 166 L508 172 L420 174 L176 175 L95 173 L58 165Z" fill="#090c11" opacity=".30"/><path d="${roof}" fill="url(#${id}-glass)" stroke="#17232e" stroke-width="2" opacity="${1-(v.tint||0)*.35}"/>${roadster?'<path d="M225 102 L348 103 L335 86 L238 85Z" fill="#11161e"/>':''}<path d="M252 109 L253 155 Q248 164 230 165 L184 165 M394 111 L406 144" stroke="#2c2730" opacity=".65" fill="none"/><path d="M265 118 h23" stroke="#222731" stroke-width="4" stroke-linecap="round"/><path d="M69 132 L92 128 L88 144 L62 144Z" fill="#fa574f"/><path d="M500 125 L533 136 L531 143 L501 140Z" fill="#f8f4d4"/><path d="M513 153 h26 v8 h-26Z" fill="#0b1017"/><path d="M179 169 L419 169" stroke="#929097" opacity=".5" stroke-width="3"/>${muscle?'<path d="M416 108 L479 115 L495 121 L407 116Z" fill="#35333a" opacity=".7"/>':''}${v.stripe?'<path d="M71 145 L533 145" stroke="#f4e5d4" stroke-width="7" opacity=".85"/><text x="312" y="144" font-family="sans-serif" font-style="italic" font-weight="900" font-size="20" fill="#fff">07</text>':''}${v.spoiler?'<path d="M75 111 v-21 M111 108 v-17 M58 88 h79 v8 H58Z" stroke="#24262b" stroke-width="5" fill="#292c33"/>':''}<path d="M414 110 l-8 -11 -14 1 4 10" fill="${paint}" stroke="#252833"/></g>${includeWheels?wheel(135)+wheel(465):''}</svg>`;
}
const carImages=new Map();
export function carImage(c){
  const key=JSON.stringify([spriteRevision(),c.id,c.color,c.visual]);if(carImages.has(key))return carImages.get(key);
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(carSVG(c,'',false));if(carImages.size>=40)carImages.clear();carImages.set(key,image);return image;
}
export function drawCar(ctx,c,x,y,width,rotation={},options={}){
  if(drawSprite(ctx,c,x,y,width,rotation,options))return;
  const img=carImage(c);if(!img.complete || !img.naturalWidth)return;
  ctx.save();ctx.translate(x,y);ctx.scale(width/600,width/600);ctx.drawImage(img,0,0,600,220);
  const rim={silver:'#9ca6b0',black:'#353a43',bronze:'#a98050'}[c.visual?.wheels] || '#9ca6b0';
  for(const [axle,wheelX] of [['rear',135],['front',465]]){
    ctx.save();ctx.translate(wheelX,161);
    const circle=(r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();};
    circle(35,'#090a0d');circle(31,'#15171b');circle(23,'#30353c');circle(18,'#171b20');circle(15,'#575c60');
    ctx.strokeStyle='#dc553c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(10,-14);ctx.lineTo(17,0);ctx.lineTo(10,13);ctx.stroke();
    ctx.rotate(rotation[axle] || 0);ctx.fillStyle=rim;
    for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(-4,-21);ctx.lineTo(1,-23);ctx.lineTo(4,-6);ctx.fill();ctx.restore();}
    circle(6,rim);circle(2.5,'#25272b');ctx.restore();
  }
  ctx.restore();
}
export function drawTrack(ctx,w,h,race){drawRaceScene(ctx,w,h,race,drawCar);}
