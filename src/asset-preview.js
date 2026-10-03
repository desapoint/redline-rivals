import { demoSpritePack } from './demo-sprite-pack.js';
import { installSpritePack, componentOptions, getCarSprite } from './car-assets.js';
import { spriteSVG, drawSprite } from './sprite-renderer.js';
import { advanceWheelRotation, spriteLayout } from './sprite-geometry.js';

const $=id=>document.getElementById(id),baseURL=new URL('./assets/cars/',import.meta.url);
const car={id:'layer-demo',artId:'layer-demo',name:'Layer geometry demo',color:'#e6603b',radius:.31,drive:'RWD',visual:{}};
let production={schemaVersion:1,cars:{},components:{wheels:{},brakes:{}}},currentPack=demoSpritePack,rotation={front:0,rear:0},running=true,lastFrame=0;
let selectionVersion=0;
function options(el,entries){el.replaceChildren(...entries.map(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;return option;}));}
function showError(error){$('asset-error').textContent=error.message;}
function updatePreview(){
  car.color=$('paint').value;car.drive=$('drive').value;car.visual={wheelAsset:$('wheel-choice').value,brakeAsset:$('brake-choice').value,rideHeight:Number($('ride-height').value),bodyView:$('body-view').value};
  const bg=$('preview-background').value;
  $('asset-showroom').style.background=bg==='checker'?'repeating-conic-gradient(#c4c4c4 0% 25%, #e5e5e5 0% 50%) 0 0 / 24px 24px':{white:'#ffffff',gray:'#999999',black:'#000000'}[bg];
  const angle=Number($('wheel-angle').value)*Math.PI/180;
  $('asset-showroom').innerHTML=spriteSVG(car,'',{front:angle,rear:angle}) || '';
  $('angle-output').textContent=`${$('wheel-angle').value}°`;$('speed-output').textContent=`${$('speed').value} km/h`;$('slip-output').textContent=`${$('slip').value}%`;
}
async function selectArtwork(){
  const version=++selectionVersion,id=$('art-choice').value;
  $('art-choice').disabled=true;$('facing').disabled=true;
  try {
    currentPack=structuredClone(id==='layer-demo'?demoSpritePack:production);
    if(id==='layer-demo' && $('facing').value==='left'){
      const c=currentPack.cars[id];c.facing='left';c.wheels=c.wheels.map(w=>({...w,x:c.width-w.x}));
      // A left-facing file has mirrored body pixels as well as mirrored native geometry.
      c.layers.body.file='demo/body-left.svg';c.layers.paintMask.file='demo/paint-mask-left.svg';
    }
    await installSpritePack(currentPack,baseURL);if(version!==selectionVersion)return;
    car.artId=id;car.name=id==='layer-demo'?'Layer geometry demo':id;
    $('body-view').disabled=getCarSprite(car)?.paintMode!=='flat-cel';if($('body-view').disabled)$('body-view').value='assembled';
    options($('wheel-choice'),[['','Factory wheels'],...componentOptions('wheels')]);options($('brake-choice'),[['','Factory brakes'],...componentOptions('brakes')]);
    rotation={front:0,rear:0};$('asset-error').textContent='';
    $('asset-status').textContent=id==='layer-demo'?`Demo fixture loaded. ${Object.keys(production.cars).length} finished car packs available.`:`Loaded ${id}. Native geometry and images validated.`;
    updatePreview();
  }catch(error){showError(error);}finally{$('art-choice').disabled=false;$('facing').disabled=$('art-choice').value!=='layer-demo';}
}
function animate(now){
  const dt=Math.min(.05,(now-(lastFrame || now))/1000);lastFrame=now;
  if(running)rotation=advanceWheelRotation(rotation,car,Number($('speed').value)/3.6*dt,Number($('slip').value)/100);
  const canvas=$('asset-canvas'),ctx=canvas.getContext('2d'),w=600,h=220,dpr=Math.min(window.devicePixelRatio || 1,2),pixels=Math.round(canvas.getBoundingClientRect().width*dpr);
  if(canvas.width!==pixels || canvas.height!==Math.round(pixels*h/w)){canvas.width=pixels;canvas.height=Math.round(pixels*h/w);}
  ctx.setTransform(pixels/w,0,0,pixels/w,0,0);ctx.clearRect(0,0,w,h);
  const background=$('preview-background').value;
  if(background==='checker')for(let y=0;y<h;y+=12)for(let x=0;x<w;x+=12){ctx.fillStyle=(x/12+y/12)%2?'#c4c4c4':'#e5e5e5';ctx.fillRect(x,y,12,12);}
  else {ctx.fillStyle={white:'#ffffff',gray:'#999999',black:'#000000'}[background];ctx.fillRect(0,0,w,h);}
  if(car.visual.bodyView==='assembled'){ctx.fillStyle='#59606f';ctx.fillRect(0,198,w,2);}
  drawSprite(ctx,car,0,0,w,rotation);
  // Expose the state actually drawn so inspector checks can await a frame.
  canvas.dataset.artId=car.artId;canvas.dataset.bodyView=car.visual.bodyView;canvas.dataset.paint=car.color;
  const record=getCarSprite(car);
  if(record && $('geometry').checked && car.visual.bodyView==='assembled'){const t=spriteLayout(record);ctx.save();if(record.facing==='left'){ctx.translate(600,0);ctx.scale(-1,1);}ctx.translate(t.x,t.y);ctx.scale(t.scale,t.scale);ctx.strokeStyle='#62e1e7';ctx.lineWidth=1/t.scale;
    for(const s of record.wheels){ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.moveTo(s.x-12/t.scale,s.y);ctx.lineTo(s.x+12/t.scale,s.y);ctx.moveTo(s.x,s.y-12/t.scale);ctx.lineTo(s.x,s.y+12/t.scale);ctx.stroke();}ctx.restore();}
  requestAnimationFrame(animate);
}
$('art-choice').addEventListener('change',selectArtwork);$('facing').addEventListener('change',selectArtwork);
for(const id of ['wheel-choice','brake-choice','paint','ride-height','wheel-angle','speed','slip','drive','geometry','body-view','preview-background'])$(id).addEventListener('input',updatePreview);
$('animation').addEventListener('click',()=>{running=!running;$('animation').textContent=running?'Pause rotation':'Resume rotation';});
try{const response=await fetch(new URL('manifest.json',baseURL));if(!response.ok)throw Error(`Manifest: HTTP ${response.status}`);production=await response.json();}catch(error){showError(error);}
options($('art-choice'),[['layer-demo','Demo · layered geometry'],...Object.keys(production.cars || {}).map(id=>[id,id])]);
const requested=new URLSearchParams(location.search);
if(Object.hasOwn(production.cars || {},requested.get('car')))$('art-choice').value=requested.get('car');
if(['paint','shading','fixtures','linework'].includes(requested.get('layer')))$('body-view').value=requested.get('layer');
if(requested.get('layer')==='paint')$('paint').value='#ffffff';
await selectArtwork();requestAnimationFrame(animate);
