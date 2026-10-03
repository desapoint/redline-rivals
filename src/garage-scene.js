import { drawCar } from './graphics.js';

let enginePromise,game,observer,generation=0;
function loadEngine(){
  if(window.Phaser)return Promise.resolve(window.Phaser);
  if(!enginePromise)enginePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('./vendor/phaser-3.90.0.min.js',import.meta.url).href;
    script.onload=()=>resolve(window.Phaser);
    script.onerror=()=>{script.remove();enginePromise=null;reject(Error('Garage engine could not load'));};
    document.head.append(script);
  });
  return enginePromise;
}

export function unmountGarage(){
  generation++;observer?.disconnect();observer=null;
  if(game){game.destroy(true);game=null;}
}

export async function mountGarage(car){
  const current=++generation,host=document.getElementById('garage-scene');
  if(!host)return;
  try{
    const Phaser=await loadEngine();
    if(current!==generation||!host.isConnected)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    class GarageScene extends Phaser.Scene {
      create(){
        this.wall=this.textures.createCanvas('garage-wall',1600,900);
        this.environment=this.add.image(0,0,'garage-wall').setOrigin(0);
        this.carTexture=this.textures.createCanvas('garage-car',1200,440);
        this.vehicle=this.add.image(0,0,'garage-car').setOrigin(0);
        this.dust=Array.from({length:18},(_,i)=>this.add.circle(0,0,1+i%2,0xdaf3ed,.12));
        this.arrival={offset:reduced?0:35};
        if(!reduced)this.tweens.add({targets:this.arrival,offset:0,duration:950,ease:'Cubic.Out'});
        this.scale.on('resize',()=>this.layout());
        this.layout();host.closest('.garage-screen').classList.add('scene-ready');
        host.dataset.engine='phaser';
      }
      layout(){
        const w=this.scale.width,h=this.scale.height;
        const shortBay=w<650&&h<600;
        const ctx=this.wall.context;
        ctx.clearRect(0,0,1600,900);
        paintGarage(ctx,1600,900,w<650?(shortBay?.43:.55):.67);
        this.wall.refresh();this.environment.setDisplaySize(w,h);
        this.mobile=w<650;
        this.carWidth=Math.min(w*(this.mobile?1.03:.68),1150);
        this.carX=(w-this.carWidth)/2-(this.mobile?0:w*.035);
        this.carY=h*(this.mobile?(shortBay?.47:.58):.75)-this.carWidth*196/600;
        this.vehicle.setDisplaySize(this.carWidth,this.carWidth*440/1200);
        this.dust.forEach((p,i)=>p.setPosition(w*((i*.137)%1),h*(.23+(i*.093)% .47)));
      }
      update(time){
        // Repaint the cached car texture while the shared layered assets load.
        // Once populated, redraw only briefly at scene entry rather than uploading every frame forever.
        if(!this.paintedAt||time-this.paintedAt<2000){
          const ctx=this.carTexture.context;ctx.clearRect(0,0,1200,440);
          drawCar(ctx,car,0,0,1200);this.carTexture.refresh();
          if(!this.paintedAt)this.paintedAt=time;
        }
        this.vehicle.setPosition(this.carX+this.arrival.offset,this.carY);
        if(!reduced)this.dust.forEach((p,i)=>p.y=this.scale.height*(.25+((time*.000012+i*.041)% .45)));
      }
    }
    game=new Phaser.Game({type:Phaser.AUTO,parent:host,width:host.clientWidth,height:host.clientHeight,
      backgroundColor:'#11191b',banner:false,audio:{noAudio:true},input:{keyboard:false,mouse:false,touch:false},
      scene:GarageScene,fps:{target:30},render:{antialias:true},scale:{mode:Phaser.Scale.RESIZE}});
    observer=new ResizeObserver(()=>{if(game&&host.isConnected)game.scale.resize(host.clientWidth,host.clientHeight);});
    observer.observe(host);
  }catch(error){console.warn(error.message);}
}

function paintGarage(ctx,w,h,floorRatio){
  const wall=ctx.createLinearGradient(0,0,w,h);wall.addColorStop(0,'#152024');wall.addColorStop(.48,'#253330');wall.addColorStop(1,'#10181c');
  ctx.fillStyle=wall;ctx.fillRect(0,0,w,h);
  const floor=h*floorRatio;
  // Shutter, concrete seams, steel beams and fluorescent strips.
  ctx.fillStyle='#162325';ctx.fillRect(w*.22,h*.12,w*.53,floor-h*.12);
  for(let y=h*.15;y<floor;y+=h*.027){ctx.fillStyle='#31403e';ctx.fillRect(w*.225,y,w*.52,2);ctx.fillStyle='#101a1b';ctx.fillRect(w*.225,y+3,w*.52,2);}
  ctx.fillStyle='#0d1416';[.12,.21,.76,.9].forEach(x=>ctx.fillRect(w*x,0,16,floor));
  ctx.fillStyle='#64746a';[.21,.76].forEach(x=>ctx.fillRect(w*x+14,0,3,floor));
  const glow=ctx.createRadialGradient(w*.47,h*.29,0,w*.47,h*.29,w*.49);glow.addColorStop(0,'#b6d8b21a');glow.addColorStop(1,'#b6d8b200');ctx.fillStyle=glow;ctx.fillRect(0,0,w,floor);
  ctx.save();ctx.shadowColor='#c8f3db';ctx.shadowBlur=28;ctx.fillStyle='#cae8cd';ctx.fillRect(w*.29,h*.14,w*.39,5);ctx.restore();
  ctx.save();ctx.shadowColor='#ff713d';ctx.shadowBlur=18;ctx.fillStyle='#ff713d';ctx.fillRect(w*.12,h*.29,4,h*.29);ctx.restore();
  ctx.font='bold 110px monospace';ctx.fillStyle='#76897925';ctx.fillText('07',w*.79,h*.48);
  ctx.fillStyle='#13201b';ctx.fillRect(w*.81,h*.52,w*.11,h*.15);ctx.strokeStyle='#52634c';ctx.lineWidth=2;ctx.strokeRect(w*.81,h*.52,w*.11,h*.15);
  for(let i=1;i<4;i++){ctx.fillStyle='#3e4e42';ctx.fillRect(w*.82,h*(.52+i*.035),w*.09,2);ctx.fillStyle='#768776';ctx.fillRect(w*.855,h*(.52+i*.035)-7,25,2);}
  const ground=ctx.createLinearGradient(0,floor,0,h);ground.addColorStop(0,'#35403b');ground.addColorStop(.3,'#1c2827');ground.addColorStop(1,'#10181c');ctx.fillStyle=ground;ctx.fillRect(0,floor,w,h-floor);
  ctx.strokeStyle='#788e7730';ctx.lineWidth=2;
  for(let i=-5;i<=5;i++){ctx.beginPath();ctx.moveTo(w*.48+i*55,floor);ctx.lineTo(w*.48+i*330,h);ctx.stroke();}
  for(let i=1;i<6;i++){const y=floor+(h-floor)*(i/6)**1.8;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.strokeStyle='#da985337';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w*.24,floor+20);ctx.lineTo(w*.02,h);ctx.moveTo(w*.73,floor+20);ctx.lineTo(w*.98,h);ctx.stroke();
  const pool=ctx.createRadialGradient(w*.48,floor+40,10,w*.48,floor+40,w*.37);pool.addColorStop(0,'#aac79d17');pool.addColorStop(1,'#aac79d00');ctx.fillStyle=pool;ctx.fillRect(0,floor,w,h-floor);
}
