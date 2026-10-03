import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const channel=process.env.REDLINE_BROWSER_CHANNEL||'chrome',browser=await chromium.launch({headless:true,...(channel==='chromium'?{}:{channel})});
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));await mkdir('tests/artifacts',{recursive:true});
const button=name=>page.getByRole('button',{name,exact:true});
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]){
    await page.setViewportSize(viewport);await page.goto('http://localhost:5173/#race');await page.reload();
    await button('Stage your car').click();await page.locator('#track-canvas').waitFor();
    const stageFits=await page.locator('.track-container').evaluate(track=>{
      const box=track.getBoundingClientRect();return [...track.querySelectorAll('button')].every(el=>{const r=el.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom;})&&track.scrollTop===0;
    });assert.equal(stageFits,true,'race staging controls fit inside the track without internal scrolling');
    await page.screenshot({path:`tests/artifacts/race-stage-${viewport.width}.png`});
    if(await page.locator('#race-sound').getAttribute('aria-pressed')!=='true')await button('Toggle race audio').click();
    await page.waitForFunction(()=>document.getElementById('race-sound').getAttribute('aria-pressed')==='true');
    await button('Stage & start').click();
    await page.waitForFunction(()=>Number(document.getElementById('speed')?.textContent)>100,{},{timeout:20000});
    await button('Pause').click();await page.waitForTimeout(150);
    const frozenSpeed=await page.locator('#speed').innerText(),frozenET=await page.locator('#elapsed').innerText();
    const frozen=await page.locator('#track-canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);
    assert.equal(await page.locator('#track-canvas').evaluate(c=>c.toDataURL()),frozen,'paused presentation freezes');
    assert.equal(await page.locator('#speed').innerText(),frozenSpeed);assert.equal(await page.locator('#elapsed').innerText(),frozenET);
    // Hide the pause banner only for inspecting the frozen rendering, then restore it.
    await page.locator('#race-banner').evaluate(el=>el.style.visibility='hidden');
    await page.screenshot({path:`tests/artifacts/race-speed-${viewport.width}.png`});
    await page.locator('#race-banner').evaluate(el=>el.style.visibility='');
    await button('Resume race').click();await page.locator('#result-title').waitFor({timeout:30000});
    assert.ok(Number(await page.locator('.slip-et strong').first().innerText())>10,'quarter-mile ET remains real simulation time');
    await button('Back to garage').click();
  }
  // Exercise the same renderer through the continuous lab, on wet track and desert settings.
  await page.goto('http://localhost:5173/test-drive.html');await page.getByRole('button',{name:'Auto pull',exact:true}).click();
  await page.getByRole('combobox',{name:'Track',exact:true}).selectOption('desert');
  await page.getByRole('combobox',{name:'Weather',exact:true}).selectOption('Wet');
  await page.waitForTimeout(700);await page.screenshot({path:'tests/artifacts/race-lab-wet.png'});
  assert.deepEqual(errors,[]);console.log('PASS: chase race view at desktop/phone sizes, optional audio, exact pause freeze, real quarter-mile slips and shared wet/desert lab rendering.');
}finally{await context.close();await browser.close();}
