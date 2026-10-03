import { REAL_CARS } from './real-cars.js';
export const CLASSES = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
export const DISTANCES = [{name:'60 ft',value:18.288},{name:'⅛ mile',value:201.168},{name:'¼ mile',value:402.336},{name:'½ mile',value:804.672},{name:'1 mile',value:1609.344}];
export const TRACKS = [
  {id:'dock',name:'Harbor Run',description:'Portside asphalt. City lights. Your first proving ground.',surface:1,weather:'Dry',color:'#ff663f'},
  {id:'desert',name:'Desert Airfield',description:'Open skies and a sun-baked runway.',surface:0.94,weather:'Dry',color:'#e7ac6c'},
  {id:'strip',name:'Summit Raceway',description:'A prepared competition strip with serious traction.',surface:1.16,weather:'Dry',color:'#8c9eff'}
];
const car = (id,name,subtitle,hp,torque,mass,drive,redline,price,unlock,color,shape,aspiration='NA',extra={}) => ({
  id,name,subtitle,hp,torque,mass,drive,redline,price,unlock,color,shape,aspiration,
  engine: aspiration === 'Turbo' ? '2.0L turbo inline-4' : '2.0L inline-4',
  ratios:[3.6,2.19,1.54,1.21,1,0.82],finalDrive:4.1,radius:0.31,cd:0.32,area:2.1,wheelbase:2.6,
  shiftTime:0.32,efficiency:drive==='AWD'?0.80:drive==='FWD'?0.89:0.86,
  // Fictional curves: normalized RPM and torque fraction, never claimed as measured dyno data.
  curve: aspiration==='Turbo'?[[0.12,0.42],[0.28,0.64],[0.42,0.94],[0.6,1],[0.78,0.95],[0.9,0.81],[1,0.65]]:[[0.12,0.53],[0.3,0.75],[0.48,0.91],[0.65,1],[0.8,0.95],[0.92,0.82],[1,0.69]],
  ...extra
});
// Retained for save migration and simulation fixtures; excluded from the demo roster.
export const LEGACY_CARS = [
  car('roadster','Hikari Roadster','2016 · Lightweight roadster',155,201,1058,'RWD',6800,12500,1,'#4bc7bd','roadster','NA',{
    reference:{label:'2016 Mazda MX-5 · engineering reference',hp:155,torque:201,mass:1058,url:'https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf'},
    ratios:[5.087,2.991,2.035,1.594,1.286,1],finalDrive:2.866,area:1.8
  }),
  car('zenith','Zenith Z','2005 · Grand touring coupe',300,353,1470,'RWD',7500,32000,3,'#d2d5db','coupe','NA',{engine:'3.5L V6',finalDrive:3.54}),
  car('rally','Raijin XR','2015 · Rally-bred sedan',345,440,1480,'AWD',7500,48000,4,'#4676e5','sedan','Turbo',{engine:'2.5L turbo flat-4',finalDrive:3.7}),
  car('muscle','Stallion 5.0','2024 · American muscle',480,563,1710,'RWD',7500,68000,5,'#eaa147','muscle','NA',{
    engine:'5.0L V8',ratios:[3.25,2.23,1.61,1.24,1,0.63],finalDrive:3.73,radius:0.34,
    reference:{label:'2024 Ford Mustang GT · power reference',hp:480,url:'https://media.ford.com/content/fordmedia/fna/mx/es/news/2022/12/16/iho-ho-ho--el-nuevo-mustang-dark-horse-ofrece-500-caballos-de-fu.html'}
  }),
  car('apex','Apex R','2022 · Twin-turbo GT',620,760,1650,'AWD',8000,118000,6,'#dc5555','coupe','Turbo',{engine:'3.8L twin-turbo V6',shiftTime:0.10,finalDrive:3.3}),
  car('spectre','Spectre V12','2025 · Track special',780,850,1360,'RWD',9000,185000,7,'#bdadf2','super','NA',{engine:'6.5L V12',shiftTime:0.07,cd:0.28,finalDrive:3.1}),
  car('nova','Nova X','2026 · All-wheel hypercar',960,1100,1450,'AWD',8500,280000,8,'#b8e468','super','Turbo',{engine:'4.0L twin-turbo V8',shiftTime:0.06,cd:0.27,finalDrive:3.1})
];
// Factory compounds keep high-power cars usable before further upgrades.
export const CARS = REAL_CARS;
export const LEGACY_MODEL_REPLACEMENTS = Object.freeze({roadster:'vortex',zenith:'kaze',rally:'kaze',muscle:'metro',apex:'kaze',spectre:'vortex',nova:'kaze'});
export const CAREER_MODELS = ['rogue','vortex','vortex','kaze','rogue','metro','kaze'];
export const CAREER_PRIZES = ['metro','vortex','rogue','kaze','rogue','metro','kaze'];
const factoryTires={kaze:0,metro:0,roadster:0,vortex:1,rogue:0,zenith:1,rally:2,muscle:3,apex:3,spectre:3,nova:4};
[...CARS,...LEGACY_CARS].forEach(c=>{c.factoryTires=factoryTires[c.id]??c.factoryTires??0;});
export const PARTS = [
  {id:'intake',name:'Intake & exhaust',group:'Engine',icon:'↗',description:'Open up the airflow. A broader, stronger torque curve.',effect:'+8% torque / stage',baseCost:600,max:3},
  {id:'ecu',name:'ECU calibration',group:'Engine',icon:'⌘',description:'Fuel, ignition and a little more room at the top.',effect:'+7% torque · +150 RPM / stage',baseCost:900,max:3},
  {id:'turbo',name:'Forced induction',group:'Engine',icon:'◉',description:'Big power, more lag. Put grip on your shopping list.',effect:'+28% peak torque / stage · spool delay',baseCost:2800,max:4},
  {id:'internals',name:'Forged internals',group:'Engine',icon:'⚙',description:'Build the bottom end for high RPM and boost.',effect:'+10% torque · +200 RPM / stage',baseCost:2000,max:3},
  {id:'tires',name:'Tire compound',group:'Chassis',icon:'◎',description:'Street → performance → semi-slick → radial → slick.',effect:'More grip · higher wear at the limit',baseCost:850,max:4},
  {id:'weight',name:'Weight reduction',group:'Chassis',icon:'◇',description:'Interior, lightweight panels and a race conversion.',effect:'−6% factory mass / stage',baseCost:1200,max:4},
  {id:'suspension',name:'Drag suspension',group:'Chassis',icon:'≋',description:'Plant the driven wheels with controlled weight transfer.',effect:'+6% launch grip / stage',baseCost:1100,max:3},
  {id:'gearbox',name:'Race transmission',group:'Drivetrain',icon:'⑥',description:'Shorten torque interruption and unlock ratio tuning.',effect:'−23% shift time / stage',baseCost:1800,max:3},
  {id:'clutch',name:'Clutch & differential',group:'Drivetrain',icon:'⊕',description:'Hold more torque. Lock in traction.',effect:'+35% torque capacity · +3% grip / stage',baseCost:1400,max:3},
  {id:'aero',name:'Aero package',group:'Chassis',icon:'➝',description:'Reduce resistance on the long-distance strip.',effect:'−8% aerodynamic drag / stage',baseCost:1700,max:3}
];
export const TIRE_NAMES=['Street','Performance street','Semi-slick','Drag radial','Slick'];
export const DIFFICULTIES = {
  Beginner:{reaction:0.65,shiftOffset:-180,traction:0.9,launch:'auto',transmission:'auto',damage:'off'},
  Easy:{reaction:0.42,shiftOffset:-110,traction:0.7,launch:'auto',transmission:'auto',damage:'off'},
  Normal:{reaction:0.24,shiftOffset:-50,traction:0.4,launch:'assisted',transmission:'manual',damage:'reduced'},
  Hard:{reaction:0.13,shiftOffset:40,traction:0.15,launch:'manual',transmission:'manual',damage:'reduced'},
  Simulation:{reaction:0.075,shiftOffset:15,traction:0,launch:'manual',transmission:'clutch',damage:'full'}
};
export const RIVALS = ['Jules “First Light”','Mika “Redshift”','Noah “Night Owl”','Rei “Boost”','Cam “Big Block”','Alex “Apex”','Sol “Zero”'];
export const EVENTS = CLASSES.flatMap((tier,i)=>[
  {id:`${tier}-0`,tier,tierIndex:i,name:['First light','After hours','Street credentials','Boost district','Heavy hitters','Velocity club','Final frontier'][i],kind:'Qualification',opponent:i,distance:201.168,reward:900*(i+1)**2,rep:15*(i+1),restriction:null},
  {id:`${tier}-1`,tier,tierIndex:i,name:`${tier} / Open challenge`,kind:'Open race',opponent:i,distance:402.336,reward:1400*(i+1)**2,rep:20*(i+1),restriction:null},
  {id:`${tier}-2`,tier,tierIndex:i,name:['All-wheel beginnings','Lightweight legends','Frontline','All-wheel alliance','Naturally fast','Turbo territory','Unlimited'][i],kind:'Restricted event',opponent:i,distance:402.336,reward:1900*(i+1)**2,rep:25*(i+1),restriction:[{drive:'AWD'},{mass:1250},{drive:'FWD'},{drive:'AWD'},{aspiration:'NA'},{aspiration:'Turbo'},null][i]},
  {id:`${tier}-3`,tier,tierIndex:i,name:RIVALS[i],kind:'Rival showdown',opponent:i,distance:402.336,reward:2700*(i+1)**2,rep:40*(i+1),restriction:null,boss:true}
]);
export const JOBS = [
  {id:'show',name:'Cars & coffee',description:'Put a spare car on display for the local club.',duration:30*60*1000,reward:750,requirement:'Any car',test:()=>true},
  {id:'promo',name:'AWD promotional run',description:'A dealership needs an all-wheel-drive demonstrator.',duration:2*3600000,reward:3200,requirement:'AWD',test:c=>c.drive==='AWD'},
  {id:'dyno',name:'Dyno demonstration',description:'Show customers what 300 horsepower looks like.',duration:4*3600000,reward:7800,requirement:'300+ HP',test:c=>c.hp>=300}
];
export const BUSINESS_RATES=[100,180,300,500,800,1200];
export const BUSINESS_CAPS=[8,12,18,24,24,24];
