import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCar } from '../src/physics.js';
import { newCar } from '../src/storage.js';
import { createDriveLab, startDriving, stageDriveLab, launchDriveLab, shiftDriveLab, setLabSpeed, stepDriveLab, labTelemetry } from '../src/drive-lab-model.js';
import { telemetryCSV } from '../src/drive-lab-csv.js';
const labFor=(id='kaze',settings={})=>createDriveLab(buildCar(newCar(id)),settings);
const run=(lab,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)stepDriveLab(lab,1/120);return lab;};

test('continuous test drive passes a mile without finishing or creating race rewards',()=>{
  const lab=labFor('apex',{transmission:'auto'});lab.inputs.throttle=1;startDriving(lab);run(lab,40);
  assert.ok(lab.vehicle.x>1609.344);assert.equal(lab.vehicle.finished,false);assert.ok(lab.vehicle.splits.mile>0);assert.equal(lab.vehicle.finishTime,null);assert.equal(lab.cash,undefined);
});
test('idle and neutral revs create RPM without propulsion and boost decays on lift',()=>{
  const lab=labFor('vortex');lab.vehicle.gear=0;lab.inputs.throttle=1;run(lab,2);assert.ok(lab.vehicle.rpm>lab.vehicle.car.redline*.9);assert.equal(lab.vehicle.x,0);assert.ok(lab.vehicle.boost>.9);
  lab.inputs.throttle=0;run(lab,3);assert.ok(lab.vehicle.rpm<1000);assert.ok(lab.vehicle.boost<.01);
  startDriving(lab);lab.vehicle.gear=0;lab.inputs.throttle=1;run(lab,1);assert.equal(lab.vehicle.v,0);assert.ok(lab.vehicle.rpm>5000);
});
test('test-drive clutch release transmits power and manual shifts require disengagement',()=>{
  const lab=labFor('kaze',{transmission:'clutch'});startDriving(lab);lab.inputs.throttle=1;lab.inputs.clutch=1;run(lab,1);assert.equal(lab.vehicle.v,0);
  lab.inputs.clutch=0;run(lab,1);assert.ok(lab.vehicle.v>0);shiftDriveLab(lab,1);assert.equal(lab.vehicle.gear,1);assert.equal(lab.feedback,'CLUTCH REQUIRED');
  lab.inputs.clutch=1;shiftDriveLab(lab,1);assert.equal(lab.vehicle.gear,2);assert.ok(lab.vehicle.shiftTimer>0);
});
test('rolling brake test stops without negative speed; wet grip increases stopping distance',()=>{
  const dry=labFor('kaze',{transmission:'auto'}),wet=labFor('kaze',{transmission:'auto',wet:true});
  for(const lab of [dry,wet]){setLabSpeed(lab,80);lab.inputs.brake=1;run(lab,5);assert.equal(lab.vehicle.v,0);assert.ok(Number.isFinite(lab.vehicle.rpm));assert.ok(lab.vehicle.x>0);}
  assert.ok(wet.vehicle.x>dry.vehicle.x);assert.ok(dry.vehicle.x<40);
});
test('paused lab freezes timers temperature distance and wheel angles, and can single-step',()=>{
  const lab=labFor();startDriving(lab);lab.inputs.throttle=1;run(lab,1);lab.paused=true;const before=structuredClone(lab);run(lab,2);assert.deepEqual(lab,before);
  lab.paused=false;stepDriveLab(lab,1/120);lab.paused=true;assert.ok(lab.vehicle.x>before.vehicle.x);assert.ok(Math.abs(lab.vehicle.elapsed-before.vehicle.elapsed-1/120)<1e-10);
});
test('practice launch tree supports pre-staging and records false starts',()=>{
  const lab=labFor('kaze',{staging:'manual'});stageDriveLab(lab);assert.equal(lab.phase,'idle');assert.equal(lab.staged,true);
  stageDriveLab(lab);assert.equal(lab.phase,'countdown');launchDriveLab(lab);assert.equal(lab.phase,'redlight');assert.equal(lab.falseStart,true);assert.equal(lab.vehicle.started,false);
  startDriving(lab);setLabSpeed(lab,80);stageDriveLab(lab);assert.equal(lab.phase,'idle');assert.equal(lab.vehicle.v,0);
});
test('automatic and assisted practice launches start on green and record reaction separately',()=>{
  const auto=labFor('kaze',{launch:'auto',transmission:'auto'});auto.inputs.throttle=1;stageDriveLab(auto);run(auto,3);assert.equal(auto.phase,'running');assert.ok(auto.reaction>=.12 && auto.reaction<.14);assert.ok(auto.vehicle.v>0);
  const assisted=labFor('kaze',{launch:'assisted'});stageDriveLab(assisted);run(assisted,3);assert.equal(assisted.phase,'armed');assert.equal(assisted.vehicle.x,0);assisted.inputs.throttle=1;stepDriveLab(assisted,1/120);assert.equal(assisted.phase,'running');assert.ok(assisted.reaction>.3);
});
test('stationary burnout heats tires and rotates only the driven axle with fixed position',()=>{
  const lab=createDriveLab(buildCar(newCar('roadster')));lab.inputs.throttle=1;lab.burnout=true;run(lab,2);assert.equal(lab.vehicle.x,0);assert.equal(lab.vehicle.v,0);assert.ok(lab.vehicle.temperature>40);assert.ok(lab.vehicle.wheelRotation.rear>0);assert.equal(lab.vehicle.wheelRotation.front,0);
});
test('telemetry reports actual inputs and finite power boost and engine values',()=>{
  const lab=labFor('vortex');lab.inputs={throttle:.5,brake:.2,clutch:.3,blip:false};setLabSpeed(lab,80);run(lab,.5);const t=labTelemetry(lab);
  assert.equal(t.throttle,50);assert.equal(t.brake,20);assert.equal(t.clutch,30);for(const [key,value] of Object.entries(t))assert.ok(value===null||Number.isFinite(value),key);
});
test('CSV includes explicit units, valid numeric values and blank unknown reaction values',()=>{
  const lab=labFor();startDriving(lab);lab.inputs.throttle=1;run(lab,1);const csv=telemetryCSV([{time:1,...labTelemetry(lab)}]);
  const [header,row]=csv.split('\n');assert.ok(header.includes('speed_kmh'));assert.ok(header.includes('torque_nm'));assert.equal(header.split(',').length,18);assert.equal(row.split(',').length,18);assert.equal(row.split(',').at(-1),'');assert.ok(!/NaN|Infinity|undefined/.test(csv));assert.equal(telemetryCSV([]).split('\n').length,2);
});
