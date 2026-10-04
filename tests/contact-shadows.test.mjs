import test from 'node:test';
import assert from 'node:assert/strict';
import {spriteLayout,spriteContacts} from '../src/sprite-geometry.js';
test('transparent wheel padding cannot lift tires above their ground contact plane',()=>{
 const record={width:200,height:110,facing:'right',bounds:[0,0,200,110],wheels:[40,160].map((x,i)=>({axle:i?'front':'rear',x,y:75,radius:30,wheel:{pivot:[50,50],radius:40,contactY:82}}))};
 const layout=spriteLayout(record),points=spriteContacts(record);
 assert.ok(points.every(p=>Math.abs(p.y-196)<1e-9));
 assert.equal(points[0].x,layout.x+40*layout.scale);
 const left=spriteContacts({...record,facing:'left'});assert.equal(left[0].x,600-points[0].x);assert.equal(left[0].y,points[0].y);
 const replacement=record.wheels.map(w=>({...w,wheel:{...w.wheel,contactY:84}}));
 assert.ok(spriteContacts(record,replacement).every(p=>p.y>196),'component choices retain the body layout while moving their measured contacts');
});
