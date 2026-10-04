import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {freshSave} from '../src/storage.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const origin=process.env.REDLINE_TEST_ORIGIN||'http://localhost:5174/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
await mkdir('tests/artifacts',{recursive:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:2});page.on('pageerror',e=>errors.push(e.message));
  const save=freshSave();await page.addInitScript(s=>localStorage.setItem('redline-drag-club-v1',JSON.stringify(s)),save);
  await page.goto(origin+'#garage');await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();await page.waitForTimeout(500);
  await page.screenshot({path:`tests/artifacts/mazda-reference-garage-${viewport.width}.png`});
  const checked=await page.evaluate(async()=>{
   const {CARS}=await import('./src/data.js'),{newCar}=await import('./src/storage.js'),{buildCar}=await import('./src/physics.js');
   const {getCarSprite,layerImage,assetURL}=await import('./src/car-assets.js'),{spriteLayout,spriteContacts}=await import('./src/sprite-geometry.js'),{drawSprite,spriteSVG}=await import('./src/sprite-renderer.js');
   const failures=[];
   for(const base of CARS){
    const car=buildCar(newCar(base.id)),record=getCarSprite(car),contacts=spriteContacts(record),layout=spriteLayout(record);
    if(contacts.some(p=>Math.abs(p.y-196)>1))failures.push(base.id+' tire contact mismatch');
    if(!assetURL(record.layers.shading).includes('v='+record.provenance.reviewFingerprint))failures.push(base.id+' stale image URL');
    const make=pitch=>{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=220;drawSprite(canvas.getContext('2d'),car,0,0,600,{front:0,rear:0},{pitch});return canvas;};
    const flat=make(0),pitched=make(.025),a=flat.getContext('2d').getImageData(0,0,600,220).data,b=pitched.getContext('2d').getImageData(0,0,600,220).data;
    let upper=0,bottom=0;for(let y=0;y<220;y++)for(let x=0;x<600;x++)for(let k=0;k<4;k++)if(a[(y*600+x)*4+k]!==b[(y*600+x)*4+k]){if(y>=194&&contacts.some(p=>Math.abs(x-p.x)<7))bottom++;else upper++;}
    if(bottom)failures.push(base.id+' pitch lifts tire/shadow pixels');if(!upper)failures.push(base.id+' body pitch missing');
    for(const p of contacts){
     const wheel=record.wheels.find(w=>w.axle===p.axle).wheel,image=layerImage(wheel),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
     if(ctx.getImageData(Math.round(wheel.pivot[0]),Math.max(0,Math.round(wheel.contactY)-1),1,1).data[3]<128)failures.push(base.id+' contact is transparent');
     if(flat.getContext('2d').getImageData(Math.round(p.x),197,1,1).data[3]===0)failures.push(base.id+' no contact shadow');
    }
    const div=document.createElement('div');div.innerHTML=spriteSVG(car);if(div.querySelectorAll('[data-role="contact-shadow"]').length!==3)failures.push(base.id+' SVG contact shadows missing');
   }
   return {cars:CARS.length,failures};
  });
  assert.deepEqual(checked,{cars:12,failures:[]});
  await page.getByRole('button',{name:'Free race',exact:true}).click();await page.getByRole('combobox',{name:'Distance',exact:true}).selectOption('18.288');
  await page.getByRole('button',{name:'Stage your car',exact:true}).click();await page.getByRole('button',{name:'Stage & start',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('#speed').textContent)>20);await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.locator('#race-banner').evaluate(el=>el.hidden=true);await page.screenshot({path:`tests/artifacts/mazda-reference-race-${viewport.width}.png`});await page.locator('#race-banner').evaluate(el=>el.hidden=false);
  await page.getByRole('button',{name:'Resume race',exact:true}).click();await page.locator('#result-title').waitFor({timeout:20000});assert.match(await page.locator('.slip-cars').innerText(),/Mazda3 GT Turbo/);
  await page.goto(origin+'test-drive.html');await page.waitForFunction(()=>document.querySelector('#lab-asset-status').textContent.includes('12 production'));
  await page.locator('#prime-speed').fill('90');await page.locator('#apply-speed').click();await page.locator('#latch-throttle').check();await page.waitForFunction(()=>Number(document.querySelector('#speed').textContent)>95);await page.locator('#pause').click();
  await page.screenshot({path:`tests/artifacts/mazda-reference-lab-${viewport.width}.png`});await page.close();
  console.log(`PASS: 12 measured tire/shadow contacts, body-only pitch, versioned artwork and Mazda garage/lab at ${viewport.width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
