import { createVehicle, stepVehicle, shiftVehicle, idealShift, torqueAt, clamp } from './physics.js';
import { advanceWheelRotation } from './sprite-geometry.js';

export function createDriveLab(car,settings={}){
  const vehicle=createVehicle(car);vehicle.rpm=900;
  return {vehicle,settings:{transmission:'manual',launch:'manual',staging:'auto',traction:.4,revMatch:true,surface:1,wet:false,...settings},phase:'idle',clock:0,runClock:0,paused:false,burnout:false,staged:false,falseStart:false,reaction:null,maxSpeed:0,feedback:'READY · START DRIVING OR PRACTICE A LAUNCH',inputs:{throttle:0,clutch:0,brake:0,blip:false}};
}
export function startDriving(lab){lab.phase='running';lab.vehicle.started=true;lab.vehicle.gear=Math.max(1,lab.vehicle.gear);lab.burnout=false;lab.falseStart=false;lab.feedback='CONTINUOUS DRIVE · NO FINISH LINE';}
export function stageDriveLab(lab){
  if(lab.phase==='running'||lab.phase==='redlight'){
    lab.vehicle=createVehicle(lab.vehicle.car);lab.phase='idle';lab.staged=false;lab.falseStart=false;lab.burnout=false;
  }
  if(lab.settings.staging==='manual'&&!lab.staged){lab.staged=true;lab.feedback='PRE-STAGED · STAGE AGAIN';return;}
  lab.staged=true;lab.phase='countdown';lab.clock=0;lab.runClock=0;lab.burnout=false;lab.falseStart=false;lab.reaction=null;
  lab.vehicle=createVehicle(lab.vehicle.car);lab.vehicle.gear=lab.settings.launch==='manual'?0:1;lab.feedback='WATCH THE LIGHTS';
}
export function launchDriveLab(lab){
  if(lab.paused)return;
  if(lab.phase==='running'&&lab.vehicle.gear===0&&lab.vehicle.car.transmissionType==='cvt'){lab.vehicle.gear=1;lab.feedback='DRIVE';return;}
  if(lab.phase==='countdown'){lab.phase='redlight';lab.falseStart=true;lab.feedback='RED LIGHT · RESET OR START DRIVING';return;}
  if(lab.phase==='armed'){lab.phase='running';lab.vehicle.started=true;lab.vehicle.gear=1;lab.reaction=lab.runClock;lab.vehicle.reaction=lab.reaction;lab.feedback=lab.reaction<.2?'CLEAN LAUNCH':'LAUNCHED';}
  else if(lab.phase==='idle')startDriving(lab);
}
export function shiftDriveLab(lab,direction){
  const s=lab.vehicle;if(lab.paused||lab.settings.transmission==='auto')return;
  if(s.car.transmissionType==='cvt'){if(s.gear===0&&direction>0){s.gear=1;lab.feedback='DRIVE';}return;}
  if(s.gear===0&&direction>0){if(lab.settings.transmission==='clutch'&&lab.inputs.clutch<.8){lab.feedback='CLUTCH REQUIRED';return;}s.gear=1;lab.feedback='FIRST GEAR';return;}
  const result=shiftVehicle(s,direction,{clutch:lab.settings.transmission!=='clutch'||lab.inputs.clutch>=.8,revMatch:lab.settings.revMatch,blip:lab.inputs.blip});
  if(result)lab.feedback=result;
}
export function setLabSpeed(lab,kmh){
  const s=lab.vehicle,c=s.car;s.v=clamp(kmh,0,400)/3.6;
  if(c.transmissionType==='cvt'){
    const axleRPM=s.v/(2*Math.PI*c.radius)*60*c.finalDrive;
    s.cvtRatio=clamp(idealShift(c)/Math.max(axleRPM,1),c.cvt.minRatio,c.cvt.maxRatio);
    s.gear=1;s.rpm=clamp(axleRPM*s.cvtRatio,900,c.redline);s.shiftTimer=0;
    startDriving(lab);lab.feedback=`ROLLING TEST · ${Math.round(kmh)} KM/H`;lab.maxSpeed=Math.max(lab.maxSpeed,s.v*3.6);return;
  }
  s.gear=Math.max(1,c.ratios.findIndex(r=>s.v/(2*Math.PI*c.radius)*60*r*c.finalDrive<c.redline*.8)+1);
  s.rpm=clamp(s.v/(2*Math.PI*c.radius)*60*c.ratios[s.gear-1]*c.finalDrive,900,c.redline);
  s.shiftTimer=0;startDriving(lab);lab.feedback=`ROLLING TEST · ${Math.round(kmh)} KM/H`;
  lab.maxSpeed=Math.max(lab.maxSpeed,s.v*3.6);
}
export function labTelemetry(lab){
  const s=lab.vehicle,c=s.car,throttle=Math.max(lab.inputs.throttle,lab.inputs.blip?.7:0);
  const torque=torqueAt(c,s.rpm)*throttle*(c.aspiration==='Turbo'?.6+s.boost*.4:1);
  return {speed:s.v*3.6,rpm:s.rpm,gear:s.gear,elapsed:s.elapsed,distance:s.x,slip:s.slip*100,boost:s.boost*(.6+c.turboStage*.4),temperature:s.temperature,wear:s.tireWear,stress:s.stress,acceleration:s.acceleration/9.81,throttle:throttle*100,clutch:lab.inputs.clutch*100,brake:lab.inputs.brake*100,torque,power:torque*s.rpm/7127,maxSpeed:lab.maxSpeed,reaction:lab.reaction};
}
export function stepDriveLab(lab,dt){
  if(lab.paused)return;
  const s=lab.vehicle,c=s.car,input=lab.inputs;
  lab.clock+=dt;
  if(lab.phase==='countdown'&&lab.clock>=2.65){lab.phase='armed';lab.runClock=0;lab.feedback='GREEN · LAUNCH';}
  if(lab.phase==='armed'){
    lab.runClock+=dt;
    if(lab.settings.launch==='auto'&&lab.runClock>=.12)launchDriveLab(lab);
    else if(lab.settings.launch==='assisted'&&input.throttle>0)launchDriveLab(lab);
  }
  if(lab.phase!=='running'){
    const throttle=Math.max(input.throttle,input.blip?.7:0),staging=lab.phase==='countdown'||lab.phase==='armed',target=900+throttle*((staging?c.launchRPM:c.redline)-900);
    s.rpm+=(target-s.rpm)*Math.min(1,dt*10);
    s.boost+=((c.aspiration==='Turbo'?throttle:0)-s.boost)*Math.min(1,dt*2);
    s.boost=clamp(s.boost,0,1);
    if(lab.burnout){
      const angle=s.rpm/60/((c.cvt?.maxRatio||c.ratios[0])*c.finalDrive)*Math.PI*2*dt;
      const old=s.wheelRotation || {front:0,rear:0};s.wheelRotation={...old};
      for(const axle of ['front','rear'])if(c.drive==='AWD'||(c.drive==='FWD'?axle==='front':axle==='rear'))s.wheelRotation[axle]=(old[axle]+angle)%(Math.PI*2);
      s.temperature=clamp(s.temperature+dt*throttle*12,25,110);s.tireWear+=dt*throttle*.025;s.slip=throttle*.8;
    }else{s.slip=0;s.temperature+=(25-s.temperature)*dt*.015;}
    return;
  }
  lab.runClock+=dt;
  if(lab.settings.transmission==='auto'&&s.gear>0){
    let feedback;
    if(s.rpm>=(c.shiftRPM||idealShift(c,s.gear)))feedback=shiftVehicle(s);
    else if(s.gear>1&&s.rpm<1600&&s.shiftTimer<=0)feedback=shiftVehicle(s,-1);
    if(feedback)lab.feedback=feedback;
  }
  const throttle=Math.max(input.throttle,input.blip?.7:0),neutral=s.gear===0,oldX=s.x,oldV=s.v,oldElapsed=s.elapsed,oldRotation=s.wheelRotation,oldSplits={...s.splits},oldZero60=s.zero60;
  if(neutral)s.gear=1;
  stepVehicle(s,dt,{throttle,clutch:neutral?0:1-input.clutch,traction:lab.settings.traction,surface:lab.settings.surface,wet:lab.settings.wet,distance:Infinity,launchHold:throttle>0});
  if(neutral)s.gear=0;
  // The bench brake is a generic grip-limited 0.9 g stop, not a researched brake specification.
  if(input.brake>0){
    const brakeAcceleration=input.brake*9.81*.9*lab.settings.surface*(lab.settings.wet?.65:1);
    s.v=Math.max(0,s.v-brakeAcceleration*dt);s.x=oldX+(oldV+s.v)*.5*dt;s.acceleration=(s.v-oldV)/dt;
    s.wheelRotation=advanceWheelRotation(oldRotation,c,s.x-oldX,s.slip);
    for(const [name,mark] of [['60ft',18.288],['eighth',201.168],['quarter',402.336],['half',804.672],['mile',1609.344]]){
      if(!oldSplits[name]){delete s.splits[name];if(oldX<mark&&s.x>=mark)s.splits[name]=oldElapsed+dt*(mark-oldX)/(s.x-oldX);}
    }
    if(!oldZero60)s.zero60=oldV<26.8224&&s.v>=26.8224?oldElapsed+dt*(26.8224-oldV)/(s.v-oldV):null;
  }
  lab.maxSpeed=Math.max(lab.maxSpeed,s.v*3.6);
}
