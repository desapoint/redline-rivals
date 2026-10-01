import { CARS, PARTS, TRACKS, EVENTS, JOBS, BUSINESS_RATES, BUSINESS_CAPS, DIFFICULTIES, CLASSES } from './data.js';
import { buildCar, rating, createVehicle, stepVehicle, shiftVehicle, idealShift, clamp } from './physics.js';
import { freshSave, loadSave, saveState, validateSave, accrueIncome, claimIncome, newCar, isBusy } from './storage.js';
import { drawTrack } from './graphics.js';
import { EngineAudio } from './audio.js';
import * as views from './views.js';

let state=loadSave(),page=['garage','race','career','tuning','dealership','business','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'garage';
const ui={careerTier:'F',tuningTab:'upgrades'},keys={throttle:false,clutch:false,blip:false},audio=new EngineAudio();
let race=null,toastTimer=0,frame=0,lastFrame=0,accumulator=0,lastFeedback='',tick=0;
const app=document.getElementById('app');
const owned=()=>state.cars.find(c=>c.uid===state.selected)||state.cars[0];
const car=()=>buildCar(owned());
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
function persist(){try{saveState(state);}catch{toast('Browser storage is unavailable. Export your save to keep this progress.');const el=document.getElementById('save-status');if(el)el.textContent='SAVE UNAVAILABLE';}}
function render(){
  accrueIncome(state);ui.jobStatus=state.business.jobs.map(j=>j.endsAt<=Date.now()).join(',');let content;
  if(page==='racing')content=views.racing(state,race);else content=views[page==='race'?'freeRace':page](state,ui);
  app.innerHTML=views.shell(state,page,content);
  if(page==='racing')resizeTrack();
}
function go(next){
  if(race&&!race.result&&page==='racing')return toast('Pause or leave the race before opening your garage.');
  stopRace();page=next;location.hash=next;render();window.scrollTo({top:0,behavior:'instant'});
}
function spend(amount){if(state.cash<amount){toast('A few more runs will cover this.');return false;}state.cash-=amount;return true;}
function refresh(message){persist();render();if(message)toast(message);}
function assertAvailable(){if(isBusy(state,state.selected)){toast('This car is on a job. Collect the completed job or choose another car.');return false;}return true;}
function opponentFor(event){
  if(event){const models=['kaze','roadster','vortex','rally','muscle','apex','nova'],o=newCar(models[event.tierIndex]);
    o.upgrades={tires:Math.min(4,event.tierIndex),gearbox:Math.min(2,event.tierIndex),clutch:Math.min(2,event.tierIndex)};
    if(event.boss){o.upgrades.intake=1;o.upgrades.ecu=1;}return buildCar(o);
  }
  if(state.free.opponent==='matched'){const o=structuredClone(owned());o.uid='opponent';o.color='#8b9bb8';o.condition=100;o.visual={wheels:'silver',stripe:false};return buildCar(o);}
  return buildCar(newCar(state.free.opponent));
}
function startRace(event=null){
  if(!assertAvailable())return;
  if(event){const reason=views.eventLocked(state,event)||views.restrictionReason(car(),event);if(reason)return toast(reason);}
  stopRace();persist();const player=createVehicle(car()),opponent=createVehicle(opponentFor(event)),d=DIFFICULTIES[state.settings.difficulty];
  opponent.reaction=d.reaction+Math.random()*.055;
  race={player,opponent,event,distance:event?.distance||state.free.distance,track:TRACKS.find(t=>t.id===(event?'dock':state.free.track)),weather:event?'Dry':state.free.weather,time:event?'Night':state.free.time,opponentName:event?.boss?event.name:opponent.car.name,
    clock:0,runClock:0,phase:'prepare',staged:false,burnout:false,paused:false,result:null,settings:{...state.settings},aiShiftOffset:d.shiftOffset+Math.random()*70,feedbackUntil:0};
  if(race.settings.launch==='manual')player.gear=0;
  page='racing';render();window.scrollTo({top:0,behavior:'instant'});audio.start();lastFrame=performance.now();frame=requestAnimationFrame(animate);
}
function stopRace(){cancelAnimationFrame(frame);audio.stop();race=null;clearInputs();lastFeedback='';accumulator=0;}
function clearInputs(){keys.throttle=false;keys.clutch=false;keys.blip=false;document.querySelectorAll('[data-hold]').forEach(b=>b.classList.remove('pressed'));}
function resizeTrack(){const canvas=document.getElementById('track-canvas');if(!canvas)return;const box=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
function feedback(text){if(!race)return;race.player.feedback=text;race.feedbackUntil=race.clock+1.4;const el=document.getElementById('shift-feedback');if(el){el.textContent=text;el.classList.add('show');}}
function launch(){
  if(!race||race.result||race.paused)return;
  if(race.phase==='prepare')return toast('Stage the car first.');
  if(race.phase==='countdown'){finishRace({falseStart:true});return;}
  if(race.player.started||race.phase!=='running')return;
  race.player.started=true;race.player.gear=1;race.player.reaction=race.runClock;
  feedback(race.runClock<.2?'CLEAN LAUNCH':race.runClock<.5?'GOOD LAUNCH':'LATE LAUNCH');
}
function shift(direction){
  if(!race||race.paused||race.result||!race.player.started||race.settings.transmission==='auto')return;
  const message=shiftVehicle(race.player,direction,{revMatch:race.settings.revMatch,clutch:race.settings.transmission!=='clutch'||keys.clutch,blip:keys.blip});
  if(message)feedback(message);
}
function stage(){
  if(!race||race.phase!=='prepare')return;
  if(race.settings.staging==='manual'&&!race.staged){race.staged=true;document.querySelectorAll('.tree-stage')[0].classList.add('lit');document.querySelector('[data-action="stage"]').textContent='Stage & start';return toast('Pre-staged. Stage again to start the tree.');}
  race.phase='countdown';race.clock=0;document.getElementById('race-banner').hidden=true;
  document.querySelectorAll('.tree-stage').forEach(el=>el.classList.add('lit'));feedback('WATCH THE LIGHTS');
}
function pause(){if(!race||race.result)return;race.paused=!race.paused;clearInputs();const banner=document.getElementById('race-banner');banner.hidden=!race.paused;
  if(race.paused){audio.stop();banner.innerHTML='<span class="eyebrow">TAKE A BREATHER</span><h2>Race paused.</h2><p>Your timer and your rival are paused, too.</p><button class="button primary" data-action="pause">Resume race</button>';}
  else if(race.phase==='prepare'){render();}const b=document.querySelector('.race-title [data-action="pause"]');if(b)b.textContent=race.paused?'Resume':'Pause';
}
function physicsTick(dt){
  if(!race||race.paused||race.result)return;
  race.clock+=dt;
  if(race.phase==='countdown'){
    for(let i=1;i<=3;i++){const el=document.querySelector(`[data-light="${i}"]`);el?.classList.toggle('lit',race.clock>=.65+i*.5);}
    if(race.clock>=2.65){race.phase='running';race.runClock=0;document.querySelector('[data-light="green"]')?.classList.add('lit');feedback('GREEN — GO');}
  }
  if(race.phase!=='running')return;
  race.runClock+=dt;
  const p=race.player,o=race.opponent,st=race.settings;
  if(!p.started&&st.launch==='auto'&&race.runClock>=.12){p.started=true;p.gear=1;p.reaction=.12;}
  if(!p.started&&st.launch==='assisted'&&keys.throttle)launch();
  if(!o.started&&race.runClock>=o.reaction)o.started=true;
  if(p.started&&st.transmission==='auto'&&p.rpm>=(p.car.shiftRPM||idealShift(p.car,p.gear))){shiftVehicle(p);}
  if(o.started&&o.rpm>=clamp(idealShift(o.car,o.gear)+race.aiShiftOffset,o.car.redline*.62,o.car.redline-30))shiftVehicle(o);
  const throttle=st.transmission==='clutch'?(keys.throttle?1:keys.blip?.7:0):p.started?1:keys.throttle?1:0;
  const opts={distance:race.distance,surface:race.track.surface,wet:race.weather==='Wet',burnout:race.burnout};
  stepVehicle(p,dt,{...opts,throttle,clutch:keys.clutch?0:1,traction:st.traction});
  stepVehicle(o,dt,{...opts,throttle:1,clutch:1,traction:.7,burnout:true});
  if(p.feedback&&p.feedback!==lastFeedback){lastFeedback=p.feedback;feedback(p.feedback);}
  if(p.finished&&o.finished)finishRace({});else if(race.runClock>60)finishRace({dnf:!p.finished||!o.finished});
}
function updateHUD(){
  if(!race)return;const p=race.player,c=p.car,put=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  put('speed',Math.round(p.v*3.6));put('gear',p.gear||'N');put('rpm',Math.round(p.rpm).toLocaleString());put('elapsed',(p.finishTime||p.elapsed).toFixed(3));put('slip',Math.round(p.slip*100)+'%');put('boost',(p.boost*(.6+c.turboStage*.4)).toFixed(1)+' bar');
  put('player-distance',Math.round(p.x)+' m');put('opponent-distance',Math.round(race.opponent.x)+' m');
  document.getElementById('player-progress').style.width=p.x/race.distance*100+'%';document.getElementById('opponent-progress').style.width=race.opponent.x/race.distance*100+'%';
  document.getElementById('rpm-fill').style.width=Math.min(100,p.rpm/c.redline*100)+'%';document.getElementById('rpm-fill').classList.toggle('optimal',Math.abs(p.rpm-idealShift(c,p.gear||1))<250&&race.settings.shiftHints);
  const marker=document.getElementById('shift-marker');marker.style.left=idealShift(c,p.gear||1)/c.redline*100+'%';marker.hidden=!race.settings.shiftHints;
  put('shift-hint',race.settings.shiftHints?'OPTIMAL SHIFT '+idealShift(c,p.gear||1)+' RPM':'SHIFT ASSIST OFF');
  document.getElementById('shift-feedback')?.classList.toggle('show',race.clock<race.feedbackUntil);
  audio.update(p.rpm,p.started?1:.35,race.settings.sound&&!race.paused&&!race.result,race.settings.volume);
}
function animate(now){
  if(!race)return;const delta=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  accumulator+=delta;let steps=0;while(accumulator>=1/120&&steps++<13){physicsTick(1/120);accumulator-=1/120;}
  const canvas=document.getElementById('track-canvas');if(canvas){const rect=canvas.getBoundingClientRect();drawTrack(canvas.getContext('2d'),rect.width,rect.height,race);}
  updateHUD();frame=requestAnimationFrame(animate);
}
function finishRace({falseStart=false,dnf=false}){
  if(!race||race.result)return;
  const p=race.player,o=race.opponent,event=race.event,won=!falseStart&&!dnf&&p.finishTime+p.reaction<o.finishTime+o.reaction;
  const cash=falseStart||dnf?0:won?(event?.reward||350):Math.round((event?.reward||350)*.2),rep=won?(event?.rep||3):0,xp=falseStart||dnf?0:won?(event?80:25):10;
  let prize=null;const first=event&&!state.completed.includes(event.id);
  if(won&&event){if(first)state.completed.push(event.id);if(first&&event.boss){const model=['metro','roadster','zenith','rally','muscle','apex','nova'][event.tierIndex];if(!state.cars.some(c=>c.model===model)){state.cars.push(newCar(model));prize=CARS.find(c=>c.id===model).name;}}}
  state.cash+=cash;state.rep+=rep;state.xp+=xp;
  const key=`${state.selected}-${race.distance}`,personalBest=!falseStart&&!dnf&&(!state.records[key]||p.finishTime<state.records[key]);if(personalBest)state.records[key]=p.finishTime;
  if(!falseStart&&!dnf){state.history.unshift({name:event?.name||`${race.track.name} · Free race`,et:p.finishTime,trap:p.trap,won});state.history=state.history.slice(0,20);}
  if(race.settings.damage!=='off'){const wear=(p.stress+p.tireWear*.25+(falseStart?0:.3))*(race.settings.damage==='full'?1:.2);owned().condition=Math.max(25,owned().condition-wear);}
  race.result={won,falseStart,dnf,cash,rep,xp,personalBest,prize};audio.stop();persist();
  if(falseStart)document.querySelector('[data-light="red"]')?.classList.add('lit');
  document.getElementById('race-banner').hidden=true;document.getElementById('results').innerHTML=views.resultView(race.result,race,state);
  document.getElementById('balance').textContent=views.money(state.cash);document.getElementById('result-title')?.focus();
}
const actions={
  'race-now':()=>startRace(), 'start-free':()=>startRace(), 'start-career':el=>startRace(EVENTS.find(e=>e.id===el.dataset.id)),
  'nav-garage':()=>go('garage'),'select-car':el=>{state.selected=el.dataset.id;refresh('Car selected.');},
  'career-tier':el=>{ui.careerTier=el.dataset.id;render();},'tuning-tab':el=>{ui.tuningTab=el.dataset.id;render();},
  'buy-car':el=>{const base=CARS.find(c=>c.id===el.dataset.id);if(!base||state.rep<base.unlock*60||state.cars.some(c=>c.model===base.id)||!spend(base.price))return;const added=newCar(base.id);state.cars.push(added);state.selected=added.uid;refresh(`${base.name} is yours. Welcome to the collection.`);},
  upgrade:el=>{if(!assertAvailable())return;const p=PARTS.find(p=>p.id===el.dataset.id),o=owned(),stage=o.upgrades[p.id]||0;if(stage>=p.max||stage>=2&&state.rep<60*(stage-1)||!spend(Math.round(p.baseCost*(stage+1)**1.8)))return;o.upgrades[p.id]=stage+1;refresh(`${p.name} stage ${stage+1} installed.`);},
  paint:el=>{if(!assertAvailable())return;owned().color=el.dataset.id;refresh();},
  repair:()=>{if(!assertAvailable())return;const cost=Math.ceil((100-owned().condition)*35);if(spend(cost)){owned().condition=100;refresh('Freshly serviced. Ready for a clean pass.');}},
  'reset-tune':()=>{if(!assertAvailable())return;owned().tune={};refresh('Factory tune restored.');},
  'save-tune':()=>{if(!assertAvailable())return;owned().preset=structuredClone(owned().tune);refresh('Tune preset saved with this car.');},
  'load-tune':()=>{if(!assertAvailable()||!owned().preset)return;owned().tune=structuredClone(owned().preset);refresh('Tune preset loaded.');},
  'claim-income':()=>{const cash=claimIncome(state);refresh(`${views.money(cash)} collected from the shop.`);},
  'upgrade-business':()=>{const b=state.business;if(b.level>=6)return;accrueIncome(state);if(spend(2500*b.level**2)){b.level++;refresh(`Shop expanded to level ${b.level}.`);}},
  'start-job':el=>{const j=JOBS.find(j=>j.id===el.dataset.id),uid=document.getElementById('job-'+j.id).value,o=state.cars.find(o=>o.uid===uid);if(!o||isBusy(state,uid)||!j.test(buildCar(o))||state.business.jobs.some(a=>a.jobId===j.id))return;state.business.jobs.push({jobId:j.id,carUid:uid,endsAt:Date.now()+j.duration});refresh(`${CARS.find(c=>c.id===o.model).name} is on the job.`);},
  'claim-job':el=>{const i=state.business.jobs.findIndex(j=>j.jobId===el.dataset.id);if(i<0||state.business.jobs[i].endsAt>Date.now())return;const job=JOBS.find(j=>j.id===el.dataset.id);state.cash+=job.reward;state.business.jobs.splice(i,1);refresh(`Job complete. ${views.money(job.reward)} earned and your car is back.`);},
  stage,burnout:()=>{if(!race||race.phase!=='prepare'||race.burnout)return;race.burnout=true;race.player.temperature=70;race.player.tireWear+=.2;document.querySelector('[data-action="burnout"]').textContent='Tires warm · 70°C';document.querySelector('[data-action="burnout"]').disabled=true;feedback('TIRES READY');},
  launch,'shift-up':()=>shift(1),'shift-down':()=>shift(-1),pause,
  'quit-race':()=>{stopRace();page='race';render();toast('Race left. No rewards awarded.');},
  retry:()=>{const event=race?.event;startRace(event);},'finish-garage':()=>go('garage'),'finish-career':()=>{const tier=race?.event?.tier;ui.careerTier=tier||'F';go('career');},
  export:()=>{accrueIncome(state);persist();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='redline-garage-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Garage backup exported.');},
  import:()=>document.getElementById('import-file').click(),
  reset:()=>{const panel=document.querySelector('.save-panel');if(document.getElementById('reset-confirm'))return;panel.insertAdjacentHTML('afterend','<section class="panel reset-confirm" id="reset-confirm"><h3>Start a new career?</h3><p>This removes the garage saved in this browser. Export a backup first if you want to keep it.</p><button class="button danger" data-action="confirm-reset">Reset my garage</button> <button class="button secondary" data-action="cancel-reset">Keep my garage</button></section>');},
  'cancel-reset':()=>document.getElementById('reset-confirm').remove(),
  'confirm-reset':()=>{state=freshSave();refresh('New career started.');}
};
document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav){go(nav.dataset.nav);return;}const button=e.target.closest('[data-action]');if(button&&!button.disabled)actions[button.dataset.action]?.(button);});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.type==='range'){const label=el.closest('label');const output=label?.querySelector('output');if(output)output.textContent=Number(el.value).toLocaleString()+(el.dataset.tune==='launchRPM'||el.dataset.tune==='shiftRPM'?' RPM':'');}
  // Commit valid input before a save button re-renders the form; synthetic fill and touch keyboards may not emit blur-change.
  if(el.dataset.gear!==undefined&&!isBusy(state,state.selected)){
    const ratios=[...car().ratios],i=Number(el.dataset.gear),v=Number(el.value);
    if(!Number.isFinite(v)||v<.4||v>5.5)return;ratios[i]=v;
    if(!ratios.some((r,j)=>j>0&&r>=ratios[j-1]))owned().tune.ratios=ratios;
  }
});
document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.id==='import-file'){
    const file=el.files[0];if(!file)return;if(file.size>1000000)return toast('Save files must be smaller than 1 MB.');
    try{const imported=validateSave(JSON.parse(await file.text()));state=imported;accrueIncome(state);refresh('Garage imported successfully.');}catch(error){toast('Could not import save: '+error.message);}return;
  }
  if(el.dataset.setting){const key=el.dataset.setting,scope=el.dataset.scope||'settings';if(scope==='visual'){if(!assertAvailable())return;owned().visual[key]=el.value;}
    else {const target=scope==='free'?state.free:state.settings;target[key]=el.type==='checkbox'?el.checked:['traction','distance'].includes(key)?Number(el.value):el.value;
      if(key==='difficulty'){const d=DIFFICULTIES[el.value];Object.assign(state.settings,{transmission:d.transmission,launch:d.launch,traction:d.traction,damage:d.damage});}}
    refresh();return;
  }
  if(el.dataset.visual){if(!assertAvailable())return;const k=el.dataset.visual;if(k==='color')owned().color=el.value;else owned().visual[k]=el.type==='checkbox'?el.checked:['tint','rideHeight'].includes(k)?Number(el.value):el.value;refresh();return;}
  if(el.dataset.tune){if(!assertAvailable())return;owned().tune[el.dataset.tune]=Number(el.value);refresh();return;}
  if(el.dataset.gear){if(!assertAvailable())return;const i=Number(el.dataset.gear),ratios=[...car().ratios],v=Number(el.value);if(!Number.isFinite(v)||v<.4||v>5.5)return toast('Ratios must be between 0.4 and 5.5.');ratios[i]=v;if(ratios.some((r,j)=>j>0&&r>=ratios[j-1]))return refresh('Keep gear ratios descending.');owned().tune.ratios=ratios;refresh();}
});
document.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-hold]');if(!button||!race||race.paused)return;e.preventDefault();keys[button.dataset.hold]=true;if(keys.throttle&&race.settings.launch==='assisted'&&race.phase==='running')launch();button.classList.add('pressed');button.setPointerCapture(e.pointerId);});
document.addEventListener('pointerup',e=>{const button=e.target.closest('[data-hold]');if(button){keys[button.dataset.hold]=false;button.classList.remove('pressed');}});
document.addEventListener('pointercancel',clearInputs);
document.addEventListener('keydown',e=>{
  if(!race||race.result||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  const k=e.code;if(['Space','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].includes(k))e.preventDefault();
  if(k==='Escape'&&!e.repeat){pause();return;}if(race.paused)return;
  if(k==='KeyW'||k==='ArrowUp')keys.throttle=true;if(k==='KeyC')keys.clutch=true;if(k==='KeyR')keys.blip=true;
  if(keys.throttle&&race.settings.launch==='assisted'&&race.phase==='running')launch();
  if(!e.repeat){if(k==='Space')launch();if(k==='KeyE'||k==='ArrowRight')shift(1);if(k==='KeyQ'||k==='ArrowLeft')shift(-1);}
});
document.addEventListener('keyup',e=>{if(e.code==='KeyW'||e.code==='ArrowUp')keys.throttle=false;if(e.code==='KeyC')keys.clutch=false;if(e.code==='KeyR')keys.blip=false;});
window.addEventListener('blur',clearInputs);window.addEventListener('resize',resizeTrack);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(race&&!race.paused&&!race.result)pause();}else if(!race){accrueIncome(state);render();}});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['garage','race','career','tuning','dealership','business','settings'].includes(next)&&next!==page)go(next);});
window.addEventListener('beforeunload',()=>{accrueIncome(state);persist();});
setInterval(()=>{if(race)return;accrueIncome(state);tick++;if(tick%5===0)persist();if(page==='business'){const el=document.getElementById('income-bank');if(el)el.textContent=views.money(state.business.bank);const b=document.querySelector('[data-action="claim-income"]');if(b)b.disabled=Math.floor(state.business.bank)<1;if(state.business.jobs.map(j=>j.endsAt<=Date.now()).join(',')!==ui.jobStatus)render();}},2000);
accrueIncome(state);render();persist();
