// Actual purchasing, driving and persistence checks for the eight new models.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {freshSave} from '../src/storage.js';
import {ADDITIONAL_REAL_CARS} from '../src/additional-cars.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const origin=process.env.REDLINE_TEST_ORIGIN||'http://localhost:5173/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
await mkdir('tests/artifacts',{recursive:true});
const fits=async(page,label)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true,label+' fits viewport');
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:2}),page=await context.newPage(),save=freshSave();save.cash=500000;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(save=>{if(!localStorage.getItem('redline-drag-club-v1'))localStorage.setItem('redline-drag-club-v1',JSON.stringify(save));},save);
  for(const base of ADDITIONAL_REAL_CARS){
   await page.goto(origin+'#dealership');await page.locator(`[data-action="buy-car"][data-id="${base.id}"]`).waitFor({state:'attached'});
   const buy=page.locator(`[data-action="buy-car"][data-id="${base.id}"]`);
   while(!await buy.isVisible())await page.locator('.game-main').getByRole('button',{name:'Next page',exact:true}).click();
   await buy.click();
   const owned=await page.evaluate(()=>JSON.parse(localStorage.getItem('redline-drag-club-v1')));
   assert.ok(owned.cars.some(c=>c.model===base.id));assert.equal(owned.cars.find(c=>c.uid===owned.selected).model,base.id);
   await page.goto(origin+'#garage');await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();
   await page.locator(`.garage-fallback [data-art-id="${base.artId}"]`).waitFor({state:'attached'});await page.waitForTimeout(450);await fits(page,base.id+' garage');
   await page.screenshot({path:`tests/artifacts/additional-${base.id}-garage-${viewport.width}.png`});
   await page.getByRole('button',{name:'Build details',exact:true}).click();await page.getByRole('button',{name:'Factory specs & sources',exact:true}).click();
   for(const name of ['Factory','Simulation','Sources']){
    await page.getByRole('tab',{name,exact:true}).click();await fits(page,base.id+' '+name);
    const next=page.locator('.game-dialog').getByRole('button',{name:'Next page',exact:true});
    while(await next.isVisible()&&!await next.isDisabled()){await next.click();await fits(page,base.id+' '+name+' page');}
   }
   await page.keyboard.press('Escape');await page.getByRole('button',{name:'Upgrade & tune',exact:true}).click();await page.getByRole('button',{name:'Appearance',exact:true}).click();
   if(await page.getByRole('tab',{name:'Paint',exact:true}).isVisible())await page.getByRole('tab',{name:'Paint',exact:true}).click();
   await page.getByRole('button',{name:'Paint #4676e5',exact:true}).click();await page.reload();
   const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('redline-drag-club-v1')));assert.equal(persisted.cars.find(c=>c.uid===persisted.selected).color,'#4676e5');
   await page.getByRole('button',{name:'Free race',exact:true}).click();await page.getByRole('combobox',{name:'Distance',exact:true}).selectOption('18.288');
   await page.getByRole('button',{name:'Stage your car',exact:true}).click();await page.getByRole('button',{name:'Stage & start',exact:true}).click();
   await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>20);await page.getByRole('button',{name:'Pause',exact:true}).click();
   await page.locator('#race-banner').evaluate(el=>el.hidden=true);await page.screenshot({path:`tests/artifacts/additional-${base.id}-race-${viewport.width}.png`});await page.locator('#race-banner').evaluate(el=>el.hidden=false);
   await page.getByRole('button',{name:'Resume race',exact:true}).click();await page.locator('#result-title').waitFor({timeout:20000});
   assert.ok((await page.locator('.slip-cars').innerText()).includes(base.name));await page.getByRole('button',{name:'Back to garage',exact:true}).click();
  }
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('redline-drag-club-v1')))).cars.length,9);
  await context.close();console.log(`PASS: eight new purchases, layered garages, specs, paint persistence and races at ${viewport.width}px / 2× DPR`);
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'test-drive.html');await page.waitForFunction(()=>document.getElementById('lab-asset-status').textContent.includes('12 production'));
 for(const base of ADDITIONAL_REAL_CARS){
  await page.getByRole('combobox',{name:'Vehicle',exact:true}).selectOption(base.id);await page.locator('#prime-speed').fill('90');await page.locator('#apply-speed').click();await page.locator('#latch-throttle').check();
  await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>95);await page.locator('#pause').click();
  assert.doesNotMatch(await page.locator('#rpm').innerText(),/NaN|undefined/);await page.screenshot({path:`tests/artifacts/additional-${base.id}-lab.png`});await page.locator('#reset').click();
 }
 await page.close();assert.deepEqual(errors,[]);console.log('PASS: eight new rolling drive-lab cars and finite gauges; no browser exceptions');
}finally{await browser.close();}
