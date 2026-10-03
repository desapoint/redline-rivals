import test from 'node:test';
import assert from 'node:assert/strict';
import { CARS, LEGACY_CARS, EVENTS, CLASSES, TRACKS } from '../src/data.js';
import { buildCar, createVehicle, stepVehicle, shiftVehicle, estimate, rating, idealShift } from '../src/physics.js';
import { freshSave, validateSave, accrueIncome, claimIncome, loadSave, newCar, isBusy, SAVE_KEY } from '../src/storage.js';
import { eventLocked, restrictionReason } from '../src/views.js';

function run(c,options={}){const v=createVehicle(c);v.started=true;for(let i=0;i<7200&&!v.finished;i++){if(v.rpm>=idealShift(c,v.gear))shiftVehicle(v);stepVehicle(v,1/120,options);}return v;}
test('all factory cars finish with plausible speeds, positive splits and rated horsepower',()=>{
  for(const base of CARS){const c=buildCar(newCar(base.id)),r=estimate(c);assert.equal(c.hp,base.hp);assert.ok(r.et>7&&r.et<19,base.id);assert.ok(r.trap>120&&r.trap<330);assert.ok(r.splits['60ft']<r.splits.eighth&&r.splits.eighth<r.et);}
});
test('performance ratings still span F through S across retained simulation fixtures',()=>assert.deepEqual(new Set([...CARS,...LEGACY_CARS].map(c=>rating(buildCar({...newCar(c.id),upgrades:{tires:c.factoryTires}})).tier)),new Set(CLASSES)));
test('power upgrade produces a faster pass without claiming instantaneous gear changes',()=>{
  const stock=buildCar(newCar('kaze')),modified=buildCar({...newCar('kaze'),upgrades:{intake:2,ecu:1,tires:1}});
  assert.ok(modified.hp>stock.hp);assert.ok(estimate(modified).et<estimate(stock).et-.4);
  const s=createVehicle(stock);s.started=true;s.rpm=idealShift(stock);const gear=s.gear;shiftVehicle(s);assert.equal(s.gear,gear+1);assert.ok(s.shiftTimer>.1);
});
test('wet surface loses launch grip; tire upgrades recover performance',()=>{
  const c=buildCar(newCar('muscle'));const dry=run(c),wet=run(c,{wet:true}),slick=run(buildCar({...newCar('muscle'),upgrades:{tires:4}}),{wet:true});
  assert.ok(wet.finishTime>dry.finishTime);assert.ok(slick.finishTime<wet.finishTime);
});
test('FWD, RWD and AWD obey traction differences through the same model',()=>{
  const base=buildCar(newCar('muscle'));const fwd=run({...base,drive:'FWD'}),rwd=run({...base,drive:'RWD'}),awd=run({...base,drive:'AWD'});
  assert.ok(awd.splits['60ft']<rwd.splits['60ft']);assert.ok(rwd.splits['60ft']<fwd.splits['60ft']);
});
test('a disengaged clutch transmits no acceleration, and releasing it restores movement',()=>{
  const s=createVehicle(buildCar(newCar('kaze')));s.started=true;for(let i=0;i<120;i++)stepVehicle(s,1/120,{clutch:0});assert.equal(s.x,0);for(let i=0;i<120;i++)stepVehicle(s,1/120,{clutch:1});assert.ok(s.x>1);
});
test('manual clutch shifts require the pedal and money shifts create stress',()=>{
  const c=buildCar(newCar('kaze')),s=createVehicle(c);s.started=true;s.gear=2;s.rpm=c.redline-200;
  assert.equal(shiftVehicle(s,1,{clutch:false}),'CLUTCH REQUIRED');assert.equal(s.gear,2);
  assert.equal(shiftVehicle(s,-1),'MONEY SHIFT');assert.ok(s.stress>1);
});
test('bad downshifts take longer than rev-matched ones',()=>{
  const c=buildCar(newCar('kaze')),a=createVehicle(c),b=createVehicle(c);for(const s of [a,b]){s.gear=3;s.rpm=3500;}
  assert.equal(shiftVehicle(a,-1,{revMatch:false}),'ROUGH DOWNSHIFT');assert.equal(shiftVehicle(b,-1,{revMatch:true}),'REV MATCHED');assert.ok(a.shiftTimer>b.shiftTimer);
});
test('all five distances finish at their exact line, with ET excluding reaction',()=>{
  for(const distance of [18.288,201.168,402.336,804.672,1609.344]){const s=run(buildCar(newCar('kaze')),{distance});assert.equal(s.x,distance);assert.ok(s.finished);assert.ok(s.finishTime>0&&s.finishTime<60);}
});
test('mechanical condition and boost settings affect actual performance',()=>{
  const o=newCar('vortex'),normal=buildCar(o),low=buildCar({...o,tune:{boost:50}}),worn=buildCar({...o,condition:25});
  assert.ok(low.hp<normal.hp);assert.ok(estimate(worn).et>estimate(normal).et);
});
test('engine estimates are deterministic and use torque crossover rather than a random rating',()=>{
  const c=buildCar(newCar('kaze'));assert.deepEqual(estimate(c),estimate(c));assert.ok(idealShift(c,4)<c.redline);assert.ok(rating(c).pp>100);
});
test('offline earnings cap at eight hours and claiming cannot duplicate money',()=>{
  const s=freshSave(1000);assert.equal(accrueIncome(s,1000+20*3600000),800);assert.equal(claimIncome(s,1000+20*3600000),800);assert.equal(s.cash,5300);assert.equal(claimIncome(s,1000+20*3600000),0);
});
test('repeated accrual cannot bypass the bank cap and level six stores 24 hours',()=>{
  const s=freshSave(0);s.business.level=6;assert.equal(accrueIncome(s,36*3600000),28800);assert.equal(accrueIncome(s,48*3600000),28800);
});
test('clock rollback never creates negative income or duplicates elapsed income',()=>{
  const s=freshSave(1000);accrueIncome(s,3601000);const bank=s.business.bank;accrueIncome(s,1000);assert.equal(s.business.bank,bank);accrueIncome(s,3601000);assert.equal(s.business.bank,bank);
});
test('corrupt browser storage recovers to a playable garage',()=>{
  const storage={getItem:()=>'{not json'};assert.equal(loadSave(storage).cash,4500);assert.equal(loadSave(storage).cars[0].model,'kaze');assert.throws(()=>validateSave({version:99,cars:[]}));
});
test('save round-trip preserves purchases, ratios, paint and preset',()=>{
  const s=freshSave(1000),o=s.cars[0];o.color='#4676e5';o.upgrades.gearbox=1;o.tune={finalDrive:3.55,ratios:[3.4,2.2,1.5,1.2,1,.8]};o.preset={...o.tune};s.cash=9000;
  const restored=validateSave(JSON.parse(JSON.stringify(s)),2000);assert.equal(restored.cash,9000);assert.equal(restored.cars[0].color,o.color);assert.deepEqual(restored.cars[0].tune.ratios,o.tune.ratios);assert.deepEqual(restored.cars[0].preset.ratios,o.tune.ratios);assert.equal(restored.cars[0].preset.finalDrive,3.55);
});
test('import validation rejects unsafe strings and normalizes malformed numbers',()=>{
  const s=freshSave(1000);s.cash=-10;s.cars[0].color='\" onload=\"alert(1)';s.cars[0].upgrades={intake:999};s.settings.difficulty='Injected';const out=validateSave(s,2000);assert.equal(out.cash,0);assert.equal(out.cars[0].color,CARS[0].color);assert.equal(out.cars[0].upgrades.intake,3);assert.equal(out.settings.difficulty,'Easy');
});
test('a car assigned to a job remains unavailable until claimed, even after the end timestamp',()=>{
  const s=freshSave(1000);s.business.jobs.push({jobId:'show',carUid:s.selected,endsAt:1100});assert.ok(isBusy(s,s.selected));const restored=validateSave(s,2000);assert.ok(isBusy(restored,restored.selected));
});
test('career gates rivals behind the qualifier and open race, and classes behind rival wins',()=>{
  const s=freshSave(1000);assert.equal(eventLocked(s,EVENTS[0]),null);assert.ok(eventLocked(s,EVENTS[3]));assert.ok(eventLocked(s,EVENTS[4]));s.completed=['F-0','F-1'];assert.equal(eventLocked(s,EVENTS[3]),null);s.completed.push('F-3');assert.equal(eventLocked(s,EVENTS[4]),null);
});
test('restricted career events enforce drivetrain, mass and aspiration',()=>{
  const fwd=buildCar(newCar('vortex')),awd=buildCar(newCar('kaze'));assert.ok(restrictionReason(fwd,EVENTS[2]));assert.equal(restrictionReason(awd,EVENTS[2]),null);assert.ok(restrictionReason(buildCar(newCar('muscle')),EVENTS[6]));
});
