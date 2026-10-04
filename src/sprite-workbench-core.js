// Pure selection and export helpers, independent of the editor UI.
export function connectedColor(image, x, y, tolerance = 30, contiguous = true) {
  const {width:w,height:h,data:d}=image, n=w*h, mask=new Uint8Array(n);
  x=Math.floor(x); y=Math.floor(y); if(x<0||y<0||x>=w||y>=h)return mask;
  const seed=(y*w+x)*4, color=Array.from(d.slice(seed,seed+4));
  const match=i=>{const p=i*4;return Math.abs(d[p+3]-color[3])<=tolerance && (color[3]<8 || Math.hypot(d[p]-color[0],d[p+1]-color[1],d[p+2]-color[2])/Math.sqrt(3)<=tolerance);};
  if(!contiguous){for(let i=0;i<n;i++)if(match(i))mask[i]=255;return mask;}
  const seen=new Uint8Array(n),queue=new Int32Array(n);let read=0,end=1;queue[0]=y*w+x;seen[queue[0]]=1;
  const add=i=>{if(!seen[i]){seen[i]=1;if(match(i))queue[end++]=i;}};
  while(read<end){const i=queue[read++];mask[i]=255;const col=i%w;if(col)add(i-1);if(col<w-1)add(i+1);if(i>=w)add(i-w);if(i<n-w)add(i+w);}
  return mask;
}
// Snap to a nearby color/alpha boundary. Distance penalty keeps the gesture local.
export function magneticPoint(image,x,y,radius=12) {
  const {width:w,height:h,data:d}=image;let best=-Infinity,point=[Math.round(x),Math.round(y)];
  const delta=(a,b)=>Math.hypot(d[a]-d[b],d[a+1]-d[b+1],d[a+2]-d[b+2],d[a+3]-d[b+3]);
  for(let py=Math.max(1,Math.round(y-radius));py<Math.min(h-1,y+radius);py++)for(let px=Math.max(1,Math.round(x-radius));px<Math.min(w-1,x+radius);px++){
    const distance=Math.hypot(px-x,py-y);if(distance>radius)continue;const p=(py*w+px)*4;
    const edge=Math.max(delta(p-4,p+4),delta(p-w*4,p+w*4));const score=edge-distance*12;
    if(score>best){best=score;point=[px,py];}
  }return point;
}
export function combineMask(current,next,mode='replace') {
  if(!current||mode==='replace')return next;
  return next.map((v,i)=>mode==='add'?Math.max(v,current[i]):mode==='subtract'?Math.max(0,current[i]-v):Math.min(v,current[i]));
}
export function safePath(path) {return typeof path==='string'&&/^(?:[a-zA-Z0-9_. -]+\/)*[a-zA-Z0-9_. -]+$/.test(path)&&!path.split('/').some(p=>p==='..'||p==='.');}
export function validateManifest(m,requireFull=true) {
  const errors=[],finite=Number.isFinite;
  if(m?.schemaVersion!==1)errors.push('Unsupported manifest schema.');
  if(!m?.vehicle?.id || !/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(m.vehicle.id))errors.push('Use a vehicle ID containing letters, numbers, hyphens or underscores.');
  if(!['left','right'].includes(m?.vehicle?.facing))errors.push('Choose a facing direction.');
  if(!Number.isInteger(m?.revision)||m.revision<1)errors.push('Revision must be a positive integer.');
  if(![m?.canvas?.width,m?.canvas?.height].every(v=>Number.isInteger(v)&&v>0&&v<=8192)||m.canvas.width*m.canvas.height>32e6)errors.push('Canvas must be positive integers, up to 8192 per side and 32 million pixels.');
  for(const name of ['rearWheel','frontWheel']){const a=m?.anchors?.[name];if(!a||![a.x,a.y,a.radius].every(finite)||a.radius<=0||a.x<0||a.y<0||a.x>m?.canvas?.width||a.y>m?.canvas?.height)errors.push(`${name}: valid center and radius required.`);}
  const rawLayers=Array.isArray(m?.layers)?m.layers:[], layers=rawLayers.filter(l=>l&&typeof l==='object'), ids=new Set();if(rawLayers.length!==layers.length)errors.push('Layers must be objects.');
  for(const l of layers){if(ids.has(l.id))errors.push(`Duplicate layer ${l.id}.`);ids.add(l.id);
    if(!/^[a-z0-9][a-z0-9_-]*$/i.test(l.id)||!safePath(l.file)||!finite(l.z))errors.push(`${l.id}: invalid ID, path or depth.`);
    const p=l.placement;
    if(p?.mode==='canvas'){if(![p.x,p.y].every(finite))errors.push(`${l.id}: invalid position.`);}
    else if(p?.mode==='anchor'){if(!m?.anchors?.[p.anchor]||!finite(p.scale)||p.scale<=0||!Array.isArray(p.offset)||p.offset.length!==2||!p.offset.every(finite)||!Array.isArray(p.pivotNormalized)||p.pivotNormalized.length!==2||!p.pivotNormalized.every(v=>finite(v)&&v>=0&&v<=1))errors.push(`${l.id}: invalid hub, scale or pivot.`);}
    else errors.push(`${l.id}: choose canvas or anchor placement.`);
    if(/-(wheel|rotor)$/.test(l.id)&&l.rotateWithWheel!==true)errors.push(`${l.id} must rotate.`);
    if(/-caliper$/.test(l.id)&&l.rotateWithWheel!==false)errors.push(`${l.id} must stay stationary.`);
  }
  if(requireFull){for(const id of ['car-underlay',...['rear','front'].flatMap(a=>['wheel','rotor','caliper'].map(p=>`${a}-${p}`))])if(!ids.has(id))errors.push(`Missing ${id}.`);
  if(!['body-paint','body-exterior','body-shell','body'].some(id=>ids.has(id)))errors.push('Missing exterior body.');}
  for(const axle of ['rear','front']){const wheel=layers.find(l=>l.id===`${axle}-wheel`),rotor=layers.find(l=>l.id===`${axle}-rotor`);if(wheel&&rotor&&(wheel.placement?.anchor!==rotor.placement?.anchor||JSON.stringify(wheel.placement?.offset)!==JSON.stringify(rotor.placement?.offset)))errors.push(`${axle}: rotor and wheel must share a hub.`);
    const order=['car-underlay',`${axle}-rotor`,`${axle}-caliper`,`${axle}-wheel`].map(id=>layers.find(l=>l.id===id));for(let i=1;i<order.length;i++)if(order[i]&&order[i-1]&&order[i].z<=order[i-1].z)errors.push(`${axle}: depth must be underlay < rotor < caliper < wheel.`);
    for(const body of layers.filter(l=>['body-paint','body-exterior','body-shell','body'].includes(l.id)))if(wheel&&body.z<=wheel.z)errors.push(`${body.id}: body must be above wheels.`);
  }
  return errors;
}
export function crc32(bytes) {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^(0xedb88320&-(crc&1));}return (crc^0xffffffff)>>>0;}
// Stored ZIP entries, UTF-8 filenames; PNGs are already compressed.
export function zipFiles(files) {
  const enc=new TextEncoder(),parts=[],central=[];let offset=0,size=0;
  for(const [name,input] of files){if(!safePath(name))throw Error('Unsafe archive path');const data=typeof input==='string'?enc.encode(input):input,filename=enc.encode(name),crc=crc32(data);
    const local=new Uint8Array(30+filename.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);local.set(filename,30);
    parts.push(local,data);const c=new Uint8Array(46+filename.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);c.set(filename,46);central.push(c);size+=c.length;offset+=local.length+data.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
