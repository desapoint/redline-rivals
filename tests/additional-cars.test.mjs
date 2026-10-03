import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDITIONAL_REAL_CARS} from '../src/additional-cars.js';
import {freshSave,newCar,validateSave} from '../src/storage.js';
import {buildCar,estimate} from '../src/physics.js';
import {createDriveLab,setLabSpeed,stepDriveLab} from '../src/drive-lab-model.js';
import {factoryTemplate,realVehicleData} from '../src/vehicle-details.js';

test('eight additions retain sourced ratings, label manual gearboxes and expose unverified gearing',()=>{
 assert.equal(ADDITIONAL_REAL_CARS.length,8);
 for(const base of ADDITIONAL_REAL_CARS){
  const c=buildCar(newCar(base.id));assert.equal(c.hp,base.hp);assert.ok(c.ratios.every((r,i)=>i===0||r<c.ratios[i-1]),base.id+' descending overall gearing');
  assert.equal(base.manufacturerReference.transmission.ratios,null);assert.equal(base.manufacturerReference.transmission.finalDrive,null);
  assert.match(realVehicleData(c,''),new RegExp(base.transmissionLabel));assert.ok(Number.isInteger(base.factoryTires));
  const et=estimate(c).et;assert.ok(et>9&&et<18,base.id+' completes a plausible modeled pass');
 }
 assert.match(factoryTemplate(ADDITIONAL_REAL_CARS.find(c=>c.id==='boss302')),/SAE gross/);
});

test('all additional purchases, upgrades, paint and opponent choices survive save validation',()=>{
 const save=freshSave();save.cars.push(...ADDITIONAL_REAL_CARS.map(c=>newCar(c.id)));
 for(const c of save.cars.slice(1)){c.color='#15bc74';c.upgrades.intake=2;c.tune.finalDrive=3.88;}
 save.selected=save.cars.at(-1).uid;save.free.opponent='grcorolla';save.completed=['F-0'];
 const out=validateSave(save);assert.equal(out.cars.length,9);assert.equal(out.selected,save.selected);assert.equal(out.free.opponent,'grcorolla');assert.deepEqual(out.completed,save.completed);
 out.cars.slice(1).forEach((c,i)=>{assert.equal(c.uid,save.cars[i+1].uid);assert.equal(c.color,'#15bc74');assert.equal(c.upgrades.intake,2);assert.equal(c.tune.finalDrive,3.88);});
});

test('every new drivetrain rolls and brakes in the drive lab with finite independent wheel angles',()=>{
 for(const base of ADDITIONAL_REAL_CARS){
  const lab=createDriveLab(buildCar(newCar(base.id)));setLabSpeed(lab,90);lab.inputs.throttle=1;
  for(let i=0;i<240;i++)stepDriveLab(lab,1/120);
  const peak=lab.vehicle.v;assert.ok(peak>25,base.id+' accelerates');
  assert.ok(Number.isFinite(lab.vehicle.wheelRotation.front));assert.ok(Number.isFinite(lab.vehicle.wheelRotation.rear));
  lab.inputs.throttle=0;lab.inputs.brake=1;for(let i=0;i<720;i++)stepDriveLab(lab,1/120);
  assert.ok(lab.vehicle.v<peak*.2,base.id+' brakes to low speed');assert.ok(Number.isFinite(lab.vehicle.rpm));
 }
});
