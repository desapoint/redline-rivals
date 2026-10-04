const origin=process.env.REDLINE_TEST_ORIGIN||'http://localhost:5173/';
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
    await page.goto(origin+'asset-preview.html?car=mazda3-gt-turbo-sedan-2021-red&layer=paint');
    await page.waitForFunction(()=>document.querySelector('#art-choice')?.disabled===false&&document.querySelector('#body-view')?.disabled===false);
    await page.locator('#geometry').uncheck();
    for(const id of Object.keys(pack.cars)){
      await page.locator('#art-choice').selectOption(id);await page.waitForFunction(()=>!document.querySelector('#art-choice').disabled);
      await page.locator('#body-view').selectOption('paint');
      for(const color of ['#000000','#ffffff','#009cff','#ff2bd6','#57e441']){
        await page.locator('#paint').evaluate((el,c)=>{el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}));},color);
        await page.waitForFunction(({id,color})=>{const canvas=document.querySelector('#asset-canvas');return canvas.dataset.artId===id&&canvas.dataset.bodyView==='paint'&&canvas.dataset.paint===color;},{id,color});
        const result=await page.evaluate(async({id,color})=>{
          const {getCarSprite}=await import('./src/car-assets.js');const {spriteLayout}=await import('./src/sprite-geometry.js');
          const record=getCarSprite({artId:id}),layout=spriteLayout(record),canvas=document.querySelector('#asset-canvas');
          const x=Math.round((layout.x+1000*layout.scale)*canvas.width/600),y=Math.round((layout.y+500*layout.scale)*canvas.width/600);
          const pixel=[...canvas.getContext('2d').getImageData(x,y,1,1).data];
          const svg=document.querySelector('#asset-showroom svg');
          return {pixel,fill:svg.querySelector('rect').getAttribute('fill'),images:[...svg.querySelectorAll('image')].map(i=>i.getAttribute('href'))};
        },{id,color});
        assert.deepEqual(result.pixel,[...color.slice(1).match(/../g).map(v=>parseInt(v,16)),255],id+' flat paint exactly accepts '+color);
        assert.equal(result.fill,color);assert.equal(result.images.length,1,'flat SVG base contains only its silhouette mask');
      }
      for(const role of ['shading','fixtures',...(pack.cars[id].layers.lights?['lights']:[]),'linework']){
        await page.locator('#body-view').selectOption(role);await page.waitForTimeout(30);
        const files=await page.locator('#asset-showroom image').evaluateAll(images=>images.map(image=>new URL(image.getAttribute('href')).pathname.split('/').at(-1)));
        assert.deepEqual(files,[role+'.webp'],id+' isolated '+role);
      }
      await page.locator('#body-view').selectOption('assembled');
      for(const color of pack.cars[id].flatPaint.shadingStyle==='cartoon-cel'?['#000000','#080a10','#202226']:[]){
        await page.locator('#paint').evaluate((el,c)=>{el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}));},color);
        await page.waitForFunction(({id,color})=>{const c=document.querySelector('#asset-canvas');return c.dataset.artId===id&&c.dataset.bodyView==='assembled'&&c.dataset.paint===color;},{id,color});
        const tones=await page.evaluate(async({id,color})=>{
          const {getCarSprite,layerImage}=await import('./src/car-assets.js');
          const {drawSprite,celPaintColor}=await import('./src/sprite-renderer.js');
          const {spriteLayout}=await import('./src/sprite-geometry.js');
          const record=getCarSprite({artId:id}),layout=spriteLayout(record);
          const read=role=>{const c=document.createElement('canvas');c.width=record.width;c.height=record.height;const ctx=c.getContext('2d');ctx.drawImage(layerImage(record.layers[role]),0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
          const base=read('body'),shade=read('shading'),protectedLayers=['fixtures','linework',...(record.layers.lights?['lights']:[])].map(read);
          const points=new Map();
          // Find solid panel interiors, clear of fixtures, ink and shape edges.
          for(let y=8;y<record.height-8;y+=4)for(let x=8;x<record.width-8;x+=4){
            const i=(y*record.width+x)*4,a=shade[i+3];
            if(![0,56,72,140].includes(a)||points.has(a))continue;
            if([-4,0,4].some(dy=>[-4,0,4].some(dx=>{const j=((y+dy)*record.width+x+dx)*4;return base[j+3]!==255||shade[j+3]!==a||protectedLayers.some(p=>p[j+3]>0);})))continue;
            points.set(a,{x,y,rgb:shade[i]});
          }
          const c=document.createElement('canvas');c.width=record.width;c.height=record.height;
          const ctx=c.getContext('2d');
          const left=record.facing==='left';
          drawSprite(ctx,{artId:id,color},left?record.width+(layout.x-600)/layout.scale:-layout.x/layout.scale,-layout.y/layout.scale,600/layout.scale);
          const lit=celPaintColor(color).slice(1).match(/../g).map(v=>parseInt(v,16));
          return {fill:document.querySelector('#asset-showroom rect').getAttribute('fill'),lit:celPaintColor(color),samples:[...points].map(([a,p])=>({alpha:a,pixel:[...ctx.getImageData(left?record.width-1-p.x:p.x,p.y,1,1).data],expected:[...lit.map(v=>Math.round(v*(1-a/255)+p.rgb*a/255)),255]}))};
        },{id,color});
        assert.equal(tones.fill,tones.lit,id+' SVG and Canvas use the same dark-paint lighting');
        assert.ok(tones.samples.some(s=>s.alpha===0)&&tones.samples.some(s=>s.alpha===72),id+' has lit and shadow panel samples');
        for(const sample of tones.samples)sample.pixel.forEach((v,i)=>assert.ok(Math.abs(v-sample.expected[i])<=1,id+' actual rendered cel tone '+sample.alpha));
        const lit=tones.samples.find(s=>s.alpha===0).pixel[0],shadow=tones.samples.find(s=>s.alpha===72).pixel[0];
        assert.ok(lit-shadow>=13,id+' pure/near-black paint keeps visible shadow contrast');
      }
      if(['chevrolet-silverado-1500-custom-crew-short-2025-black','mazda3-gt-turbo-sedan-2021-red','nissan-rogue-2020-red'].includes(id)){
        await page.locator('#paint').evaluate(el=>{el.value='#000000';el.dispatchEvent(new Event('input',{bubbles:true}));});
        await page.waitForFunction(()=>document.querySelector('#asset-canvas').dataset.paint==='#000000');
        await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/black-cel-${id}-${viewport.width}.png`});
      }
      const svg=await page.locator('#asset-showroom').innerHTML();assert.doesNotMatch(svg,/mix-blend-mode:color/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'layer inspector stays within viewport');
    }
    await page.locator('#art-choice').selectOption('chevrolet-silverado-1500-custom-crew-short-2025-black');await page.waitForFunction(()=>!document.querySelector('#art-choice').disabled);
    await page.locator('#paint').evaluate(el=>{el.value='#009cff';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.locator('#body-view').selectOption('linework');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-linework-${viewport.width}.png`});
    await page.locator('#body-view').selectOption('paint');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-base-${viewport.width}.png`});
    await page.locator('#body-view').selectOption('assembled');await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/flat-paint-assembled-${viewport.width}.png`});
    await page.locator('#body-view').selectOption('lights');
    await page.waitForFunction(()=>document.querySelector('#asset-canvas').dataset.bodyView==='lights');
    await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/silverado-lights-only-${viewport.width}.png`});
    for(const color of ['#ffffff','#ff2bd6']){
      await page.locator('#paint').evaluate((el,c)=>{el.value=c;el.dispatchEvent(new Event('input',{bubbles:true}));},color);
      await page.waitForFunction(color=>document.querySelector('#asset-canvas').dataset.paint===color,color);
      const lamp=await page.evaluate(async()=>{
        const {getCarSprite}=await import('./src/car-assets.js');const {spriteLayout}=await import('./src/sprite-geometry.js');
        const record=getCarSprite({artId:'chevrolet-silverado-1500-custom-crew-short-2025-black'}),layout=spriteLayout(record),canvas=document.querySelector('#asset-canvas');
        const x=Math.round((layout.x+2000*layout.scale)*canvas.width/600),y=Math.round((layout.y+620*layout.scale)*canvas.width/600);
        return {bumper:[...canvas.getContext('2d').getImageData(x,y,1,1).data],images:[...document.querySelectorAll('#asset-showroom image')].map(i=>new URL(i.getAttribute('href')).pathname.split('/').at(-1))};
      });
      assert.deepEqual(lamp.images,['lights.webp']);
      assert.ok(lamp.bumper[0]===lamp.bumper[1]&&lamp.bumper[1]===lamp.bumper[2]&&lamp.bumper[0]>100,'lights-only canvas leaves bumper transparent over checkerboard');
    }
    await page.locator('#body-view').selectOption('fixtures');
    await page.locator('#paint').evaluate(el=>{el.value='#000000';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>{const c=document.querySelector('#asset-canvas');return c.dataset.bodyView==='fixtures'&&c.dataset.paint==='#000000';});
    const trim=await page.evaluate(async()=>{
      const {getCarSprite}=await import('./src/car-assets.js'),{spriteLayout}=await import('./src/sprite-geometry.js');
      const record=getCarSprite({artId:'chevrolet-silverado-1500-custom-crew-short-2025-black'}),layout=spriteLayout(record),canvas=document.querySelector('#asset-canvas'),ctx=canvas.getContext('2d');
      return {files:[...document.querySelectorAll('#asset-showroom image')].map(i=>new URL(i.getAttribute('href')).pathname.split('/').at(-1)),pixels:[[225,608],[850,665],[1960,592],[2000,630]].map(([x,y])=>[...ctx.getImageData(Math.round((layout.x+x*layout.scale)*canvas.width/600),Math.round((layout.y+y*layout.scale)*canvas.width/600),1,1).data])};
    });
    assert.deepEqual(trim.files,['fixtures.webp']);
    for(const pixel of trim.pixels)assert.ok(pixel[0]===pixel[1]&&pixel[1]===pixel[2]&&pixel[0]>100,'fixed trim leaves painted bumpers and rocker transparent on checkerboard');
    await page.locator('#asset-showroom').screenshot({path:`tests/artifacts/silverado-fixed-trim-${viewport.width}.png`});
    await page.close();
    console.log(`PASS: exact paint / black and near-black cel contrast / isolated layers at ${viewport.width}px`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
