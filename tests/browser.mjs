// Optional repeatable E2E suite. Run with the dev server at localhost:5173.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright'));}catch{throw Error('Install optional browser testing support: npm install --no-save playwright');}
const channel=process.env.REDLINE_BROWSER_CHANNEL||'chrome';
const browser=await chromium.launch({headless:true,...(channel==='chromium'?{}:{channel})});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const button=name=>page.getByRole('button',{name,exact:true});
const select=name=>page.getByRole('combobox',{name,exact:true});
const screenshots=path.resolve('tests/artifacts');await mkdir(screenshots,{recursive:true});
const start=async()=>{await button('Stage your car').click();await button('Stage & start').click();};
const result=()=>page.locator('#result-title').waitFor({state:'visible',timeout:65000});
try{
  await page.goto('http://localhost:5173');
  await page.getByRole('heading',{name:'Make it yours.',exact:true}).waitFor();
  assert.match(await page.locator('#balance').innerText(),/4,500/);
  await page.screenshot({path:path.join(screenshots,'garage.png'),fullPage:true});
  await button('Free race').click();await select('Distance').selectOption('18.288');await start();await result();
  assert.equal(await page.locator('#result-title').innerText(),'That’s your lane.');
  assert.match(await page.locator('#balance').innerText(),/4,850/);
  await button('Back to garage').click();await button('Upgrade & tune').click();await button('$600').click();await button('$1,800').click();
  await button('Tune & gearing').click();await page.getByRole('spinbutton',{name:'Gear 1 ratio'}).fill('3.5');await button('Save tune preset').click();
  assert.equal(await page.getByRole('spinbutton',{name:'Gear 1 ratio'}).inputValue(),'3.5');
  await button('Appearance').click();await button('Paint #4676e5').click();await select('Wheels').selectOption('bronze');
  await page.reload();await button('Tune & gearing').click();assert.equal(await page.getByRole('spinbutton',{name:'Gear 1 ratio'}).inputValue(),'3.5');
  await button('Appearance').click();assert.equal(await select('Wheels').inputValue(),'bronze');
  await button('Free race').click();await select('Launch control').selectOption('manual');await start();await button('Space Launch').click();await result();
  assert.equal(await page.locator('#result-title').innerText(),'Red light.');
  await button('Run it back').click();await button('Stage & start').click();await page.locator('[data-light="green"].lit').waitFor();await button('Space Launch').click();await result();
  assert.notEqual(await page.locator('#result-title').innerText(),'Red light.');
  await button('Back to garage').click();await button('Settings & controls').click();await select('Launch control').selectOption('auto');
  await button('Career').click();await page.locator('[data-action="start-career"][data-id="F-0"]').click();await button('Stage & start').click();await result();
  assert.equal(await page.locator('#result-title').innerText(),'That’s your lane.');await button('Continue career').click();
  assert.equal(await page.locator('[data-action="start-career"][data-id="F-1"]').isEnabled(),true);
  // Seed an isolated test save to verify offline return, completed jobs and cap handling.
  await page.evaluate(()=>{const raw=JSON.parse(localStorage.getItem('redline-drag-club-v1'));raw.business.lastAccrued=Date.now()-20*3600000;raw.business.bank=0;raw.business.jobs=[{jobId:'show',carUid:raw.selected,endsAt:Date.now()-1000}];localStorage.setItem('redline-drag-club-v1',JSON.stringify(raw));});
  await page.reload();await button('Garage business').click();assert.equal(await page.locator('#income-bank').innerText(),'$800');
  await button('Collect earnings').click();await button('Collect & return car').click();assert.equal(await page.locator('[data-action="start-job"][data-id="show"]').isEnabled(),true);
  await page.setViewportSize({width:390,height:844});await button('My garage').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:path.join(screenshots,'mobile.png'),fullPage:true});
  await page.locator('.top-settings').click();await page.getByRole('heading',{name:'Your race. Your rules.'}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: browser race, reward, upgrades, gearing, customization, persistence, false start, manual launch, career, offline income, jobs and mobile checks.');
}finally{await context.close();await browser.close();}
