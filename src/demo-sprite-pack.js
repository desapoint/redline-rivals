// Geometry fixture only; this is not a real vehicle or a game catalog entry.
export const demoSpritePack={schemaVersion:1,cars:{
  'layer-demo':{width:900,height:300,bounds:[57,62,796,235],facing:'right',paintColor:'#e6603b',
    wheels:[{x:200,y:240,radius:55,axle:'rear'},{x:700,y:240,radius:55,axle:'front'}],
    layers:{body:{file:'demo/body.svg',width:900,height:300},paintMask:{file:'demo/paint-mask.svg',width:900,height:300},
      wheel:{file:'demo/wheel-open.svg',width:160,height:160,pivot:[80,80],radius:76},
      brake:{file:'demo/brake.svg',width:100,height:100,pivot:[50,50],radius:50},
      rotor:{file:'demo/rotor.svg',width:100,height:100,pivot:[50,50],radius:50}}
  }
},components:{wheels:{'demo-silver':{name:'Silver · six spokes',file:'demo/wheel.svg',width:120,height:120,pivot:[60,60],radius:57}},
  brakes:{'demo-gold':{name:'Gold caliper · offset pivot',file:'demo/brake-gold.svg',width:80,height:100,pivot:[40,50],radius:50}}}};
