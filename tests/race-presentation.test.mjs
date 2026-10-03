import test from 'node:test';
import assert from 'node:assert/strict';
import { raceFrame, visibleDistance } from '../src/race-presentation.js';
import { buildCar, createVehicle } from '../src/physics.js';
import { newCar } from '../src/storage.js';
const fixture=()=>{
  const player=createVehicle(buildCar(newCar('kaze'))),opponent=createVehicle(buildCar(newCar('kaze')));
  Object.assign(player,{x:100,v:40,started:true,elapsed:5,acceleration:3});
  Object.assign(opponent,{x:95,v:39,started:true,elapsed:5});
  return {player,opponent,clock:8,runClock:5,hideOpponent:false};
};
test('road speed is scaled to the visible car length on desktop and phone',()=>{
  for(const [w,h] of [[1440,430],[390,330],[360,190]]){
    const race=fixture(),f=raceFrame(race,w,h),length=race.player.car.wheelbase+1.5;
    assert.ok(Math.abs(length*f.metresToPixels-f.carWidth*.84)<.001);
    assert.ok(f.pixelsPerSecond>40*4*5,'near scenery moves much faster than the old four-pixel/metre view');
    assert.ok(f.carWidth<h&&f.nose-f.carWidth*.91>=0,'both lanes fit and the player stays in frame');
  }
});
test('chase camera scrolls the world left, preserves relative lane gaps and freezes with the race',()=>{
  const race=fixture(),before=structuredClone(race),a=raceFrame(race,1200,400);
  race.player.x+=2;race.opponent.x+=2;
  const b=raceFrame(race,1200,400);
  assert.equal(b.nose,a.nose);assert.ok(Math.abs(b.camera-a.camera-2*a.metresToPixels)<.001);
  assert.equal(b.opponentDistance-b.travel,a.opponentDistance-a.travel);
  race.paused=true;assert.deepEqual(raceFrame(race,1200,400),b);
  assert.equal(before.player.finishTime,null);assert.equal(race.player.finishTime,null);
});
test('visual finish coast continues through the beam without changing ET or scoring distance',()=>{
  const race=fixture();Object.assign(race.player,{x:402.336,finished:true,finishTime:15,reaction:.12});race.runClock=16.12;
  const before=structuredClone(race.player);
  assert.ok(Math.abs(visibleDistance(race.player,race.runClock)-442.336)<.001);
  assert.ok(raceFrame(race,1200,400).travel>race.player.x);assert.deepEqual(race.player,before);
  assert.equal(visibleDistance(race.player,undefined),402.336,'continuous lab has no race coast clock');
});
test('reduced motion removes camera kicks, pitch and streaks while retaining visible driving',()=>{
  const race=fixture();race.player.elapsed=.12;race.player.shiftTimer=.15;
  const animated=raceFrame(race,1200,400);race.reducedMotion=true;
  const calm=raceFrame(race,1200,400);
  assert.ok(animated.trail>0&&animated.pitch!==0);assert.equal(calm.shakeX,0);assert.equal(calm.shakeY,0);assert.equal(calm.pitch,0);assert.equal(calm.trail,0);
  assert.equal(calm.camera,animated.camera);assert.equal(calm.metresToPixels,animated.metresToPixels);
});
