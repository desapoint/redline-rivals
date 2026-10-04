import { normalizePack, selectedLayers } from './sprite-geometry.js';

let catalog=normalizePack({schemaVersion:1,cars:{}});
let baseURL=new URL('./assets/cars/',import.meta.url);
const images=new Map();
let revision=0;
export function getCarSprite(car) { const id=car.artId || car.id;return Object.hasOwn(catalog.cars,id)?catalog.cars[id]:null; }
export function spriteRevision() { return revision; }
export function componentOptions(type) { return Object.entries(catalog.components[type] || {}).map(([id,value])=>[id,value.name || id]); }
function imageURL(layer,base=baseURL){
  const url=new URL(layer.file,base);
  if(layer.assetVersion)url.searchParams.set('v',layer.assetVersion);
  return url.href;
}
export function assetURL(layer) { return imageURL(layer); }
export function componentLayers(record,visual) { return selectedLayers(record,visual,catalog.components); }
export function layerImage(layer) {
  const url=assetURL(layer);
  if(!images.has(url)) {
    const img=new Image();img.src=url;images.set(url,img);
  }
  return images.get(url);
}
const ready=img=>img.complete && img.naturalWidth>0;
function contactY(image,layer){
  // Read a narrow tire-center strip once at installation. Transparent source
  // margins and overstated metadata radii must not create a floating shadow.
  const canvas=globalThis.document?.createElement('canvas'),ctx=canvas?.getContext('2d');
  if(!ctx?.getImageData)return layer.pivot[1]+layer.radius;
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;ctx.drawImage(image,0,0);
  const width=Math.max(1,Math.round(layer.radius*.08)),x=Math.max(0,Math.round(layer.pivot[0]-width/2));
  const pixels=ctx.getImageData(x,0,Math.min(width,canvas.width-x),canvas.height),row=pixels.width*4;
  for(let y=pixels.height-1;y>=Math.floor(layer.pivot[1]);y--)for(let i=y*row+3;i<(y+1)*row;i+=4)if(pixels.data[i]>=128)return y+1;
  return layer.pivot[1]+layer.radius;
}
export function spriteReady(record,visual) {
  return [...Object.values(record.layers),...componentLayers(record,visual).flatMap(s=>[s.wheel,s.brake,s.rotor])].filter(Boolean).every(l=>ready(layerImage(l)));
}
export async function installSpritePack(pack,url=baseURL) {
  // Commit only a fully decoded pack, so a missing component never produces a half-car.
  const next=normalizePack(pack),nextURL=new URL(url,import.meta.url),loaded=new Map();
  for(const record of Object.values(next.cars)){
    const version=record.provenance?.reviewFingerprint;
    if(/^[a-f0-9]{64}$/i.test(version||''))for(const l of [...Object.values(record.layers),...record.wheels.flatMap(w=>[w.wheel,w.brake,w.rotor])].filter(Boolean))l.assetVersion=version;
  }
  const layers=[...Object.values(next.cars).flatMap(c=>[...Object.values(c.layers),...c.wheels.flatMap(s=>[s.wheel,s.brake,s.rotor])]),...Object.values(next.components).flatMap(v=>Object.values(v))].filter(Boolean);
  await Promise.all(layers.map(async l=>{
    const key=imageURL(l,nextURL);
    if(loaded.has(key))return loaded.get(key);
    const job=(async()=>{const img=new Image();img.src=key;await img.decode();if(img.naturalWidth!==l.width || img.naturalHeight!==l.height)throw Error(`${l.file}: image dimensions do not match metadata`);return img;})();
    loaded.set(key,job);await job;
  }));
  const resolved=await Promise.all([...loaded].map(async ([key,job])=>[key,await job]));
  const decoded=new Map(resolved),contacts=new Map();
  for(const layer of [...Object.values(next.cars).flatMap(c=>c.wheels.map(w=>w.wheel||c.layers.wheel)),...Object.values(next.components.wheels||{})].filter(Boolean)){
    const key=imageURL(layer,nextURL);
    if(!contacts.has(key))contacts.set(key,contactY(decoded.get(key),layer));
    layer.contactY=contacts.get(key);
  }
  catalog=next;baseURL=nextURL;images.clear();for(const [key,img] of resolved)images.set(key,img);revision++;
  return Object.keys(catalog.cars).length;
}
export async function loadCarAssets() {
  const url=new URL('./assets/cars/manifest.json',import.meta.url);
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`Sprite manifest: HTTP ${response.status}`);
  return installSpritePack(await response.json(),new URL('./',url));
}
