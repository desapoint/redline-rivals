import { normalizePack, selectedLayers } from './sprite-geometry.js';

let catalog=normalizePack({schemaVersion:1,cars:{}});
let baseURL=new URL('./assets/cars/',import.meta.url);
const images=new Map();
let revision=0;
export function getCarSprite(car) { const id=car.artId || car.id;return Object.hasOwn(catalog.cars,id)?catalog.cars[id]:null; }
export function spriteRevision() { return revision; }
export function componentOptions(type) { return Object.entries(catalog.components[type] || {}).map(([id,value])=>[id,value.name || id]); }
export function assetURL(layer) { return new URL(layer.file,baseURL).href; }
export function componentLayers(record,visual) { return selectedLayers(record,visual,catalog.components); }
export function layerImage(layer) {
  const url=assetURL(layer);
  if(!images.has(url)) {
    const img=new Image();img.src=url;images.set(url,img);
  }
  return images.get(url);
}
const ready=img=>img.complete && img.naturalWidth>0;
export function spriteReady(record,visual) {
  return [record.layers.body,record.layers.underlay,record.layers.paintMask,...componentLayers(record,visual).flatMap(s=>[s.wheel,s.brake,s.rotor])].filter(Boolean).every(l=>ready(layerImage(l)));
}
export async function installSpritePack(pack,url=baseURL) {
  // Commit only a fully decoded pack, so a missing component never produces a half-car.
  const next=normalizePack(pack),nextURL=new URL(url,import.meta.url),loaded=new Map();
  const layers=[...Object.values(next.cars).flatMap(c=>[...Object.values(c.layers),...c.wheels.flatMap(s=>[s.wheel,s.brake,s.rotor])]),...Object.values(next.components).flatMap(v=>Object.values(v))].filter(Boolean);
  await Promise.all(layers.map(async l=>{
    const key=new URL(l.file,nextURL).href;
    if(loaded.has(key))return loaded.get(key);
    const job=(async()=>{const img=new Image();img.src=key;await img.decode();if(img.naturalWidth!==l.width || img.naturalHeight!==l.height)throw Error(`${l.file}: image dimensions do not match metadata`);return img;})();
    loaded.set(key,job);await job;
  }));
  const resolved=await Promise.all([...loaded].map(async ([key,job])=>[key,await job]));
  catalog=next;baseURL=nextURL;images.clear();for(const [key,img] of resolved)images.set(key,img);revision++;
  return Object.keys(catalog.cars).length;
}
export async function loadCarAssets() {
  const url=new URL('./assets/cars/manifest.json',import.meta.url);
  const response=await fetch(url);if(!response.ok)throw Error(`Sprite manifest: HTTP ${response.status}`);
  return installSpritePack(await response.json(),new URL('./',url));
}
