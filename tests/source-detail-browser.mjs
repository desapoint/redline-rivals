import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const origin=process.env.REDLINE_TEST_ORIGIN||'http://localhost:5173/';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
const out='tests/artifacts/native-source-audit';await mkdir(out,{recursive:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:2});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'asset-preview.html');await page.waitForFunction(()=>document.querySelector('#art-choice')?.disabled===false);
  await page.locator('#geometry').uncheck();
  const records=await page.evaluate(async()=>{const p=await(await fetch('./src/assets/cars/manifest.json',{cache:'no-store'})).json();return Object.entries(p.cars).map(([id,r])=>({id,color:r.paintColor}));});
  assert.equal(records.length,12);
  for(const {id,color} of records){
   await page.selectOption('#art-choice',id);await page.selectOption('#body-view','assembled');
   await page.locator('#paint').evaluate((el,color)=>{el.value=color;el.dispatchEvent(new Event('input',{bubbles:true}));},color);
   await page.waitForFunction(id=>document.querySelector('#asset-canvas').dataset.artId===id,id);
   const result=await page.evaluate(async({id,color})=>{
    const {getCarSprite,layerImage}=await import('./src/car-assets.js');
    const {drawSprite,celPaintColor}=await import('./src/sprite-renderer.js');const {spriteLayout}=await import('./src/sprite-geometry.js');
    const r=getCarSprite({artId:id}),layout=spriteLayout(r),read=role=>{const c=document.createElement('canvas');c.width=r.width;c.height=r.height;c.getContext('2d').drawImage(layerImage(r.layers[role]),0,0);return c.getContext('2d').getImageData(0,0,c.width,c.height).data;};
    const body=read('body'),shade=read('shading'),fixtures=['fixtures','linework',...(r.layers.lights?['lights']:[])].map(read),points=[];
    for(let y=8;y<r.height-8;y+=3)for(let x=8;x<r.width-8;x+=3){const i=(y*r.width+x)*4;if(body[i+3]!==255||!shade[i+3]||[56,72,140].includes(shade[i+3])||fixtures.some(f=>f[i+3]))continue;if(points.length<20)points.push({x,y,i});}
    const c=document.createElement('canvas');c.width=r.width;c.height=r.height;const ctx=c.getContext('2d'),left=r.facing==='left';
    drawSprite(ctx,{artId:id,color},left?r.width+(layout.x-600)/layout.scale:-layout.x/layout.scale,-layout.y/layout.scale,600/layout.scale);
    const rgb=celPaintColor(color).slice(1).match(/../g).map(v=>parseInt(v,16));
    return {style:r.flatPaint.shadingStyle,blur:r.flatPaint.classificationBlurPixels,samples:points.map(p=>({actual:[...ctx.getImageData(left?r.width-1-p.x:p.x,p.y,1,1).data],expected:[...rgb.map((v,k)=>Math.round(v*(1-shade[p.i+3]/255)+shade[p.i+k]*shade[p.i+3]/255)),255]}))};
   },{id,color});
   assert.equal(result.style,'source-native-cel');assert.equal(result.blur,0);assert.equal(result.samples.length,20,id+' retains fine alpha variation');
   for(const p of result.samples)assert.ok(p.actual.every((v,i)=>Math.abs(v-p.expected[i])<=1),id+' native source alpha composes correctly');
   await page.locator('#asset-showroom').screenshot({path:`${out}/runtime-${id}-${viewport.width}.png`});
  }
  await page.goto(origin+'sprite-workbench.html');await page.waitForFunction(()=>window.spriteStudio?.project?.layers.length>0);
  for(const {id} of records){await page.selectOption('#library',id);await page.locator('#load-library').click();await page.waitForFunction(id=>window.spriteStudio.project.id===id&&window.spriteStudio.project.layers.some(l=>l.id==='body-shading'),id);}
  await page.screenshot({path:`${out}/studio-native-${viewport.width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.waitForTimeout(800);
  await page.evaluate(async()=>{
   const old=window.spriteStudio.project;old.manifest.runtimeProvenance.reviewFingerprint='0'.repeat(64);old.layers[0].locked=true;
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('redline-sprite-studio',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
   const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(old,'autosave');await new Promise(resolve=>{tx.oncomplete=resolve;});db.close();
  });
  await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Updated game artwork'));
  assert.ok(await page.evaluate(()=>window.spriteStudio.project.layers[0].locked),'older edited drafts remain intact');
  await page.close();
  console.log(`PASS: all twelve native-detail shaders and Sprite Studio imports at ${viewport.width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
