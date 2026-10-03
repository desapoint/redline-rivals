// Optional UI regression checks; use the same Playwright setup as tests/browser.mjs.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const channel=process.env.REDLINE_BROWSER_CHANNEL||'chrome';
const browser=await chromium.launch({headless:true,...(channel==='chromium'?{}:{channel})});
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await mkdir('tests/artifacts',{recursive:true});
const fits=async(label)=>{
  const overflow=await page.evaluate(()=>{
    const main=document.querySelector('.game-main'),dialog=document.querySelector('.game-dialog[open]'),root=dialog?.querySelector('.dialog-content')||main,box=root.getBoundingClientRect();
    return [...root.querySelectorAll('button,input,select,a,h1,h2,h3,p,.slip-row,.part-effect,.event-reward,.technical-grid strong,.run-row')].filter(el=>el.getClientRects().length&&!el.closest('template')).filter(el=>{
      const r=el.getBoundingClientRect();return r.bottom>box.bottom+2||r.right>box.right+2||r.left<box.left-2;
    }).map(el=>el.textContent.trim().slice(0,70)||el.getAttribute('aria-label'));
  });assert.deepEqual(overflow,[],label+' content must fit');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true,label+' viewport must fit');
};
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]){
    await page.setViewportSize(viewport);await page.goto('http://localhost:5173');
    await page.locator('#garage-scene[data-engine="phaser"] canvas').waitFor();await page.waitForTimeout(1100);
    await fits('garage '+viewport.width);await page.screenshot({path:`tests/artifacts/game-garage-${viewport.width}.png`});
    await page.getByRole('button',{name:'Build details',exact:true}).click();await fits('build dialog');
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Build details',exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.getByRole('button',{name:/Collection/}).click();await fits('collection dialog');await page.keyboard.press('Escape');
    for(const [label,id] of [['Free race','race'],['Career','career'],['Dealership','dealership'],['Garage business','business'],['Upgrade & tune','tuning'],['Settings & controls','settings']]){
      await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(150);await fits(id+' '+viewport.width);
      while(await page.getByRole('button',{name:'Next page',exact:true}).isVisible().catch(()=>false)){
        const next=page.getByRole('button',{name:'Next page',exact:true});if(await next.isDisabled())break;await next.click();await fits(id+' next page '+viewport.width);
      }
      if(id==='tuning'){
        await page.getByRole('button',{name:'Engine dyno',exact:true}).click();await fits('dyno dialog');await page.keyboard.press('Escape');
        for(const tab of ['Tune & gearing','Appearance','Technical data']){
          await page.getByRole('button',{name:tab,exact:true}).click();await fits('tuning '+tab+' '+viewport.width);
          const detailTabs=page.locator('.section-tabs [role="tab"]');
          for(let i=0;i<await detailTabs.count();i++){await detailTabs.nth(i).click();await fits('tuning '+tab+' panel '+i+' '+viewport.width);}
        }
      }
      if(id==='settings')for(const name of ['Controls','Save data','About']){await page.getByRole('tab',{name,exact:true}).click();await fits('settings '+name+' '+viewport.width);}
      if(id==='business'){await page.getByRole('button',{name:'Manage shop',exact:true}).click();await fits('shop dialog');await page.keyboard.press('Escape');}
    }
    await page.getByRole('button',{name:'Free race',exact:true}).click();await page.getByRole('combobox',{name:'Distance',exact:true}).selectOption('18.288');
    await page.getByRole('button',{name:'Stage your car',exact:true}).click();await fits('race '+viewport.width);
    await page.getByRole('button',{name:'Stage & start',exact:true}).click();await page.locator('#result-title').waitFor({timeout:30000});await page.waitForTimeout(1200);
    await page.screenshot({path:`tests/artifacts/game-slip-${viewport.width}.png`});
    const slip=await page.locator('.slip-result').boundingBox();assert.ok(slip.y>=0&&slip.y+slip.height<=viewport.height,'slip fits viewport');
    assert.equal(await page.locator('.slip-row').count(),7);assert.match(await page.locator('.timing-slip').innerText(),/TOTAL \+ RT/);
    await page.getByRole('button',{name:'Back to garage',exact:true}).click();
  }
  // Check long-distance/prize slips and invalid runs without waiting on a full mile of driving.
  for(const kind of ['mile-prize','false-start','dnf']){
    await page.evaluate(async kind=>{
      const [{resultView},{freshSave},{buildCar},{createVehicle},{TRACKS}]=await Promise.all([
        import('/src/game-views.js'),import('/src/storage.js'),import('/src/physics.js'),import('/src/physics.js'),import('/src/data.js')]);
      const state=freshSave(),player=createVehicle(buildCar(state.cars[0])),opponent=createVehicle(buildCar(state.cars[0]));
      for(const car of [player,opponent])Object.assign(car,{started:true,finished:true,finishTime:32.123,trap:210,reaction:.12,splits:{'60ft':2.5,eighth:9,quarter:15,half:24,mile:32.123}});
      const result={won:kind==='mile-prize',falseStart:kind==='false-start',dnf:kind==='dnf',cash:350,rep:3,xp:25,personalBest:kind==='mile-prize',prize:kind==='mile-prize'?'Spectre V12':null};
      if(kind!=='mile-prize'){player.started=false;player.finished=false;player.finishTime=null;player.splits={};}
      document.getElementById('dialog-host').innerHTML=resultView(result,{player,opponent,distance:1609.344,track:TRACKS[0],weather:'Dry',time:'Night',event:{tier:'F'}},state);
    },kind);await page.waitForTimeout(1150);
    const slip=await page.locator('.slip-result').boundingBox();assert.ok(slip.y>=0&&slip.y+slip.height<=640,kind+' fits short phone');
    assert.doesNotMatch(await page.locator('.timing-slip').innerText(),/undefined|NaN|null/);
    if(kind==='mile-prize')assert.equal(await page.locator('.slip-row').count(),9);
    else assert.equal(await page.locator('.slip-et strong').first().innerText(),'—');
  }
  await page.locator('.slip-actions button').first().focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('.slip-actions button').last().evaluate(el=>el===document.activeElement),true,'result keeps keyboard focus');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.timing-slip').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.route('**/phaser-3.90.0.min.js',route=>route.abort());await page.goto('http://localhost:5173');await page.reload();
  await page.locator('.garage-fallback .car-art').waitFor();assert.equal(await page.locator('.garage-fallback').isVisible(),true,'engine failure retains the car and menus');
  assert.deepEqual(errors,[]);console.log('PASS: Phaser garage, viewport fit, menu pages, focus restoration, dialogs and animated timing slip at desktop and phone sizes.');
}finally{await context.close();await browser.close();}
