// Isolated actual-game check for dark paint in the garage and a night race.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {freshSave,newCar,SAVE_KEY} from '../src/storage.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
mkdirSync('tests/artifacts',{recursive:true});
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:2}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    const save=freshSave(),truck=newCar('metro');truck.color='#000000';save.cars.push(truck);save.selected=truck.uid;
    save.free={...save.free,distance:18.288,time:'Night'};
    await page.addInitScript(({save,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{save,key:SAVE_KEY});
    await page.goto('http://localhost:5173/#garage');
    await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();
    const foundation=page.locator('.garage-fallback [data-art-id="chevrolet-silverado-1500-custom-crew-short-2025-black"] rect');
    await page.waitForFunction(()=>document.querySelector('.garage-fallback [data-art-id="chevrolet-silverado-1500-custom-crew-short-2025-black"] rect')?.getAttribute('fill')==='#383838');
    assert.equal(await foundation.getAttribute('fill'),'#383838');
    await page.waitForTimeout(450);await page.screenshot({path:`tests/artifacts/black-silverado-garage-${viewport.width}.png`});
    await page.reload();await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();
    const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(persisted.cars.find(c=>c.uid===truck.uid).color,'#000000','lighting never changes saved paint');
    await page.getByRole('button',{name:'Free race',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'Time of day',exact:true}).inputValue(),'Night');
    await page.getByRole('button',{name:'Stage your car',exact:true}).click();
    await page.getByRole('button',{name:'Stage & start',exact:true}).click();
    await page.waitForFunction(()=>Number(document.getElementById('speed').textContent)>20);
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.locator('#race-banner').evaluate(el=>el.hidden=true);
    await page.screenshot({path:`tests/artifacts/black-silverado-night-race-${viewport.width}.png`});
    await page.locator('#race-banner').evaluate(el=>el.hidden=false);
    await page.getByRole('button',{name:'Resume race',exact:true}).click();
    await page.locator('#result-title').waitFor({timeout:20000});
    assert.match(await page.locator('.slip-cars').innerText(),/Silverado/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
    await context.close();console.log(`PASS: saved pure black Silverado / garage / moving night race at ${viewport.width}px`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
