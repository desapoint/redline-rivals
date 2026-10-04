import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARS,EVENTS,CAREER_MODELS,CAREER_PRIZES,LEGACY_CARS,LEGACY_MODEL_REPLACEMENTS} from '../src/data.js';
import {newCar,freshSave,validateSave} from '../src/storage.js';
import {buildCar,estimate,createVehicle,stepVehicle,shiftVehicle,idealShift} from '../src/physics.js';
import {createDriveLab,setLabSpeed,stepDriveLab,launchDriveLab} from '../src/drive-lab-model.js';
import {normalizePack,attachmentTransform,spriteLayout} from '../src/sprite-geometry.js';
import {installSpritePack} from '../src/car-assets.js';
import {drawSprite,spriteSVG,celPaintColor} from '../src/sprite-renderer.js';
import {restrictionReason} from '../src/views.js';
const pack=JSON.parse(readFileSync(new URL('../src/assets/cars/manifest.json',import.meta.url),'utf8'));

test('every demo car, career opponent and prize has real production artwork',()=>{
  assert.equal(CARS.length,12);
  for(const c of CARS)assert.ok(pack.cars[c.artId],c.id+' needs a production sprite');
  for(const id of [...CAREER_MODELS,...CAREER_PRIZES])assert.ok(CARS.some(c=>c.id===id),'career model '+id+' is playable');
  assert.equal(CAREER_MODELS.length,7);assert.equal(CAREER_PRIZES.length,7);
  for(const [id,record] of Object.entries(pack.cars)){
    assert.match(record.provenance.bodySource,/body-2d\.png$/);
    const [rear,front]=record.wheels;
    assert.equal(rear.y+rear.radius,front.y+front.radius,id+' tires contact the same road');
  }
  const truck=pack.cars['chevrolet-silverado-1500-custom-crew-short-2025-black'];
  assert.deepEqual(truck.wheels.map(({x,y,radius})=>[x,y,radius]),[[464,660,145],[1750,660,145]]);
});

test('fictional-car saves migrate to real cars without losing ownership or progress',()=>{
  const s=freshSave(1000);
  s.cars=LEGACY_CARS.map(c=>({...newCar(c.id),color:c.color,upgrades:{intake:2},condition:73}));
  s.cars[0].color='#12abcd';s.selected=s.cars[0].uid;s.free.opponent='nova';
  s.business.jobs=[{jobId:'show',carUid:s.selected,endsAt:3000}];s.records[s.selected+'-402.336']=12.4;s.completed=['F-0'];
  const migrated=validateSave(s,2000);
  assert.equal(migrated.cars.length,s.cars.length);assert.equal(migrated.selected,s.selected);
  assert.deepEqual(migrated.records,s.records);assert.deepEqual(migrated.business.jobs,s.business.jobs);assert.deepEqual(migrated.completed,s.completed);
  migrated.cars.forEach((c,i)=>{assert.equal(c.model,LEGACY_MODEL_REPLACEMENTS[s.cars[i].model]);assert.equal(c.uid,s.cars[i].uid);assert.equal(c.upgrades.intake,2);assert.equal(c.condition,73);});
  assert.equal(migrated.cars[0].color,'#12abcd');assert.equal(migrated.free.opponent,'matched');
  assert.deepEqual(validateSave(migrated,2000).cars,migrated.cars,'migration happens once');
});

test('Forte effective DCT gearing preserves both factory final drives and migrates the existing FWD car',()=>{
  const base=CARS.find(c=>c.id==='vortex'),factory=base.manufacturerReference;
  assert.equal(base.hp,201);assert.equal(base.drive,'FWD');assert.equal(base.ratios.length,7);
  factory.transmission.ratios.forEach((r,i)=>assert.ok(Math.abs(r*factory.transmission.finalDriveByGear[i+1]-base.ratios[i]*base.finalDrive)<1e-10));
  assert.ok(base.ratios.every((r,i)=>i===0||r<base.ratios[i-1]));assert.deepEqual(factory.curbMassKg.sourceRange,[3012,3079]);
  const s=freshSave();s.cars.push({...newCar('vortex'),vehicleRevision:0,color:'#81abff',tune:{finalDrive:4.1,launchRPM:3200,ratios:[3.6,2.19,1.54,1.21,1,.82]},upgrades:{tires:1,intake:2}});
  const out=validateSave(s).cars[1];assert.equal(out.uid,s.cars[1].uid);assert.equal(out.color,base.color);assert.equal(out.upgrades.intake,2);assert.equal(out.tune.finalDrive,base.finalDrive);assert.equal(out.tune.ratios,undefined);
});

test('Rogue accelerates with continuous gearing, no shift interruptions, and a stable power RPM target',()=>{
  const c=buildCar(newCar('rogue')),s=createVehicle(c);s.started=true;
  assert.deepEqual(c.ratios,[]);assert.equal(c.manufacturerReference.transmission.ratios,null);assert.equal(c.manufacturerReference.curbMassKg,null);
  for(let i=0;i<1200&&!s.finished;i++)stepVehicle(s,1/120);
  assert.ok(s.v>25);assert.ok(s.cvtRatio<c.cvt.maxRatio);assert.ok(s.cvtRatio>=c.cvt.minRatio);assert.ok(Math.abs(s.rpm-idealShift(c))<200);
  const before={gear:s.gear,rpm:s.rpm,ratio:s.cvtRatio};assert.equal(shiftVehicle(s),null);assert.equal(shiftVehicle(s,-1),null);assert.deepEqual({gear:s.gear,rpm:s.rpm,ratio:s.cvtRatio},before);assert.equal(s.shiftTimer,0);
  while(!s.finished&&s.elapsed<30)stepVehicle(s,1/120);assert.equal(s.finished,true);assert.ok(s.finishTime<20);
  const lab=createDriveLab(c);setLabSpeed(lab,90);lab.inputs.throttle=1;for(let i=0;i<120;i++)stepDriveLab(lab,1/120);
  assert.ok(Number.isFinite(lab.vehicle.rpm));assert.ok(lab.vehicle.v>25);lab.vehicle.gear=0;launchDriveLab(lab);assert.equal(lab.vehicle.gear,1);
  lab.paused=true;const snapshot=JSON.stringify(lab);stepDriveLab(lab,1);assert.equal(JSON.stringify(lab),snapshot);
  const burnout=createDriveLab(c);burnout.burnout=true;burnout.inputs.throttle=1;stepDriveLab(burnout,1);assert.ok(Number.isFinite(burnout.vehicle.wheelRotation.front));assert.ok(Number.isFinite(burnout.vehicle.wheelRotation.rear));
});

test('real roster uses sourced Mazda specs and keeps unknown Silverado factory facts unknown',()=>{
  const [mazda,truck]=CARS;
  assert.equal(mazda.artId,'mazda3-gt-turbo-sedan-2021-red');assert.equal(mazda.hp,250);assert.equal(mazda.mass,1533);
  assert.deepEqual(mazda.ratios,mazda.manufacturerReference.transmission.ratios);
  assert.equal(mazda.manufacturerReference.power[1].hp,227);
  assert.equal(truck.hp,310);assert.equal(truck.ratios.length,8);
  for(const field of ['curbMassKg','redlineRpm','dragCoefficient','frontalAreaM2'])assert.equal(truck.manufacturerReference[field],null);
  assert.equal(truck.manufacturerReference.transmission.ratios,null);assert.ok(truck.modelAssumptions.some(s=>s.includes('2,250')));
  for(const base of [mazda,truck]){const c=buildCar(newCar(base.id));assert.equal(c.hp,base.hp);assert.ok(estimate(c).et<20);}
  assert.equal(restrictionReason(buildCar(newCar('kaze')),EVENTS[2]),null,'starter can complete its restricted event');
});

test('replacement migrates old factory defaults once while retaining ownership, jobs, records and custom builds',()=>{
  const s=freshSave(1000);s.cars.push(newCar('metro'));
  for(const c of s.cars){const base=CARS.find(b=>b.id===c.model);delete c.vehicleRevision;c.color=base.legacyDefaults.color;c.tune={finalDrive:4.1,launchRPM:base.legacyDefaults.launchRPM,ratios:[...base.legacyDefaults.ratios]};c.upgrades.intake=2;}
  s.records[`${s.selected}-402.336`]=15.3;s.business.jobs=[{jobId:'show',carUid:s.selected,endsAt:3000}];
  const restored=validateSave(s,2000);
  assert.equal(restored.selected,s.selected);assert.deepEqual(restored.records,s.records);assert.deepEqual(restored.business.jobs,s.business.jobs);
  restored.cars.forEach((c,i)=>{assert.equal(c.uid,s.cars[i].uid);assert.equal(c.model,s.cars[i].model);assert.equal(c.upgrades.intake,2);assert.equal(c.color,CARS[i].color);assert.equal(c.tune.finalDrive,CARS[i].finalDrive);assert.equal(c.tune.ratios,undefined);});
  const custom=s.cars[0];custom.color='#81abff';custom.tune.finalDrive=3.55;custom.tune.ratios=[3.4,2.2,1.5,1.2,1,.8];
  const out=validateSave(s,2000);assert.equal(out.cars[0].color,custom.color);assert.equal(out.cars[0].tune.finalDrive,3.55);assert.deepEqual(out.cars[0].tune.ratios,custom.tune.ratios);
  out.cars[0].color='#e6603b';out.cars[0].tune.finalDrive=4.1;
  const again=validateSave(out,2000);assert.equal(again.cars[0].color,'#e6603b');assert.equal(again.cars[0].tune.finalDrive,4.1,'new custom choices are not migrated twice');
  assert.equal(s.cars[0].vehicleRevision,undefined,'input save is not mutated');
});

test('conversion preserves reviewed native anchors, component scales and separate underlay',()=>{
  const normalized=normalizePack(pack);
  for(const record of Object.values(normalized.cars)){
    const sourcePath=record.provenance.sourceManifest||record.provenance.sourcePackage+'/car-sprite.json';
    const source=JSON.parse(readFileSync(new URL('../'+sourcePath,import.meta.url),'utf8'));
    assert.equal(record.layers.underlay.width,source.canvas.width);
    const layout=spriteLayout(record),width=layout.scale*record.displayBounds[2],height=layout.scale*record.displayBounds[3];
    assert.ok(width<=500+1e-6&&height<=155+1e-6,'taller vehicles fit without cropping corrected tires');
    assert.ok(Math.abs(Math.max(width/500,height/155)-1)<1e-6,'framing fills at least one intended dimension');
    for(const slot of record.wheels){assert.equal(slot.x,source.anchors[slot.axle+'Wheel'].x);assert.equal(slot.y,source.anchors[slot.axle+'Wheel'].y);
      assert.equal(new Set([slot.wheel.file,slot.brake.file,slot.rotor.file]).size,3,'wheel, rotor and stationary caliper use separate image files');
      assert.equal(slot.y+slot.radius,record.wheels[0].y+record.wheels[0].radius,'tires share a contact line');
      for(const [kind,id] of [['wheel','wheel'],['brake','caliper'],['rotor','rotor']]){
        const original=source.layers.find(l=>l.id===slot.axle+'-'+id),t=attachmentTransform(slot,slot[kind]);
        assert.equal(original.rotateWithWheel,kind!=='brake','stationary caliper and rotating rotor roles remain explicit');
        assert.ok(Math.abs(t.scale-original.placement.scale)<1e-12);assert.equal(t.x,slot.x);assert.equal(t.y,slot.y);
      }
    }
  }
  const bad=structuredClone(pack);Object.values(bad.cars)[0].layers.underlay.height=1;assert.throws(()=>normalizePack(bad),/underlay/);
});

test('production drawing puts underlay below wheels, keeps calipers fixed and rotates wheels and rotors',async()=>{
  const oldImage=globalThis.Image,oldDocument=globalThis.document,dimensions=new Map(),paintOperations=[];
  for(const c of Object.values(pack.cars))for(const l of [...Object.values(c.layers),...c.wheels.flatMap(s=>[s.wheel,s.brake,s.rotor])])dimensions.set(l.file,l);
  globalThis.Image=class{complete=true;async decode(){const l=dimensions.get(new URL(this.src).pathname.split('/cars/')[1]);this.naturalWidth=l.width;this.naturalHeight=l.height;}};
  globalThis.document={createElement(){return {getContext(){return {drawImage(){},fillRect(){paintOperations.push(['fill',this.fillStyle]);},set globalCompositeOperation(value){paintOperations.push(['composite',value]);}};}};}};
  try{
    await installSpritePack(pack,new URL('https://test.invalid/cars/'));
    for(const base of CARS.filter(c=>c.artId&&pack.cars[c.artId]?.paintMode==='flat-cel')){
      const c=buildCar(newCar(base.id));
      for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){
        const log=[],ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},rotate(value){log.push(['rotate',value]);},drawImage(img){log.push(['image',img.src?new URL(img.src).pathname.split('/').at(-1):'flat-paint']);}};
        assert.equal(drawSprite(ctx,c,0,0,600,{front:angle,rear:angle}),true);
        assert.deepEqual(log.filter(x=>x[0]==='image').map(x=>x[1]),['underlay.webp','rear-rotor.webp','rear-caliper.webp','rear-wheel.webp','front-rotor.webp','front-caliper.webp','front-wheel.webp','flat-paint','shading.webp','fixtures.webp',...(pack.cars[c.artId].layers.lights?['lights.webp']:[]),'linework.webp']);
        const rotation=pack.cars[c.artId].facing==='left'?-angle:angle;
        assert.deepEqual(log.filter(x=>x[0]==='rotate').map(x=>x[1]),[rotation,0,rotation,rotation,0,rotation]);
        const svg=spriteSVG(c,'',{front:angle,rear:angle});assert.ok(svg.indexOf('underlay.webp')<svg.indexOf('rear-rotor.webp'));
        assert.ok(svg.includes(`rotate(${rotation*180/Math.PI})`));assert.match(svg,/rotate\(0\)/);
        assert.doesNotMatch(svg,/mix-blend-mode:color/);assert.match(svg,new RegExp('fill="'+celPaintColor(c.color)+'"'));
        assert.ok(svg.indexOf('shading.webp')<svg.indexOf('fixtures.webp'));assert.ok(svg.indexOf('fixtures.webp')<svg.indexOf('linework.webp'));
      }
    }
    assert.ok(paintOperations.some(([op,value])=>op==='composite'&&value==='source-in'));
    assert.ok(!paintOperations.some(([op,value])=>op==='composite'&&value==='color'));
  }finally{await installSpritePack({schemaVersion:1,cars:{}},new URL('https://test.invalid/cars/'));globalThis.Image=oldImage;globalThis.document=oldDocument;}
});

test('flat production bodies require independent shading, fixtures and line art',()=>{
  for(const record of Object.values(pack.cars)){
    assert.equal(record.paintMode,'flat-cel');
    assert.equal(new Set(['body','shading','fixtures','linework'].map(role=>record.layers[role].file)).size,4);
    assert.equal(record.flatPaint.gradientInterpolation,false);
    assert.equal(record.flatPaint.shadingStyle,'source-native-cel');
    assert.equal(record.flatPaint.classificationBlurPixels,0);
  }
  for(const role of ['shading','fixtures','linework']){
    const bad=structuredClone(pack),record=Object.values(bad.cars)[0];delete record.layers[role];
    assert.throws(()=>normalizePack(bad),new RegExp(role));
  }
});

test('black and near-black finishes retain ordered cel tones without shifting bright paint',()=>{
  for(const color of ['#000000','#080a10','#202226']){
    const lit=celPaintColor(color).slice(1).match(/../g).map(v=>parseInt(v,16));
    const shadow=lit.map(v=>Math.round(v*(1-140/255))),mid=lit.map(v=>Math.round(v*(1-72/255)));
    const highlight=lit.map(v=>Math.round(v*(1-56/255)+56));
    for(let i=0;i<3;i++){
      assert.ok(shadow[i]<mid[i]&&mid[i]<lit[i]&&lit[i]<highlight[i],color+' has distinct ordered tones');
      assert.ok(lit[i]-shadow[i]>=25,color+' has readable shadow contrast');
    }
  }
  for(const color of ['#383838','#ffffff','#009cff','#ff2bd6','#57e441'])assert.equal(celPaintColor(color),color);
  assert.equal(celPaintColor('#080a10'),'#303238','dark blue channel differences survive lighting');
});
