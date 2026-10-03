import { readFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePack } from '../src/sprite-geometry.js';
import { CARS, CAREER_MODELS, CAREER_PRIZES } from '../src/data.js';
import { createHash } from 'node:crypto';
const root=fileURLToPath(new URL('../src/assets/cars/',import.meta.url));
const pack=normalizePack(JSON.parse(readFileSync(path.join(root,'manifest.json'),'utf8')));
for(const car of CARS)if(!car.artId || !pack.cars[car.artId])throw Error(`Playable car has no production artwork: ${car.id}`);
for(const id of [...CAREER_MODELS,...CAREER_PRIZES])if(!CARS.some(car=>car.id===id))throw Error(`Career refers to a retired model: ${id}`);
for(const [id,car] of Object.entries(pack.cars)){
  const source=path.resolve(root,'../../../',car.provenance.sourceManifest);
  if(createHash('sha256').update(readFileSync(source)).digest('hex')!==car.provenance.sourceManifestSha256)throw Error(`Source geometry snapshot changed: ${id}`);
}
const layers=[...Object.values(pack.cars).flatMap(c=>[...Object.values(c.layers),...c.wheels.flatMap(w=>[w.wheel,w.brake,w.rotor])]),...Object.values(pack.components).flatMap(group=>Object.values(group))].filter(Boolean);
for(const layer of layers){
  const file=path.resolve(root,layer.file);
  if(!existsSync(file))throw Error(`Missing car asset: ${layer.file}`);
  if(!realpathSync(file).startsWith(realpathSync(root)+path.sep))throw Error(`Car asset leaves its pack directory: ${layer.file}`);
}
console.log(`Car manifest valid: ${Object.keys(pack.cars).length} cars, ${new Set(layers.map(l=>l.file)).size} image files.`);
