import { getCarSprite, spriteReady, layerImage, assetURL, componentLayers, spriteRevision } from './car-assets.js';
import { attachmentTransform, spriteLayout, spriteContacts } from './sprite-geometry.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paint=car=>/^#[0-9a-f]{6}$/i.test(car.color || '')?car.color:'#e6603b';
let nextId=0;
const bodyView=visual=>['paint','shading','fixtures','linework'].includes(visual.bodyView)?visual.bodyView:'assembled';
const bodyOverlays=record=>['shading','fixtures','linework'];
function shadowEllipses(record,visual){
  const contacts=spriteContacts(record,componentLayers(record,visual));
  const left=Math.min(...contacts.map(p=>p.x-p.radius)),right=Math.max(...contacts.map(p=>p.x+p.radius)),ground=Math.max(...contacts.map(p=>p.y));
  return [{x:(left+right)/2,y:ground+1,rx:(right-left)/2+12,ry:3,opacity:.28},...contacts.map(p=>({x:p.x,y:p.y+.3,rx:Math.max(7,p.radius*.45),ry:1.8,opacity:.65}))];
}
function shadowSVG(record,visual){return shadowEllipses(record,visual).map(e=>`<ellipse data-role="contact-shadow" cx="${e.x}" cy="${e.y}" rx="${e.rx}" ry="${e.ry}" fill="#000" opacity="${e.opacity}"/>`).join('');}
export function spriteSVG(car,extraClass='',rotation={}) {
  const record=getCarSprite(car);if(!record || !spriteReady(record,car.visual))return null;
  const layout=spriteLayout(record),id=`sprite-${nextId++}`,visual=car.visual || {};
  const image=(layer,attrs='')=>`<image href="${esc(assetURL(layer))}" width="${layer.width}" height="${layer.height}" ${attrs}/>`;
  const attachment=(slot,layer,angle=0)=>{
    if(!layer)return '';
    const t=attachmentTransform(slot,layer);
    return `<g transform="translate(${t.x} ${t.y}) rotate(${angle}) scale(${t.scale})">${image(layer,`x="${t.offsetX}" y="${t.offsetY}"`)}</g>`;
  };
  const wheels=componentLayers(record,visual).map(s=>{
    const angle=(rotation[s.axle] || 0)*180/Math.PI*(record.facing==='left'?-1:1);
    // Calipers stay fixed. Only separate rotor and tire/rim layers rotate.
    return attachment(s,s.rotor,angle)+attachment(s,s.brake)+attachment(s,s.wheel,angle);
  }).join('');
  const flat=record.paintMode==='flat-cel',view=flat?bodyView(visual):'assembled',isolated=view!=='assembled';
  const mask=flat?record.layers.paintMask:paint(car)===record.paintColor?null:record.layers.paintMask;
  const underlay=!isolated && record.layers.underlay?`<g transform="translate(0 ${(visual.rideHeight || 0)/layout.scale})">${image(record.layers.underlay)}</g>`:'';
  const tint=mask?`<defs><mask id="${id}-paint" maskUnits="userSpaceOnUse" x="0" y="0" width="${record.width}" height="${record.height}" style="mask-type:alpha">${image(mask)}</mask></defs><rect width="${record.width}" height="${record.height}" fill="${paint(car)}" mask="url(#${id}-paint)" style="mix-blend-mode:color"/>`:'';
  const flatPaint=`<defs><mask id="${id}-flat" maskUnits="userSpaceOnUse" x="0" y="0" width="${record.width}" height="${record.height}" style="mask-type:alpha">${image(record.layers.body)}</mask></defs><rect width="${record.width}" height="${record.height}" fill="${paint(car)}" mask="url(#${id}-flat)"/>`;
  const body=flat?(view==='paint'?flatPaint:view==='assembled'?flatPaint+bodyOverlays(record).map(role=>image(record.layers[role])).join(''):record.layers[view]?image(record.layers[view]):''):image(record.layers.body)+tint;
  return `<svg class="car-art ${esc(extraClass)}" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(car.name)}, layered car artwork" data-art-id="${esc(car.artId || car.id)}" data-body-view="${view}">${isolated?'':shadowSVG(record,visual)}<g transform="${record.facing==='left'?'translate(600 0) scale(-1 1) ':''}translate(${layout.x} ${layout.y}) scale(${layout.scale})">${underlay}${isolated?'':wheels}<g transform="translate(0 ${(visual.rideHeight || 0)/layout.scale})" style="isolation:isolate">${body}</g></g></svg>`;
}
const bodies=new Map();
function bodyImage(record,car,illuminated=false) {
  const flat=record.paintMode==='flat-cel';
  const color=paint(car);
  if(!flat && (!record.layers.paintMask || paint(car)===record.paintColor))return layerImage(record.layers.body);
  const key=JSON.stringify([spriteRevision(),car.artId || car.id,color]);
  if(bodies.has(key))return bodies.get(key);
  const canvas=document.createElement('canvas');canvas.width=record.width;canvas.height=record.height;
  const ctx=canvas.getContext('2d');
  if(flat){
    ctx.drawImage(layerImage(record.layers.body),0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
    if(bodies.size>=24)bodies.clear();bodies.set(key,canvas);return canvas;
  }
  const mask=document.createElement('canvas');mask.width=record.width;mask.height=record.height;
  const m=mask.getContext('2d');m.drawImage(layerImage(record.layers.paintMask),0,0);m.globalCompositeOperation='source-in';m.fillStyle=paint(car);m.fillRect(0,0,mask.width,mask.height);
  ctx.drawImage(layerImage(record.layers.body),0,0);ctx.globalCompositeOperation='color';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(layerImage(record.layers.body),0,0);
  if(bodies.size>=24)bodies.clear();bodies.set(key,canvas);return canvas;
}
export function drawSprite(ctx,car,x,y,width,rotation={},options={}) {
  const record=getCarSprite(car);if(!record || !spriteReady(record,car.visual))return false;
  const layout=spriteLayout(record),visual=car.visual || {};
  const flat=record.paintMode==='flat-cel',view=flat?bodyView(visual):'assembled',isolated=view!=='assembled';
  ctx.save();ctx.translate(x,y);ctx.scale(width/600,width/600);
  if(!isolated)for(const e of shadowEllipses(record,visual)){ctx.fillStyle=`rgba(0,0,0,${e.opacity})`;ctx.beginPath();ctx.ellipse(e.x,e.y,e.rx,e.ry,0,0,Math.PI*2);ctx.fill();}
  if(record.facing==='left'){ctx.translate(600,0);ctx.scale(-1,1);}
  ctx.translate(layout.x,layout.y);ctx.scale(layout.scale,layout.scale);
  const bodyTransform=()=>{
    if(options.pitch){const x=(record.wheels[0].x+record.wheels[1].x)/2,y=(record.wheels[0].y+record.wheels[1].y)/2;ctx.translate(x,y);ctx.rotate(options.pitch*(record.facing==='left'?-1:1));ctx.translate(-x,-y);}
    ctx.translate(0,(visual.rideHeight || 0)/layout.scale);
  };
  if(!isolated && record.layers.underlay){ctx.save();bodyTransform();ctx.drawImage(layerImage(record.layers.underlay),0,0,record.width,record.height);ctx.restore();}
  const attachment=(slot,layer,angle=0)=>{
    if(!layer)return;
    const t=attachmentTransform(slot,layer);ctx.save();ctx.translate(t.x,t.y);ctx.rotate(angle);ctx.scale(t.scale,t.scale);ctx.drawImage(layerImage(layer),t.offsetX,t.offsetY,layer.width,layer.height);ctx.restore();
  };
  for(const slot of isolated?[]:componentLayers(record,visual)) {
    const angle=(rotation[slot.axle] || 0)*(record.facing==='left'?-1:1);
    attachment(slot,slot.rotor,angle);attachment(slot,slot.brake);attachment(slot,slot.wheel,angle);
  }
  bodyTransform();
  if(view==='assembled' || view==='paint')ctx.drawImage(bodyImage(record,car,view==='assembled'),0,0,record.width,record.height);
  if(flat)for(const role of bodyOverlays(record))if(view==='assembled' || view===role)ctx.drawImage(layerImage(record.layers[role]),0,0,record.width,record.height);
  ctx.restore();return true;
}
