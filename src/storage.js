import { CARS, PARTS, BUSINESS_RATES, BUSINESS_CAPS, JOBS, EVENTS, DIFFICULTIES } from './data.js';
import { clamp } from './physics.js';
export const SAVE_KEY='redline-drag-club-v1';
export const newCar=(model)=>({uid:`${model}-${Math.random().toString(36).slice(2,9)}`,model,color:CARS.find(c=>c.id===model)?.color||'#e6603b',upgrades:{tires:CARS.find(c=>c.id===model)?.factoryTires||0},tune:{},visual:{wheels:'silver',finish:'metallic',stripe:false,spoiler:false,tint:0.45,rideHeight:0},condition:100});
export function freshSave(now=Date.now()){
  const starter=newCar('kaze');return {version:1,cash:4500,xp:0,rep:0,cars:[starter],selected:starter.uid,completed:[],records:{},history:[],business:{level:1,bank:0,lastAccrued:now,jobs:[]},settings:{difficulty:'Easy',transmission:'auto',launch:'auto',traction:0.7,revMatch:true,shiftHints:true,staging:'auto',damage:'off',sound:false,volume:0.18},free:{distance:402.336,track:'dock',weather:'Dry',time:'Night',opponent:'matched'},savedAt:now};
}
export function validateSave(raw,now=Date.now()){
  if(!raw||raw.version!==1||!Array.isArray(raw.cars)||!raw.cars.length)throw Error('This is not a REDLINE v1 save.');
  const defaults=freshSave(now),num=(v,f,min,max)=>Number.isFinite(v)?clamp(v,min,max):f;
  const seen=new Set();
  const cars=raw.cars.slice(0,50).filter(c=>CARS.some(b=>b.id===c.model)).map(c=>{
    const base=newCar(c.model),model=CARS.find(b=>b.id===c.model),uid=typeof c.uid==='string'&&/^[\w-]{1,70}$/.test(c.uid)&&!seen.has(c.uid)?c.uid:base.uid;seen.add(uid);
    const upgrades=Object.fromEntries(PARTS.map(p=>[p.id,Math.floor(num(c.upgrades?.[p.id],0,0,p.max))]));
    const tune={finalDrive:num(c.tune?.finalDrive,model.finalDrive,2,5.5),launchRPM:num(c.tune?.launchRPM,Math.round(model.redline*.48/100)*100,1500,model.redline-200),shiftRPM:num(c.tune?.shiftRPM,0,0,model.redline+1000),pressure:num(c.tune?.pressure,30,16,40),diff:num(c.tune?.diff,70,0,100),boost:num(c.tune?.boost,100,50,120)};
    if(Array.isArray(c.tune?.ratios)&&c.tune.ratios.length===model.ratios.length)tune.ratios=c.tune.ratios.map((v,i)=>num(v,model.ratios[i],0.4,5.5));
    const preset=c.preset&&typeof c.preset==='object'?{...tune,...Object.fromEntries(Object.entries(c.preset).filter(([k,v])=>['finalDrive','launchRPM','shiftRPM','pressure','diff','boost'].includes(k)&&Number.isFinite(v)).map(([k,v])=>[k,num(v,tune[k],k==='finalDrive'?2:k==='pressure'?16:k==='launchRPM'?1500:0,k==='finalDrive'?5.5:k==='pressure'?40:k==='launchRPM'||k==='shiftRPM'?model.redline+1000:120)]))}:undefined;
    if(preset&&Array.isArray(c.preset.ratios)&&c.preset.ratios.length===model.ratios.length)preset.ratios=c.preset.ratios.map((v,i)=>num(v,model.ratios[i],.4,5.5));
    return {...base,uid,upgrades,tune,preset,condition:num(c.condition,100,25,100),color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:base.color,
      visual:{...base.visual,wheels:['silver','black','bronze'].includes(c.visual?.wheels)?c.visual.wheels:'silver',finish:['metallic','matte','pearl'].includes(c.visual?.finish)?c.visual.finish:'metallic',stripe:c.visual?.stripe===true,spoiler:c.visual?.spoiler===true,tint:num(c.visual?.tint,.45,0,.9),rideHeight:num(c.visual?.rideHeight,0,-12,8)}};
  });
  if(!cars.length)throw Error('Save has no valid vehicles.');
  const b=raw.business||{},jobs=Array.isArray(b.jobs)?b.jobs.filter(j=>JOBS.some(k=>k.id===j.jobId)&&cars.some(c=>c.uid===j.carUid)&&Number.isFinite(j.endsAt)).slice(0,50).map(j=>({jobId:j.jobId,carUid:j.carUid,endsAt:clamp(j.endsAt,0,now+24*3600000)})):[];
  const settings={...defaults.settings};
  for(const [key,values] of Object.entries({difficulty:Object.keys(DIFFICULTIES),transmission:['auto','manual','clutch'],launch:['auto','assisted','manual'],damage:['off','reduced','full'],staging:['auto','manual']}))if(values.includes(raw.settings?.[key]))settings[key]=raw.settings[key];
  for(const key of ['revMatch','shiftHints','sound'])if(typeof raw.settings?.[key]==='boolean')settings[key]=raw.settings[key];
  settings.traction=num(raw.settings?.traction,.7,0,1);settings.volume=num(raw.settings?.volume,.18,0,.5);
  return {...defaults,cash:num(raw.cash,4500,0,1e10),xp:num(raw.xp,0,0,1e8),rep:num(raw.rep,0,0,1e8),cars,
    selected:cars.some(c=>c.uid===raw.selected)?raw.selected:cars[0].uid,completed:[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(id=>EVENTS.some(e=>e.id===id)))],
    history:Array.isArray(raw.history)?raw.history.filter(h=>h&&typeof h.name==='string'&&Number.isFinite(h.et)).map(h=>({name:h.name.slice(0,80),et:num(h.et,60,0,60),trap:num(h.trap,0,0,1000),won:h.won===true})).slice(0,20):[],
    records:raw.records&&typeof raw.records==='object'?Object.fromEntries(Object.entries(raw.records).filter(([k,v])=>/^[\w.-]+$/.test(k)&&Number.isFinite(v)&&v>0&&v<60)): {},
    settings,free:{distance:[18.288,201.168,402.336,804.672,1609.344].includes(raw.free?.distance)?raw.free.distance:402.336,track:['dock','desert','strip'].includes(raw.free?.track)?raw.free.track:'dock',weather:raw.free?.weather==='Wet'?'Wet':'Dry',time:raw.free?.time==='Day'?'Day':'Night',opponent:['matched',...CARS.map(c=>c.id)].includes(raw.free?.opponent)?raw.free.opponent:'matched'},
    business:{level:Math.floor(num(b.level,1,1,6)),bank:num(b.bank,0,0,28800),lastAccrued:num(b.lastAccrued,now,0,now),jobs},savedAt:now};
}
export function loadSave(storage=localStorage,now=Date.now()){
  try{const raw=storage.getItem(SAVE_KEY);return raw?validateSave(JSON.parse(raw),now):freshSave(now);}catch{return freshSave(now);}
}
export function accrueIncome(state,now=Date.now()){
  const b=state.business,i=b.level-1,cap=BUSINESS_RATES[i]*BUSINESS_CAPS[i];
  b.bank=Math.min(cap,b.bank+Math.max(0,now-b.lastAccrued)/3600000*BUSINESS_RATES[i]);b.lastAccrued=Math.max(b.lastAccrued,now);return Math.floor(b.bank);
}
export function claimIncome(state,now=Date.now()){
  accrueIncome(state,now);const earned=Math.floor(state.business.bank);state.cash+=earned;state.business.bank-=earned;return earned;
}
export function saveState(state,storage=localStorage){state.savedAt=Date.now();storage.setItem(SAVE_KEY,JSON.stringify(state));}
export const isBusy=(state,uid)=>state.business.jobs.some(j=>j.carUid===uid);
