import { CARS, LEGACY_CARS, CLASSES } from './data.js';
import { advanceWheelRotation } from './sprite-geometry.js';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function interpolate(points,x){
  if(x<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){const [b,y]=points[i];const [a,z]=points[i-1];if(x<=b)return z+(y-z)*(x-a)/(b-a);}
  return points.at(-1)[1];
}
export function torqueAt(c,rpm){
  const fraction=interpolate(c.curve,rpm/c.redline);
  const extra=c.turboStage||0;
  const boost=extra?1+extra*0.28*clamp((rpm/c.redline-0.2-extra*0.018)/0.35,0,1):1;
  const factoryBoost=c.factoryAspiration==='Turbo'?.75+.25*(c.boost/100):1;
  return c.torque*fraction*boost*c.torqueScale*factoryBoost;
}
export function buildCar(owned){
  const base=CARS.find(c=>c.id===owned.model)||LEGACY_CARS.find(c=>c.id===owned.model)||CARS[0],u={tires:base.factoryTires,...owned.upgrades},t=owned.tune||{};
  const c={...base,factoryAspiration:base.aspiration,torqueScale:1+(u.intake||0)*0.08+(u.ecu||0)*0.07+(u.internals||0)*0.1,
    redline:base.redline+(u.ecu||0)*150+(u.internals||0)*200,
    mass:base.mass*(1-(u.weight||0)*0.06),turboStage:u.turbo||0,
    aspiration:(u.turbo||0)>0?'Turbo':base.aspiration,
    shiftTime:base.shiftTime*Math.pow(0.77,u.gearbox||0),
    cd:base.cd*(1-(u.aero||0)*0.08),grip:1+(u.tires||0)*0.16+(u.suspension||0)*0.06+(u.clutch||0)*0.03,
    torqueCapacity:base.torque*1.6*(1+(u.clutch||0)*0.35),
    finalDrive:t.finalDrive||base.finalDrive,ratios:t.ratios?.length===base.ratios.length?t.ratios:[...base.ratios],
    launchRPM:t.launchRPM||Math.round(base.redline*0.48/100)*100,
    shiftRPM:t.shiftRPM||0,pressure:t.pressure||30,diff:t.diff??70,boost:t.boost??100,
    condition:owned.condition??100,tires:u.tires||0,color:owned.color||base.color,visual:owned.visual||{},uid:owned.uid};
  c.turboStage*=c.boost/100;
  // Normalize the estimated curve to factory horsepower; retain sourced facts separately.
  let peak=0;for(let r=1000;r<=base.redline;r+=50)peak=Math.max(peak,interpolate(base.curve,r/base.redline)*base.torque*r/7127);
  c.torqueScale*=base.hp/peak;
  c.hp=0;c.peakTorque=0;
  for(let r=1000;r<=c.redline;r+=50){const tq=torqueAt(c,r);c.hp=Math.max(c.hp,tq*r/7127);c.peakTorque=Math.max(c.peakTorque,tq);}
  c.hp=Math.round(c.hp);c.peakTorque=Math.round(c.peakTorque);
  return c;
}
export function idealShift(c,gear=1){
  if(c.transmissionType==='cvt')return clamp(c.shiftRPM||c.cvt.targetRPM,900,c.redline-100);
  if(gear>=c.ratios.length)return c.redline-100;
  const ratio=c.ratios[gear]/c.ratios[gear-1];
  for(let r=c.redline*0.62;r<c.redline-100;r+=25){if(torqueAt(c,r)*c.ratios[gear-1]<torqueAt(c,r*ratio)*c.ratios[gear])return Math.round(r/25)*25;}
  return c.redline-100;
}
export function createVehicle(c){return {car:c,x:0,v:0,rpm:c.launchRPM,gear:1,cvtRatio:c.cvt?.maxRatio,elapsed:0,shiftTimer:0,slip:0,boost:0,temperature:25,tireWear:0,acceleration:0,splits:{},finished:false,finishTime:null,trap:0,zero60:null,stress:0,feedback:'',reaction:0,started:false};}
export function shiftVehicle(s,direction=1,{revMatch=true,clutch=true,blip=false}={}){
  const c=s.car,target=s.gear+direction;
  if(c.transmissionType==='cvt')return null;
  if(s.shiftTimer>0||target<1||target>c.ratios.length||s.finished)return null;
  if(!clutch){s.feedback='CLUTCH REQUIRED';s.stress+=0.12;return s.feedback;}
  const ideal=idealShift(c,s.gear),diff=s.rpm-ideal;
  const needed=s.rpm*c.ratios[target-1]/c.ratios[s.gear-1];
  let feedback=direction>0?(Math.abs(diff)<220?'PERFECT SHIFT':diff<0?'EARLY SHIFT':'LATE SHIFT'):(needed>c.redline?'MONEY SHIFT':revMatch||blip?'REV MATCHED':'ROUGH DOWNSHIFT');
  s.shiftTimer=c.shiftTime*(feedback==='PERFECT SHIFT'?0.93:feedback==='ROUGH DOWNSHIFT'?1.55:1);
  if(feedback==='MONEY SHIFT')s.stress+=1.7;
  if(feedback==='ROUGH DOWNSHIFT')s.stress+=0.2;
  s.gear=target;s.rpm=clamp(needed,850,c.redline+300);s.feedback=feedback;return feedback;
}
export function stepVehicle(s,dt,{throttle=1,clutch=1,traction=0.5,surface=1,wet=false,distance=402.336,burnout=false,launchHold=true}={}){
  if(s.finished||!s.started)return;
  const c=s.car,oldX=s.x,oldElapsed=s.elapsed,oldV=s.v;
  s.elapsed+=dt;s.shiftTimer=Math.max(0,s.shiftTimer-dt);
  const axleRPM=s.v/(2*Math.PI*c.radius)*60*c.finalDrive;
  if(c.transmissionType==='cvt'){
    const target=900+throttle*(idealShift(c)-900);
    const desired=clamp(target/Math.max(axleRPM,1),c.cvt.minRatio,c.cvt.maxRatio);
    s.cvtRatio+=(desired-s.cvtRatio)*Math.min(1,dt*c.cvt.response);
  }
  const ratio=c.transmissionType==='cvt'?s.cvtRatio:c.ratios[s.gear-1];
  const wheelRPM=axleRPM*ratio;
  const launchFloor=launchHold?c.launchRPM*clamp(1-s.v/15,0,1):0;
  const coupled=clutch>0.05?Math.max(900,wheelRPM,launchFloor):900+throttle*(c.redline-900);
  s.rpm+=(coupled-s.rpm)*Math.min(1,dt*13);
  if(s.slip>0.12)s.rpm+=s.slip*dt*1000;
  s.rpm=clamp(s.rpm,850,c.redline+100);
  const turbo=c.aspiration==='Turbo';
  const targetBoost=turbo?clamp((s.rpm/c.redline-0.25)/0.4,0,1)*throttle:0;
  s.boost+=(targetBoost-s.boost)*Math.min(1,dt/(0.18+c.turboStage*0.15));
  const lag=turbo?0.6+s.boost*0.4:1;
  const tq=torqueAt(c,s.rpm)*throttle*lag*(0.85+0.15*c.condition/100);
  const capacity=Math.min(1,c.torqueCapacity/Math.max(tq,1));
  const limiter=s.rpm>=c.redline?0.25:1;
  const wheelForce=s.shiftTimer>0?0:tq*ratio*c.finalDrive*c.efficiency/c.radius*clutch*capacity*limiter;
  const transfer=clamp(s.acceleration/9.81*0.20,-0.1,0.20);
  const driven=c.drive==='AWD'?0.94:c.drive==='RWD'?0.52+transfer:0.62-transfer;
  const pressure=1-Math.abs(c.pressure-(c.tires>=3?22:30))*0.008;
  const temperature=c.tires>=2?(burnout?1.08:0.95+clamp((s.temperature-25)/50,0,0.13)):1;
  const gripForce=c.mass*9.81*driven*c.grip*surface*(wet?0.75:1)*pressure*temperature*(0.97+c.diff/100*0.04);
  const excess=Math.max(0,wheelForce-gripForce)/Math.max(gripForce,1);
  s.slip=clamp(excess*(1-traction*0.90),0,1.5);
  const usable=Math.min(wheelForce,gripForce)*(1-Math.min(0.36,s.slip*0.3));
  const drag=0.5*1.225*c.cd*c.area*s.v*s.v,rolling=c.mass*9.81*0.012;
  s.acceleration=(usable-drag-rolling)/c.mass;
  s.v=Math.max(0,s.v+s.acceleration*dt);s.x+=(s.v+oldV)*0.5*dt;
  s.temperature+=dt*(s.slip*15+throttle*0.6-(s.temperature-25)*0.015);
  s.tireWear+=dt*(0.001+s.slip*0.012)*(1+c.tires*0.2);
  s.stress+=dt*(Math.max(0,tq/c.torqueCapacity-1)*0.35+(limiter<1?0.04:0));
  if(!s.zero60&&s.v>=26.8224)s.zero60=oldElapsed+dt*clamp((26.8224-oldV)/(s.v-oldV),0,1);
  for(const [name,mark] of [['60ft',18.288],['eighth',201.168],['quarter',402.336],['half',804.672],['mile',1609.344]]){
    if(!s.splits[name]&&oldX<mark&&s.x>=mark)s.splits[name]=oldElapsed+dt*(mark-oldX)/(s.x-oldX);
  }
  if(s.x>=distance){s.finished=true;s.finishTime=oldElapsed+dt*(distance-oldX)/(s.x-oldX);s.trap=s.v*3.6;s.x=distance;}
  s.wheelRotation=advanceWheelRotation(s.wheelRotation,c,s.x-oldX,s.slip);
}
const estimates=new Map();
export function estimate(c,distance=402.336){
  const key=JSON.stringify([c.id,c.hp,c.mass,c.grip,c.redline,c.shiftTime,c.finalDrive,c.ratios,c.cvt,c.launchRPM,c.pressure,c.diff,c.boost,c.condition,distance]);
  if(estimates.has(key))return estimates.get(key);
  const s=createVehicle(c);s.started=true;
  for(let i=0;i<7200&&!s.finished;i++){
    if(s.rpm>=(c.shiftRPM||idealShift(c,s.gear)))shiftVehicle(s);
    stepVehicle(s,1/120,{distance,traction:0.7});
  }
  const result={et:s.finishTime||60,trap:s.trap,zero60:s.zero60||0,splits:s.splits};
  if(estimates.size>300)estimates.clear();estimates.set(key,result);return result;
}
export function rating(c){
  const e=estimate(c),pp=clamp(Math.round(1100-e.et*53),100,999);
  const index=[305,340,400,475,520,600].findIndex(v=>pp<v);
  return {pp,tier:CLASSES[index<0?6:index],index:index<0?6:index,...e};
}
export function componentRatings(c){
  const grade=(score,cuts)=>{const i=cuts.findIndex(v=>score<v);return CLASSES[i<0?6:i];};
  const e=estimate(c);
  return [
    {name:'Power',tier:grade(c.hp,[150,210,300,450,600,800]),value:`${c.hp} HP`},
    {name:'Acceleration',tier:grade(-e.zero60,[-7,-6,-5,-4,-3,-2.5]),value:`${e.zero60.toFixed(2)} sec / 0–60 mph`},
    {name:'Launch',tier:grade(-e.splits['60ft'],[-2.7,-2.5,-2.3,-2.1,-1.9,-1.7]),value:`${e.splits['60ft'].toFixed(2)} sec / 60 ft`},
    {name:'Grip',tier:grade(c.grip,[1.12,1.28,1.42,1.60,1.75,1.90]),value:`${c.grip.toFixed(2)} coefficient`},
    {name:'Weight',tier:grade(-c.mass,[-1850,-1600,-1400,-1250,-1100,-950]),value:`${Math.round(c.mass)} kg`},
    {name:'Transmission',tier:c.transmissionType==='cvt'?'—':grade(-c.shiftTime,[-.32,-.26,-.21,-.16,-.10,-.07]),value:c.transmissionType==='cvt'?'Continuous ratio':`${Math.round(c.shiftTime*1000)} ms`},
    {name:'Aero',tier:grade(-c.cd,[-.40,-.36,-.33,-.30,-.27,-.24]),value:`${c.cd.toFixed(3)} Cd`},
    {name:'Reliability',tier:grade(c.condition,[40,50,60,70,85,95]),value:`${Math.round(c.condition)}% condition`}
  ];
}
