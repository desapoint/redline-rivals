import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePack, attachmentTransform, spriteLayout, selectedLayers, advanceWheelRotation } from '../src/sprite-geometry.js';
import { demoSpritePack } from '../src/demo-sprite-pack.js';
import { freshSave, validateSave, newCar } from '../src/storage.js';
import { buildCar, createVehicle, stepVehicle } from '../src/physics.js';
import { installSpritePack, getCarSprite, spriteRevision } from '../src/car-assets.js';

test('native wheel pivots align independently of component image size',()=>{
  const pack=normalizePack(demoSpritePack),car=pack.cars['layer-demo'];
  for(const component of [car.layers.wheel,car.layers.brake,pack.components.brakes['demo-gold']]){
    for(const slot of car.wheels){const t=attachmentTransform(slot,component);
      assert.equal(t.x+(component.pivot[0]+t.offsetX)*t.scale,slot.x);
      assert.equal(t.y+(component.pivot[1]+t.offsetY)*t.scale,slot.y);
      assert.ok(Math.abs(component.radius*t.scale-slot.radius)<1e-10);
    }
  }
  const layout=spriteLayout(car);
  for(const slot of car.wheels)assert.equal(layout.y+(slot.y+slot.radius)*layout.scale,196);
});
test('metadata rejects absent wheel geometry, invalid masks and nonlocal paths',()=>{
  for(const mutate of [p=>p.cars['layer-demo'].wheels.pop(),p=>p.cars['layer-demo'].layers.wheel.pivot=[NaN,0],p=>p.cars['layer-demo'].layers.body.file='../outside.png',p=>p.cars['layer-demo'].layers.wheel.file='https://example.com/wheel.png',p=>p.cars['layer-demo'].layers.paintMask.width=1,p=>p.cars['layer-demo'].bounds=[0,0,10000,300],p=>p.cars['layer-demo'].wheels[1].axle='rear']){
    const pack=structuredClone(demoSpritePack);mutate(pack);assert.throws(()=>normalizePack(pack));
  }
});
test('left-facing metadata assigns front and rear correctly without editing input',()=>{
  const pack=structuredClone(demoSpritePack),car=pack.cars['layer-demo'];car.facing='left';car.wheels.forEach(s=>delete s.axle);
  const parsed=normalizePack(pack);assert.equal(parsed.cars['layer-demo'].wheels[0].axle,'front');assert.equal(parsed.cars['layer-demo'].wheels[1].axle,'rear');assert.equal(car.wheels[0].axle,undefined);
});
test('unknown component IDs restore factory parts, with per-axle parts overriding shared defaults',()=>{
  const car=structuredClone(demoSpritePack.cars['layer-demo']);car.wheels[0].wheel=demoSpritePack.components.wheels['demo-silver'];
  const stock=selectedLayers(car,{wheelAsset:'unfinished',brakeAsset:'unfinished'},demoSpritePack.components);
  assert.equal(stock[0].wheel,car.wheels[0].wheel);assert.equal(stock[1].wheel,car.layers.wheel);
  const inherited=selectedLayers(car,{wheelAsset:'constructor',brakeAsset:'toString'},demoSpritePack.components);
  assert.equal(inherited[1].wheel,car.layers.wheel);assert.equal(inherited[0].brake,car.layers.brake);
  const custom=selectedLayers(car,{wheelAsset:'demo-silver',brakeAsset:'demo-gold'},demoSpritePack.components);
  assert.equal(custom[1].wheel,demoSpritePack.components.wheels['demo-silver']);assert.equal(custom[0].brake,demoSpritePack.components.brakes['demo-gold']);
});
test('one circumference turns wheels once; wheelspin affects only driven axles',()=>{
  const car={drive:'RWD',radius:.31};const normal=advanceWheelRotation(null,car,Math.PI*.31);
  assert.equal(normal.front,Math.PI);assert.equal(normal.rear,Math.PI);
  const spinning=advanceWheelRotation(null,car,1,1);assert.equal(spinning.front,1/.31);assert.equal(spinning.rear,(2/.31)%(Math.PI*2));
  assert.deepEqual(advanceWheelRotation(normal,car,0,1),normal);
  assert.deepEqual(advanceWheelRotation(null,{...car,drive:'AWD'},1,1),{front:spinning.rear,rear:spinning.rear});
});
test('actual simulation advances wheel angles without changing race distance or save format',()=>{
  const car=buildCar(newCar('kaze')),s=createVehicle(car);s.started=true;
  stepVehicle(s,1/120);assert.ok(s.x>0);assert.ok(s.wheelRotation.front>0);assert.ok(s.wheelRotation.rear>=s.wheelRotation.front);
  const before={...s.wheelRotation};s.started=false;stepVehicle(s,1/120);assert.deepEqual(s.wheelRotation,before);
});
test('legacy saves load and component selections survive unavailable packs',()=>{
  const save=freshSave();const legacy=validateSave(save);assert.equal(legacy.cars[0].visual.wheelAsset,'');
  save.cars[0].visual.wheelAsset='future-wheel';save.cars[0].visual.brakeAsset='future-brake';
  const restored=validateSave(JSON.parse(JSON.stringify(save)));assert.equal(restored.cars[0].visual.wheelAsset,'future-wheel');assert.equal(restored.cars[0].visual.brakeAsset,'future-brake');
  save.cars[0].visual.wheelAsset='../../bad.png';assert.equal(validateSave(save).cars[0].visual.wheelAsset,'');
});
test('failed image decoding or native dimension mismatch retains the complete previous catalog',async()=>{
  const original=globalThis.Image;
  const dimensions=new Map();for(const car of Object.values(demoSpritePack.cars))for(const l of Object.values(car.layers))dimensions.set(l.file,[l.width,l.height]);
  for(const group of Object.values(demoSpritePack.components))for(const l of Object.values(group))dimensions.set(l.file,[l.width,l.height]);
  let fail=false,mismatch=false;
  globalThis.Image=class {complete=true;async decode(){if(fail)throw Error('decode failed');const key=new URL(this.src).pathname.split('/cars/')[1];const [w,h]=dimensions.get(key);this.naturalWidth=mismatch?w+1:w;this.naturalHeight=h;}};
  try{
    await installSpritePack(demoSpritePack,new URL('https://test.invalid/cars/'));const revision=spriteRevision(),record=getCarSprite({artId:'layer-demo'});
    fail=true;await assert.rejects(installSpritePack(demoSpritePack,new URL('https://test.invalid/cars/')),/decode failed/);assert.equal(getCarSprite({artId:'layer-demo'}),record);assert.equal(spriteRevision(),revision);
    fail=false;mismatch=true;await assert.rejects(installSpritePack(demoSpritePack,new URL('https://test.invalid/cars/')),/dimensions/);assert.equal(getCarSprite({artId:'layer-demo'}),record);
    mismatch=false;await installSpritePack({schemaVersion:1,cars:{}},new URL('https://test.invalid/cars/'));assert.equal(getCarSprite({id:'layer-demo'}),null);
  }finally{globalThis.Image=original;}
});
