import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.REDLINE_PLAYWRIGHT_PATH||'playwright');
const pack=JSON.parse(readFileSync(new URL('../src/assets/cars/manifest.json',import.meta.url),'utf8'));
assert.ok(Object.values(pack.cars).every(record=>record.paintMode==='flat-cel'),'every production car uses the independent body stack');
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
mkdirSync('tests/artifacts',{recursive:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:2});page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5173/asset-preview.html?car=mazda3-gt-turbo-sedan-2021-red&layer=paint');
    await page.waitForFunction(()=>document.querySelector('#art-choice')?.disabled===false&&document.querySelector('#body-view')?.disabled===false);
    await page.locator('#geometry').uncheck();
    for(const id of Object.keys(pack.cars)){
      await page.locator('#art-choice').selectOption(id);await page.waitForFunction(()=>!document.querySelector('#art-choice').disabled);
      await page.locator('#body-view').selectOption('paint');
      for(const color of ['#000000','#ffffff','#009cff','#ff2bd6','#57e441']){
        await page.locator('#paint').evaluate((el,c)=>{el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}));},color);
        await page.waitForFunction(({id,color})=>{const canvas=document.querySelector('#asset-canvas');return canvas.dataset.artId===id&&canvas.dataset.bodyView==='paint'&&canvas.dataset.paint===color;},{id,color});
        const result=await page.evaluate(async({id,color})=>{
          const {getCarSprite}=await import('/src/car-assets.js');const {spriteLayout}=await import('/src/sprite-geometry.js');
          const record=getCarSprite({artId:id}),layout=spriteLayout(record),canvas=document.querySelector('#asset-canvas');
          const x=Math.round((layout.x+1000*layout.scale)*canvas.width/600),y=Math.round((layout.y+500*layout.scale)*canvas.width/600);
          const pixel=[...canvas.getContext('2d').getImageData(x,y,1,1).data];
          const svg=document.querySelector('#asset-showroom svg');
          return {pixel,fill:svg.querySelector('rect').getAttribute('fill'),images:[...svg.querySelectorAll('image')].map(i=>i.getAttribute('href'))};
        },{id,color});
        assert.deepEqual(result.pixel,[...color.slice(1).match(/../g).map(v=>parseInt(v,16)),255],id+' flat paint exactly accepts '+color);
        assert.equal(result.fill,color);assert.equal(result.images.length,1,'flat SVG base contains only its silhouette mask');
      }
      for(const role of ['shading','fixtures','linework']){
        await page.locator('#body-view').selectOption(role);await page.waitForTimeout(30);
        const files=await page.locator('#asset-showroom image').evaluateAll(images=>images.map(image=>image.getAttribute('href').split('/').at(-1)));
        assert.deepEqual(files,[role+'.webp'],id+' isolated '+role);
      }
      await page.locator('#body-view').selectOption('assembled');
      const svg=await page.locator('#asset-showroom').innerHTML();assert.doesNotMatch(svg,/mix-blend-mode:color/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'layer inspector stays within viewport');
    }
    await page.locator('#art-choice').selectOption('chevrolet-silverado-1500-custom-crew-short-2025-black');await page.waitForFunction(()=>!document.querySelector('#art-choice').disabled);
    await page.locator('#paint').evaluate(el=>{el.value='#009cff';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#body-view').selectOption('linework');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-linework-${viewport.width}.png`});
    await page.locator('#body-view').selectOption('paint');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-base-${viewport.width}.png`});
    await page.locator('#body-view').selectOption('assembled');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-assembled-${viewport.width}.png`});
    await page.close();
    console.log(`PASS: flat paint / exact arbitrary colors / isolated grayscale, fixtures and line art at ${viewport.width}px`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
