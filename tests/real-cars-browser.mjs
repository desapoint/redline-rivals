// Optional actual-game integration checks. Uses isolated saves and local runtime files.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshSave,newCar} from '../src/storage.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const channel=process.env.REDLINE_BROWSER_CHANNEL||'chrome';
const browser=await chromium.launch({headless:true,...(channel==='chromium'?{}:{channel})});
await mkdir('tests/artifacts',{recursive:true});
const fits=async(page,label)=>{
  const overflow=await page.evaluate(()=>{
    const root=document.querySelector('.game-dialog[open] .dialog-content')||document.querySelector('.slip-result')||document.querySelector('.game-main'),box=root.getBoundingClientRect();
    return [...root.querySelectorAll('button,input,select,a,h1,h2,h3,p,.vehicle-fact,.technical-grid strong')].filter(el=>el.getClientRects().length).filter(el=>{const r=el.getBoundingClientRect();return r.bottom>box.bottom+2||r.right>box.right+2||r.left<box.left-2;}).map(el=>el.textContent.trim().slice(0,70)||el.getAttribute('aria-label'));
  });
  assert.deepEqual(overflow,[],label+' fits without scrolling');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
};
const facts=async(page)=>{
  for(const tab of ['Factory','Simulation','Sources']){
    await page.getByRole('tab',{name:tab,exact:true}).click();await page.waitForTimeout(30);await fits(page,'vehicle '+tab);
    const next=page.locator('.game-dialog').getByRole('button',{name:'Next page',exact:true});
    while(await next.isVisible()&&!await next.isDisabled()){await next.click();await fits(page,'vehicle '+tab+' page');}
  }
  await page.keyboard.press('Escape');
};
const errors=[];
try{
  for(const viewport of process.argv.includes('--lab-only')?[]:[{width:1440,height:900},{width:390,height:844},{width:360,height:640}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const save=freshSave();save.cash=50000;save.cars.push(newCar('metro'),newCar('vortex'),newCar('rogue'));save.cars[0].color='#e6603b';delete save.cars[0].vehicleRevision;
    save.cars[0].tune={finalDrive:4.1,launchRPM:3300};
    await page.addInitScript(save=>{if(!localStorage.getItem('redline-drag-club-v1'))localStorage.setItem('redline-drag-club-v1',JSON.stringify(save));},save);
    await page.goto('http://localhost:5173/#garage');await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();
    await page.waitForTimeout(1100);await fits(page,'real garage');await page.screenshot({path:`tests/artifacts/real-mazda-garage-${viewport.width}.png`});
    const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('redline-drag-club-v1')));assert.equal(migrated.cars[0].color,'#a91f2c');
    for(const [model,name,artId] of [['kaze','Mazda3 GT Turbo','mazda3-gt-turbo-sedan-2021-red'],['metro','Silverado 1500 Custom','chevrolet-silverado-1500-custom-crew-short-2025-black'],['vortex','Kia Forte GT','kia-forte-gt-sedan-2022-orange'],['rogue','Nissan Rogue','nissan-rogue-2020-red']]){
      await page.getByRole('button',{name:/Collection/}).click();
      await page.waitForTimeout(50); // Allow the dialog's first layout to hide off-page cards.
      const carButton=page.locator(`[data-action="select-car"][data-id="${save.cars.find(c=>c.model===model).uid}"]`);
      while(!await carButton.isVisible())await page.locator('.game-dialog').getByRole('button',{name:'Next page',exact:true}).click();
      await carButton.click();
      await page.keyboard.press('Escape');
      await page.locator(`.garage-fallback [data-art-id="${artId}"]`).waitFor({state:'attached'});await page.waitForTimeout(450);await fits(page,name+' garage');
      await page.screenshot({path:`tests/artifacts/real-${model}-garage-${viewport.width}.png`});
      await page.getByRole('button',{name:'Build details',exact:true}).click();await fits(page,'build');await page.getByRole('button',{name:'Factory specs & sources',exact:true}).click();await facts(page);
      await page.getByRole('button',{name:'Upgrade & tune',exact:true}).click();await page.getByRole('button',{name:'Tune & gearing',exact:true}).click();await fits(page,name+' tune');
      const tabs=page.locator('.section-tabs [role="tab"]');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();await fits(page,name+' tune panel '+i);}
      await page.getByRole('button',{name:'Technical data',exact:true}).click();
      const dataTabs=page.locator('.section-tabs [role="tab"]');for(let i=0;i<await dataTabs.count();i++){await dataTabs.nth(i).click();await fits(page,name+' technical panel '+i);}
      await page.getByRole('button',{name:'Factory specs & sources',exact:true}).click();await facts(page);
      await page.getByRole('button',{name:'Appearance',exact:true}).click();if(await page.getByRole('tab',{name:'Paint',exact:true}).isVisible())await page.getByRole('tab',{name:'Paint',exact:true}).click();await fits(page,'appearance');await page.getByRole('button',{name:'Paint #4676e5',exact:true}).click();
      await page.reload();await page.getByRole('button',{name:'Appearance',exact:true}).click();if(await page.getByRole('tab',{name:'Paint',exact:true}).isVisible())await page.getByRole('tab',{name:'Paint',exact:true}).click();
      assert.equal(await page.locator('.paint-swatch.active').getAttribute('data-id'),'#4676e5');
      await page.getByRole('button',{name:'Free race',exact:true}).click();await page.getByRole('combobox',{name:'Distance',exact:true}).selectOption('18.288');
      await page.getByRole('button',{name:'Stage your car',exact:true}).click();await page.getByRole('button',{name:'Stage & start',exact:true}).click();
      if(model==='rogue'){assert.equal(await page.locator('[data-action="shift-up"]').isDisabled(),true);assert.equal(await page.locator('[data-action="shift-down"]').isDisabled(),true);}
      await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>20);await page.getByRole('button',{name:'Pause',exact:true}).click();
      await page.locator('#race-banner').evaluate(el=>el.hidden=true);await page.screenshot({path:`tests/artifacts/real-${model}-race-${viewport.width}.png`});await page.locator('#race-banner').evaluate(el=>el.hidden=false);
      await page.getByRole('button',{name:'Resume race',exact:true}).click();await page.locator('#result-title').waitFor({timeout:20000});
      assert.match(await page.locator('.slip-cars').innerText(),new RegExp(name));await page.waitForTimeout(1150);await fits(page,name+' finished race');await page.getByRole('button',{name:'Back to garage',exact:true}).click();
    }
    await page.getByRole('button',{name:'Dealership',exact:true}).click();
    for(const id of ['metro','vortex','rogue']){
      const specs=page.locator(`[data-dialog="factory-${id}"]`);
      while(!await specs.isVisible())await page.locator('.game-main').getByRole('button',{name:'Next page',exact:true}).click();
      await specs.click();await facts(page);
    }
    await context.close();
    console.log(`PASS: four real cars at ${viewport.width}×${viewport.height} / 2× DPR.`);
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/test-drive.html');await page.waitForFunction(()=>document.getElementById('lab-asset-status').textContent.includes('4 production'));
  for(const model of ['vortex','rogue']){
    await page.getByRole('combobox',{name:'Vehicle',exact:true}).selectOption(model);
    assert.equal(await page.locator('#ratio-0').count(),model==='rogue'?0:1);
    assert.equal(await page.locator('#shift-up').isDisabled(),model==='rogue');
    await page.locator('#prime-speed').fill('90');await page.locator('#apply-speed').click();await page.locator('#latch-throttle').check();
    await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>95);await page.locator('#pause').click();
    if(model==='rogue')assert.equal(await page.locator('#gear').innerText(),'D');
    const rpm=await page.locator('#rpm').innerText();assert.doesNotMatch(rpm,/NaN|undefined/);await page.screenshot({path:`tests/artifacts/real-${model}-lab.png`});
    await page.locator('#reset').click();
  }
  await context.close();
  assert.deepEqual(errors,[]);console.log(process.argv.includes('--lab-only')?'PASS: focused Forte/Rogue rolling drive-lab controls and telemetry.':'PASS: four real cars, save migration, garage, specs/source pages, repaint persistence, DCT/CVT controls, moving races/slips at desktop/phone sizes and 2× DPR, plus actual rolling drive-lab checks.');
}finally{await browser.close();}
