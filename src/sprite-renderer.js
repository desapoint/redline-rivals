import { getCarSprite, spriteReady, layerImage, assetURL, componentLayers, spriteRevision } from './car-assets.js';
import { attachmentTransform, spriteLayout } from './sprite-geometry.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paint=car=>/^#[0-9a-f]{6}$/i.test(car.color || '')?car.color:'#e6603b';
let nextId=0;
const bodyView=visual=>['paint','shading','fixtures','linework'].includes(visual.bodyView)?visual.bodyView:'assembled';
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
  const body=flat?(view==='paint'?flatPaint:view==='assembled'?flatPaint+['shading','fixtures','linework'].map(role=>image(record.layers[role])).join(''):image(record.layers[view])):image(record.layers.body)+tint;
  return `<svg class="car-art ${esc(extraClass)}" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(car.name)}, layered car artwork" data-art-id="${esc(car.artId || car.id)}" data-body-view="${view}">${isolated?'':'<ellipse cx="300" cy="199" rx="240" ry="9" fill="#000" opacity=".45"/>'}<g transform="${record.facing==='left'?'translate(600 0) scale(-1 1) ':''}translate(${layout.x} ${layout.y}) scale(${layout.scale})">${underlay}${isolated?'':wheels}<g transform="translate(0 ${(visual.rideHeight || 0)/layout.scale})" style="isolation:isolate">${body}</g></g></svg>`;
}
const bodies=new Map();
function bodyImage(record,car) {
  const flat=record.paintMode==='flat-cel';
  if(!flat && (!record.layers.paintMask || paint(car)===record.paintColor))return layerImage(record.layers.body);
  const key=JSON.stringify([spriteRevision(),car.artId || car.id,paint(car)]);
  if(bodies.has(key))return bodies.get(key);
  const canvas=document.createElement('canvas');canvas.width=record.width;canvas.height=record.height;
  const ctx=canvas.getContext('2d');
  if(flat){
    ctx.drawImage(layerImage(record.layers.body),0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=paint(car);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
    if(bodies.size>=24)bodies.clear();bodies.set(key,canvas);return canvas;
  }
  const mask=document.createElement('canvas');mask.width=record.width;mask.height=record.height;
  const m=mask.getContext('2d');m.drawImage(layerImage(record.layers.paintMask),0,0);m.globalCompositeOperation='source-in';m.fillStyle=paint(car);m.fillRect(0,0,mask.width,mask.height);
  ctx.drawImage(layerImage(record.layers.body),0,0);ctx.globalCompositeOperation='color';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(layerImage(record.layers.body),0,0);
  if(bodies.size>=24)bodies.clear();bodies.set(key,canvas);return canvas;
}
export function drawSprite(ctx,car,x,y,width,rotation={}) {
  const record=getCarSprite(car);if(!record || !spriteReady(record,car.visual))return false;
  const layout=spriteLayout(record),visual=car.visual || {};
  const flat=record.paintMode==='flat-cel',view=flat?bodyView(visual):'assembled',isolated=view!=='assembled';
  ctx.save();ctx.translate(x,y);ctx.scale(width/600,width/600);
  if(!isolated){ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(300,199,240,9,0,0,Math.PI*2);ctx.fill();}
  if(record.facing==='left'){ctx.translate(600,0);ctx.scale(-1,1);}
  ctx.translate(layout.x,layout.y);ctx.scale(layout.scale,layout.scale);
  if(!isolated && record.layers.underlay)ctx.drawImage(layerImage(record.layers.underlay),0,(visual.rideHeight || 0)/layout.scale,record.width,record.height);
  const attachment=(slot,layer,angle=0)=>{
    if(!layer)return;
    const t=attachmentTransform(slot,layer);ctx.save();ctx.translate(t.x,t.y);ctx.rotate(angle);ctx.scale(t.scale,t.scale);ctx.drawImage(layerImage(layer),t.offsetX,t.offsetY,layer.width,layer.height);ctx.restore();
  };
  for(const slot of isolated?[]:componentLayers(record,visual)) {
    const angle=(rotation[slot.axle] || 0)*(record.facing==='left'?-1:1);
    attachment(slot,slot.rotor,angle);attachment(slot,slot.brake);attachment(slot,slot.wheel,angle);
  }
  ctx.translate(0,(visual.rideHeight || 0)/layout.scale);
  if(view==='assembled' || view==='paint')ctx.drawImage(bodyImage(record,car),0,0,record.width,record.height);
  if(flat)for(const role of ['shading','fixtures','linework'])if(view==='assembled' || view===role)ctx.drawImage(layerImage(record.layers[role]),0,0,record.width,record.height);
  ctx.restore();return true;
}
