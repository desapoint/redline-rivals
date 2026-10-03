import { REAL_CAR_SPECS } from './real-car-specs.js';
import { ADDITIONAL_REAL_CARS } from './additional-cars.js';

const mazdaId='mazda3-gt-turbo-sedan-2021-red';
const truckId='chevrolet-silverado-1500-custom-crew-short-2025-black';
const kiaId='kia-forte-gt-sedan-2022-orange',rogueId='nissan-rogue-2020-red';
// Equivalent ratios preserve each DCT gear's actual overall reduction in a single-final-drive simulation.
const kiaTransmission=REAL_CAR_SPECS[kiaId].manufacturerReference.transmission;
const kiaRatios=kiaTransmission.ratios.map((ratio,i)=>ratio*kiaTransmission.finalDriveByGear[i+1]/4.643);
const nm=lbFt=>lbFt*1.3558179483;
function researched(id,redline,endTorque){
  const data=REAL_CAR_SPECS[id],factory=data.manufacturerReference,points=data.gameplayModel.torqueCurve;
  const torque=nm(factory.torque[0].lbFt);
  const curve=points.rpm.map((rpm,i)=>[rpm/redline,nm(points.lbFt[i])/torque]);
  // Extend the estimated curve to the limiter; this tail is not measured dyno data.
  if(points.rpm.at(-1)<redline)curve.push([1,nm(endTorque)/torque]);
  return {artId:id,vehicleRevision:1,manufacturerReference:factory,curve,torque,
    reference:{label:`${factory.year} ${factory.make} ${factory.model} ${factory.trim}`,hp:factory.power[0].hp,torque:Math.round(torque),mass:factory.curbMassKg,url:factory.sourceFieldMap[0].url},
    modelAssumptions:['Torque curve, grip, drivetrain loss, shift time and aero are simulation estimates.']};
}

// Original gameplay IDs retain owned cars, records, jobs and career reward links.
export const REAL_CARS=[
  {id:'kaze',name:'Mazda3 GT Turbo',subtitle:'2021 · Canadian AWD sedan',hp:250,mass:1533,drive:'AWD',redline:6300,price:0,unlock:0,
    color:'#a91f2c',shape:'sedan',aspiration:'Turbo',engine:'2.5L turbo inline-4',factoryTires:0,
    ratios:[3.487,1.992,1.449,1,.707,.6],finalDrive:3.583,radius:.32535,wheelbase:2.726,
    cd:.30,area:2.2,efficiency:.80,shiftTime:.28,...researched(mazdaId,6300,180),
    fuelProfile:'93 octane · 250 HP / 434 Nm',
    legacyDefaults:{color:'#e6603b',finalDrive:4.1,launchRPM:3300,ratios:[3.6,2.19,1.54,1.21,1,.82]}},
  {id:'metro',name:'Silverado 1500 Custom',subtitle:'2025 · Crew Cab / Short Bed',hp:310,mass:2250,drive:'AWD',drivetrainLabel:'4WD · modeled',redline:6200,price:6800,unlock:0,
    color:'#202226',shape:'pickup',aspiration:'Turbo',engine:'2.7L TurboMax inline-4',factoryTires:0,
    ratios:[4.56,2.97,2.08,1.69,1.27,1,.85,.65],finalDrive:3.42,radius:.395,wheelbase:3.734,
    cd:.45,area:3.3,efficiency:.78,shiftTime:.30,...researched(truckId,6200,250),
    modelAssumptions:['4WD is provisional; modeled as driving both axles in this drag simulation.','Mass (2,250 kg), redline (6,200 RPM), ratios, final drive, tire radius, losses, aero and shift time are gameplay estimates; factory values are unverified.','Torque curve is estimated from the researched 310 HP / 430 lb-ft rating.'],
    legacyDefaults:{color:'#e5bc47',finalDrive:4.1,launchRPM:3500,ratios:[3.6,2.19,1.54,1.21,1,.82]}},
  {id:'vortex',name:'Kia Forte GT',subtitle:'2022 · 1.6T / 7-speed DCT',hp:201,mass:1380,drive:'FWD',redline:6500,price:8500,unlock:0,
    color:'#ef721b',shape:'sedan',aspiration:'Turbo',engine:'1.6L turbo inline-4',factoryTires:1,
    ratios:kiaRatios,finalDrive:4.643,radius:.3186,wheelbase:2.7,cd:.30,area:2.15,efficiency:.89,shiftTime:.14,
    ...researched(kiaId,6500,160),fuelProfile:'Regular fuel · 201 HP / 264 Nm',
    modelAssumptions:['The 7DCT uses two final drives. Equivalent gear ratios preserve factory overall reductions against a 4.643 reference final drive.','Mass is modeled at 1,380 kg within the sourced 1,366–1,397 kg GT DCT range. Redline (6,500 RPM), shift time, aero, losses, grip and torque curve are estimates.','Orange Delight is the requested illustrated color; exact Canadian GT Limited color pairing is unverified.'],
    legacyDefaults:{color:'#81abff',finalDrive:4.1,launchRPM:3200,ratios:[3.6,2.19,1.54,1.21,1,.82]}},
  {id:'rogue',name:'Nissan Rogue',subtitle:'2020 · T32 / SV AWD provisional',hp:170,mass:1620,drive:'AWD',drivetrainLabel:'AWD · provisional',redline:6500,price:6200,unlock:0,
    color:'#a92331',shape:'suv',aspiration:'NA',engine:'2.5L naturally aspirated inline-4',factoryTires:0,
    transmissionType:'cvt',ratios:[],cvt:{minRatio:.5,maxRatio:2.6,targetRPM:6000,response:8},finalDrive:5.1,
    radius:.36215,wheelbase:2.706,cd:.35,area:2.7,efficiency:.80,shiftTime:0,
    ...researched(rogueId,6500,135),fuelProfile:'Regular fuel · 170 HP / 237 Nm',
    modelAssumptions:['SV AWD is provisional. Mass (1,620 kg), redline (6,500 RPM), final drive (5.1) and CVT ratio range (0.5–2.6) are simulation estimates; factory values remain unknown.','The continuous-ratio model holds an estimated 6,000 RPM power target under full throttle; Nissan D-Step behavior is not reproduced. There are no fabricated fixed gears.','Torque curve, aero, losses and grip are estimated. Tire radius uses the researched base SV P225/65R17 tire.']}
 ,...ADDITIONAL_REAL_CARS
];
