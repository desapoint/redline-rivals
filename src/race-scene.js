import { raceFrame, wrap } from './race-presentation.js';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function drawRaceScene(ctx,w,h,race,drawCar){
  if(w<=0||h<=0)return;
  const frame=raceFrame(race,w,h),day=race.time==='Day',desert=race.track.id==='desert',wet=race.weather==='Wet';
  const {camera,metresToPixels:scale,intensity,trail}=frame;
  const sky=ctx.createLinearGradient(0,0,0,h*.49);
  sky.addColorStop(0,day?'#3d6c83':desert?'#171e32':'#091321');sky.addColorStop(1,day?'#d0b997':desert?'#775b5b':'#4c454d');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(frame.shakeX,frame.shakeY);
  if(!day){
    ctx.fillStyle='#e5dfc8';ctx.beginPath();ctx.arc(w*.83,h*.12,Math.min(16,h*.05),0,Math.PI*2);ctx.fill();
    for(let i=0;i<28;i++){ctx.fillStyle=`rgba(211,228,231,${.13+(i%3)*.09})`;ctx.fillRect(wrap(i*197-camera*.001,w),h*(.05+(i%7)*.027),1,1);}
  }
  if(desert)mountains(ctx,w,h,camera);
  else buildings(ctx,w,h,camera,day);
  // The skyline barely moves; the roadside, pavement and near rail move at successively faster rates.
  ctx.fillStyle=day?'#575d5c':'#242c33';ctx.fillRect(-5,h*.41,w+10,h*.09);
  roadside(ctx,w,h,camera,scale,day,desert,trail);
  const asphalt=ctx.createLinearGradient(0,h*.48,0,h);
  asphalt.addColorStop(0,wet?'#253843':'#343b40');asphalt.addColorStop(.55,wet?'#132b38':'#20272e');asphalt.addColorStop(1,'#111b22');
  ctx.fillStyle=asphalt;ctx.fillRect(-5,h*.49,w+10,h*.53);
  ctx.fillStyle='#b4b7aa';ctx.fillRect(-5,h*.49,w+10,2);
  const spacing=12*scale,offset=wrap(camera-frame.nose,spacing);
  ctx.fillStyle=day?'#e5dacc':'#aaa999';
  for(let x=-spacing-offset;x<w+spacing;x+=spacing){
    ctx.fillRect(x,h*.745,4.2*scale,3);
    if(trail>8){ctx.fillStyle=`rgba(190,190,173,${intensity*.14})`;ctx.fillRect(x+4.2*scale,h*.745,trail,3);ctx.fillStyle=day?'#e5dacc':'#aaa999';}
  }
  pavement(ctx,w,h,camera,scale,intensity,trail,wet);
  timingBeams(ctx,w,h,race,frame);
  if(!race.hideOpponent){
    const rivalNose=frame.nose+(frame.opponentDistance-frame.travel)*scale;
    vehicle(ctx,race.opponent,rivalNose,h*.67,frame.carWidth*.94,false,race,frame,drawCar,wet);
    if(rivalNose<-35||rivalNose>w+35)rivalArrow(ctx,w,h,rivalNose,frame.opponentDistance-frame.travel);
  }
  vehicle(ctx,race.player,frame.nose,race.hideOpponent?h*.84:h*.935,frame.carWidth,true,race,frame,drawCar,wet);
  foreground(ctx,w,h,camera,scale,intensity,trail);
  if(wet){
    ctx.strokeStyle='rgba(180,220,231,.28)';ctx.lineWidth=1;
    for(let i=0;i<35;i++){const x=wrap(i*127-race.clock*(180+race.player.v*9),w),y=wrap(i*53+race.clock*350,h);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12+intensity*24,y-18);ctx.stroke();}
  }
  ctx.restore();
  if(intensity>.2){
    const vignette=ctx.createLinearGradient(0,0,w,0);
    vignette.addColorStop(0,`rgba(2,10,15,${intensity*.38})`);vignette.addColorStop(.23,'rgba(2,10,15,0)');vignette.addColorStop(.77,'rgba(2,10,15,0)');vignette.addColorStop(1,`rgba(2,10,15,${intensity*.32})`);
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
}

function buildings(ctx,w,h,camera,day){
  for(let layer=0;layer<2;layer++){
    const shift=camera*(layer?.023:.008),period=125,first=Math.floor(shift/period);
    for(let i=first-1;i<=first+Math.ceil(w/period)+1;i++){
      const x=i*period-shift,bh=h*(.08+wrap(i*71+layer*29,100)/600);
      ctx.fillStyle=layer?(day?'#42535d':'#1a2530'):(day?'#68727a':'#30313e');ctx.fillRect(x,h*.405-bh,110,bh);
      ctx.fillStyle=day?'#84948e':'#dbb078';
      for(let a=0;a<5;a++)for(let b=0;b<Math.floor(bh/18);b++)if(wrap(a+b+i,3)!==0){ctx.globalAlpha=day?.22:.45;ctx.fillRect(x+9+a*19,h*.405-bh+9+b*18,5,6);}
      ctx.globalAlpha=1;
    }
  }
  // Harbor cranes silhouette the distant port.
  const shift=wrap(camera*.012,550);
  ctx.strokeStyle=day?'#61717a':'#263643';ctx.lineWidth=3;
  for(let x=-shift;x<w+550;x+=550){ctx.beginPath();ctx.moveTo(x+70,h*.41);ctx.lineTo(x+70,h*.23);ctx.lineTo(x+160,h*.2);ctx.lineTo(x+220,h*.24);ctx.moveTo(x+158,h*.21);ctx.lineTo(x+158,h*.34);ctx.stroke();}
}
function mountains(ctx,w,h,camera){
  for(let layer=0;layer<3;layer++){
    ctx.fillStyle=['#66565d','#4a424e','#333840'][layer];ctx.beginPath();ctx.moveTo(-10,h*.44);
    for(let x=-20;x<w+100;x+=70)ctx.lineTo(x,h*(.26+layer*.045)-Math.sin((x+camera*(.004+layer*.005))/170+layer)*h*.045);
    ctx.lineTo(w+10,h*.46);ctx.lineTo(-10,h*.46);ctx.fill();
  }
}
function roadside(ctx,w,h,camera,scale,day,desert,trail){
  const shift=camera*.42,period=Math.max(100,scale*4),first=Math.floor(shift/period);
  ctx.fillStyle=day?'#87938b':'#465250';ctx.fillRect(-5,h*.445,w+10,h*.045);
  ctx.fillStyle=day?'#374645':'#14212a';ctx.fillRect(-5,h*.46,w+10,5);
  for(let i=first-1;i<first+w/period+2;i++){
    const x=i*period-shift;
    ctx.fillStyle=day?'#45594f':'#b9c5a0';ctx.fillRect(x,h*.444,3,h*.045);
    ctx.fillStyle=i%2?'#ff7750':'#d1edb5';ctx.fillRect(x+6,h*.447,10,4);
    if(trail>8){ctx.fillStyle=`rgba(234,210,154,${trail/900})`;ctx.fillRect(x+16,h*.447,trail*.75,4);}
    if(w>600&&i%3===0){ctx.fillStyle='#223531';ctx.fillRect(x+24,h*.401,90,h*.038);ctx.font=`italic bold ${Math.max(7,h*.022)}px monospace`;ctx.fillStyle='#b3cba4';ctx.fillText('REDLINE',x+31,h*.427);}
  }
  const lampPeriod=Math.max(190,scale*18*.13),lampShift=camera*.13;
  for(let i=Math.floor(lampShift/lampPeriod)-1;i<lampShift/lampPeriod+w/lampPeriod+1;i++){
    const x=i*lampPeriod-lampShift;
    ctx.fillStyle=day?'#657875':'#697879';ctx.fillRect(x,h*.21,3,h*.235);ctx.fillRect(x,h*.21,38,3);
    if(!day){ctx.fillStyle=desert?'#e3b780':'#f3dfaf';ctx.fillRect(x+31,h*.21,12,4);ctx.fillStyle='#ebd3a90b';ctx.beginPath();ctx.moveTo(x+35,h*.22);ctx.lineTo(x-25,h*.445);ctx.lineTo(x+100,h*.445);ctx.fill();}
  }
}
function pavement(ctx,w,h,camera,scale,intensity,trail,wet){
  const period=8*scale;
  for(let i=0;i<27;i++){
    const x=wrap(i*137-camera*(.72+i%3*.14),w+period)-period,y=h*(.53+wrap(i*41,42)/100);
    ctx.fillStyle=wet?'rgba(181,221,225,.09)':'rgba(154,173,175,.08)';
    ctx.fillRect(x,y,14+(i%5)*12+trail*(.3+i%3*.15),i%4===0?2:1);
  }
  if(trail<5)return;
  ctx.strokeStyle=`rgba(155,213,218,${intensity*.11})`;ctx.lineWidth=1;
  for(let i=0;i<12;i++){
    const y=h*(.52+i*.038),x=wrap(i*251-camera*(.65+i*.035),w+240)-120;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+trail*(.5+i*.09),y);ctx.stroke();
  }
}
function timingBeams(ctx,w,h,race,frame){
  const {metresToPixels:scale,camera,nose}=frame;
  for(const mark of [0,18.288,201.168,402.336,804.672,1609.344]){
    if(mark>race.distance+.01)continue;
    const x=mark*scale-camera+nose;
    if(x<-scale||x>w+scale)continue;
    const finish=Math.abs(mark-race.distance)<.1;
    if(mark===0||finish){
      const square=Math.max(7,Math.min(18,scale*.2)),rows=Math.ceil(h*.52/square);
      for(let r=0;r<rows;r++)for(let a=0;a<2;a++){ctx.fillStyle=(r+a)%2?'#ece7d0':'#132129';ctx.fillRect(x+a*square,h*.49+r*square,square,square);}
      if(finish){ctx.fillStyle='#d6eac6';ctx.fillRect(x,h*.31,3,h*.18);ctx.font=`bold ${Math.max(10,h*.034)}px monospace`;ctx.fillText('FINISH',x+8,h*.35);}
    }else{
      ctx.fillStyle='#faab6b';ctx.fillRect(x,h*.45,4,h*.035);ctx.font=`bold ${Math.max(9,h*.026)}px monospace`;ctx.fillText(mark<20?'60 FT':mark<300?'⅛ MILE':mark<600?'¼ MILE':'½ MILE',x+8,h*.455);
    }
  }
}
function vehicle(ctx,s,nose,baseline,size,isPlayer,race,frame,drawCar,wet){
  if(nose<-size*.2||nose>wFor(ctx)+size)return;
  const left=nose-size*.91,top=baseline-size*196/600;
  if(s.started&&s.slip>.1&&!s.finished){
    const smoke=Math.min(1,s.slip),clock=race.clock;
    for(let i=0;i<6;i++){
      const drift=wrap(clock*40+i*13,80),x=left+size*.22-drift,y=baseline-7-drift*.12;
      ctx.fillStyle=`rgba(203,218,211,${smoke*(1-drift/95)*.12})`;ctx.beginPath();ctx.ellipse(x,y,10+drift*.32,7+drift*.19,0,0,Math.PI*2);ctx.fill();
    }
  }
  if(s.v>8){
    ctx.fillStyle=isPlayer?'rgba(255,108,60,.22)':'rgba(134,188,216,.14)';ctx.fillRect(left+size*.10-frame.trail*.6,top+size*.235,frame.trail*.6+3,2);
    if(wet){ctx.fillStyle='rgba(133,200,216,.18)';ctx.beginPath();ctx.ellipse(left+size*.21-frame.trail*.22,baseline-2,Math.max(5,frame.trail*.38),3,0,0,Math.PI*2);ctx.fill();}
  }
  ctx.save();ctx.translate(left+size*.5,baseline-size*.10);
  const pitch=isPlayer?frame.pitch:(!race.reducedMotion?clamp(-s.acceleration*.0035,-.025,.02):0);
  ctx.rotate(pitch);drawCar(ctx,s.car,-size*.5,-size*(196/600-.10),size,s.wheelRotation);ctx.restore();
  if(s.v>12){
    ctx.strokeStyle=`rgba(181,193,185,${clamp(s.v/80,0,.38)})`;ctx.lineWidth=2;
    for(const axle of [.225,.775]){ctx.beginPath();ctx.arc(left+size*axle,baseline-size*35/600,size*24/600,0,Math.PI*2);ctx.stroke();}
  }
  ctx.font=`bold ${Math.max(8,size*.027)}px monospace`;ctx.fillStyle=isPlayer?'#f5ca9c':'#c0d3db';
  ctx.fillText(isPlayer?'YOU':(race.opponentName||s.car.name).split(' ')[0].toUpperCase(),left+size*.18,top+size*.04);
  if(isPlayer){ctx.fillStyle='#ff7746';ctx.fillRect(left+size*.39,baseline+5,size*.15,2);}
}
function wFor(ctx){return ctx.canvas.width/(ctx.getTransform?.().a||1);}
function rivalArrow(ctx,w,h,nose,gap){
  const ahead=nose>w,x=ahead?w-14:14;
  ctx.fillStyle='#bdd3d9';ctx.beginPath();ctx.moveTo(x,h*.595);ctx.lineTo(x+(ahead?-10:10),h*.595-6);ctx.lineTo(x+(ahead?-10:10),h*.595+6);ctx.fill();
  ctx.textAlign=ahead?'right':'left';ctx.font='bold 9px monospace';ctx.fillText(`RIVAL ${Math.abs(gap).toFixed(1)} M`,x+(ahead?-16:16),h*.59);ctx.textAlign='left';
}
function foreground(ctx,w,h,camera,scale,intensity,trail){
  ctx.fillStyle='#c5c7b3';ctx.fillRect(-5,h*.987,w+10,2);
  const period=4*scale,offset=wrap(camera*1.18,period);
  for(let x=-period-offset;x<w+period;x+=period){
    ctx.fillStyle='#526968';ctx.fillRect(x,h*.99,7,h*.02);
    if(trail>8){ctx.fillStyle=`rgba(175,207,181,${intensity*.15})`;ctx.fillRect(x+7,h*.993,trail,2);}
  }
}
