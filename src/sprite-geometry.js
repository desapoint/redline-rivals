// Native-image coordinates are shared by the SVG showroom and Canvas race renderer.
const finite = value => Number.isFinite(value);
const safeId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,95}$/i.test(value);
export const isAssetId = safeId;
function dimensions(value, name) {
  if (!finite(value.width) || !finite(value.height) || value.width <= 0 || value.height <= 0 || value.width > 16384 || value.height > 16384) throw Error(`${name}: invalid dimensions`);
}
function layer(value, name, rotating = false) {
  if (!value || typeof value.file !== 'string' || !/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(png|webp|svg|avif)$/i.test(value.file)) throw Error(`${name}: use a local relative image path`);
  dimensions(value, name);
  if (rotating && (!Array.isArray(value.pivot) || value.pivot.length !== 2 || !value.pivot.every(finite) || value.pivot[0] < 0 || value.pivot[0] > value.width || value.pivot[1] < 0 || value.pivot[1] > value.height || !finite(value.radius) || value.radius <= 0 || value.radius > Math.max(value.width,value.height))) throw Error(`${name}: measured pivot and radius required`);
  return {...value, ...(rotating ? {pivot:[...value.pivot]} : {})};
}
export function normalizePack(pack) {
  if (pack?.schemaVersion !== 1 || !pack.cars || typeof pack.cars !== 'object' || Array.isArray(pack.cars)) throw Error('Expected sprite manifest schemaVersion 1 and a cars map');
  const result = {schemaVersion:1, cars:Object.create(null), components:{wheels:Object.create(null),brakes:Object.create(null)}};
  for (const [group, entries] of Object.entries(pack.components || {})) {
    if (!['wheels','brakes'].includes(group)) throw Error(`Unknown component group ${group}`);
    for (const [id, value] of Object.entries(entries)) {
      if (!safeId(id)) throw Error(`Invalid component ID ${id}`);
      result.components[group][id] = layer(value,`${group}.${id}`,true);
    }
  }
  for (const [id, value] of Object.entries(pack.cars)) {
    if (!safeId(id)) throw Error(`Invalid car art ID ${id}`);
    dimensions(value,id);
    if (!['right','left'].includes(value.facing)) throw Error(`${id}: facing must be right or left`);
    const b=value.bounds;
    if (!Array.isArray(b) || b.length!==4 || !b.every(finite) || b[0]<0 || b[1]<0 || b[2]<=0 || b[3]<=0 || b[0]+b[2]>value.width || b[1]+b[3]>value.height) throw Error(`${id}: invalid alpha bounds`);
    const d=value.displayBounds;
    if(d && (!Array.isArray(d)||d.length!==4||!d.every(finite)||d[0]<0||d[1]<0||d[2]<=0||d[3]<=0||d[0]+d[2]>value.width||d[1]+d[3]>value.height))throw Error(`${id}: invalid display bounds`);
    if (!Array.isArray(value.wheels) || value.wheels.length!==2) throw Error(`${id}: exactly two wheel attachment points required`);
    const layers={body:layer(value.layers?.body,`${id}.body`)};
    if (layers.body.width!==value.width || layers.body.height!==value.height) throw Error(`${id}: body must use the native canvas dimensions`);
    if(value.layers.underlay){
      layers.underlay=layer(value.layers.underlay,`${id}.underlay`);
      if(layers.underlay.width!==value.width || layers.underlay.height!==value.height)throw Error(`${id}: underlay must align with the body canvas`);
    }
    if (value.layers.paintMask) {
      layers.paintMask=layer(value.layers.paintMask,`${id}.paintMask`);
      if(layers.paintMask.width!==value.width || layers.paintMask.height!==value.height) throw Error(`${id}: paint mask must align with the body canvas`);
    }
    if(value.paintMode==='flat-cel'){
      if(!layers.paintMask)throw Error(`${id}: flat paint requires its silhouette mask`);
      for(const role of ['shading','fixtures','linework']){
        layers[role]=layer(value.layers[role],`${id}.${role}`);
        if(layers[role].width!==value.width || layers[role].height!==value.height)throw Error(`${id}: ${role} must align with the body canvas`);
      }
      if(value.layers.lights){
        layers.lights=layer(value.layers.lights,`${id}.lights`);
        if(layers.lights.width!==value.width || layers.lights.height!==value.height)throw Error(`${id}: lights must align with the body canvas`);
      }
    }else if(value.paintMode && value.paintMode!=='legacy-tint')throw Error(`${id}: unsupported paint mode`);
    for (const type of ['wheel','brake','rotor']) if(value.layers[type]) layers[type]=layer(value.layers[type],`${id}.${type}`,true);
    const wheels=value.wheels.map((w,i)=>{
      if (![w.x,w.y,w.radius].every(finite) || w.x<0 || w.x>value.width || w.y<0 || w.y>value.height || w.radius<=0 || w.radius>Math.max(value.width,value.height)) throw Error(`${id}: invalid wheel ${i}`);
      const rear = value.facing==='right' ? w.x < value.wheels[1-i].x : w.x > value.wheels[1-i].x;
      const slot={...w,axle:w.axle || (rear?'rear':'front')};
      if(!['rear','front'].includes(slot.axle)) throw Error(`${id}: invalid axle`);
      for(const type of ['wheel','brake','rotor']) if(w[type])slot[type]=layer(w[type],`${id}.${slot.axle}.${type}`,true);
      if(!slot.wheel && !layers.wheel)throw Error(`${id}: missing ${slot.axle} wheel layer`);
      return slot;
    });
    if(wheels[0].axle===wheels[1].axle || wheels[0].x===wheels[1].x) throw Error(`${id}: front and rear wheels must be distinct`);
    result.cars[id]={...value,bounds:[...b],layers,wheels};
  }
  return result;
}
export function attachmentTransform(slot, component) {
  const scale=slot.radius/component.radius;
  return {x:slot.x,y:slot.y,scale,offsetX:-component.pivot[0],offsetY:-component.pivot[1]};
}
export function spriteLayout(record) {
  const [x,y,width,height]=record.displayBounds||record.bounds;
  const ground=Math.max(...record.wheels.map(w=>wheelGround(w)));
  const scale=Math.min(500/width,155/Math.max(height,ground-y));
  return {scale,x:300-(x+width/2)*scale,y:196-ground*scale};
}
function wheelGround(slot){
  const wheel=slot.wheel;
  return wheel?.contactY!==undefined?slot.y+(wheel.contactY-wheel.pivot[1])*slot.radius/wheel.radius:slot.y+slot.radius;
}
export function spriteContacts(record,slots=record.wheels){
  const layout=spriteLayout(record);
  return slots.map(slot=>{
    const x=layout.x+slot.x*layout.scale;
    return {axle:slot.axle,x:record.facing==='left'?600-x:x,y:layout.y+wheelGround(slot)*layout.scale,radius:slot.radius*layout.scale};
  });
}
export function selectedLayers(record, visual={}, components={wheels:{},brakes:{}}) {
  const component=(group,id)=>Object.hasOwn(group || {},id)?group[id]:null;
  return record.wheels.map(slot=>({...slot,
    wheel:component(components.wheels,visual.wheelAsset) || slot.wheel || record.layers.wheel,
    brake:component(components.brakes,visual.brakeAsset) || slot.brake || record.layers.brake,
    rotor:slot.rotor || record.layers.rotor
  }));
}
export function advanceWheelRotation(rotation, car, distance, slip=0) {
  const next={front:rotation?.front || 0,rear:rotation?.rear || 0};
  const angle=distance/Math.max(.05,car.radius || .31);
  for(const axle of ['front','rear']) {
    const driven=car.drive==='AWD' || (car.drive==='FWD' ? axle==='front' : axle==='rear');
    next[axle]=(next[axle]+angle*(1+(driven?Math.max(0,slip):0)))%(Math.PI*2);
  }
  return next;
}
