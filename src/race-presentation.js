// Presentation distances use real metres. They never write back to the simulation.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const wrap=(v,period)=>((v%period)+period)%period;

export function visibleDistance(vehicle,runClock){
  if(!vehicle.finished||!Number.isFinite(runClock)||!Number.isFinite(vehicle.finishTime))return vehicle.x;
  // Keep the winner coasting while the other lane finishes; timing still stops at the beam.
  return vehicle.x+Math.max(0,runClock-vehicle.finishTime-vehicle.reaction)*vehicle.v;
}

export function raceFrame(race,w,h){
  const p=race.player,mobile=w<650,single=!!race.hideOpponent;
  const length=(p.car.wheelbase||2.6)+1.5;
  const intensity=clamp(p.v/55,0,1),travel=visibleDistance(p,race.runClock);
  const opponentDistance=race.opponent?visibleDistance(race.opponent,race.runClock):null;
  const gap=single||opponentDistance===null?0:travel-opponentDistance;
  const baseWidth=Math.max(48,Math.min(w*(mobile?.49:.34),h*(single?1.3:.98),450));
  // Frame both lanes during a close race. A large lead can leave the frame, with an edge indicator.
  const metresToPixels=Math.min(baseWidth*.84/length,Math.max(1,w-28)/(length*1.1+Math.min(Math.abs(gap),20)));
  const carWidth=metresToPixels*length/.84;
  const nose=clamp(w*.5+carWidth*.42+gap*metresToPixels*.5-w*.02*intensity,carWidth*.95,w-14);
  const camera=travel*metresToPixels;
  const motion=!race.reducedMotion;
  const launch=p.started&&p.elapsed<.6?Math.sin(p.elapsed*33)*Math.exp(-p.elapsed*7)*clamp(p.acceleration/5,0,1):0;
  const shift=p.shiftTimer>0?Math.sin(clamp(1-p.shiftTimer/p.car.shiftTime,0,1)*Math.PI):0;
  const vibration=motion&&p.started&&!p.finished?Math.sin(race.clock*73)*intensity*.65:0;
  return {carWidth,metresToPixels,nose,camera,travel,intensity,
    pixelsPerSecond:p.v*metresToPixels,
    shakeX:motion?(launch*2.8-shift*2.4+vibration):0,
    shakeY:motion?(launch*1.3+shift*1.2+vibration*.45):0,
    pitch:motion?clamp(-p.acceleration*.0035,-.025,.02):0,
    trail:motion?clamp(p.v*metresToPixels/60*1.4,0,150):0,
    opponentDistance};
}
