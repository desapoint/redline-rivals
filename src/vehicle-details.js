const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=values=>`<div class="dialog-grid vehicle-facts">${Object.entries(values).map(([key,value])=>`<div class="vehicle-fact"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`;
const known=(value,unit='')=>value==null?'Not verified':typeof value==='object'?`${value.min}–${value.max}${unit} / ${value.configuration}`:`${value}${unit}`;

export function factoryTemplate(c,id=`factory-${c.id}`){
  const f=c.manufacturerReference;if(!f)return '';
  const factory={
    'Vehicle':`${f.year} ${f.make} ${f.model} ${f.trim}`,
    'Body':f.body,
    'Power':f.power.map(p=>`${p.hp} HP${p.fuel?` / ${p.fuel}`:''}`).join(' · '),
    'Torque':f.torque.map(t=>`${t.lbFt} lb-ft${t.fuel?` / ${t.fuel}`:''}`).join(' · '),
    'Drivetrain':f.drivetrain,
    'Transmission':f.transmission.type,
    'Curb mass':known(f.curbMassKg,' kg'),
    'Redline':known(f.redlineRpm,' RPM'),
    'Tires':known(f.tireSize),
    'Wheelbase':known(f.wheelbaseMm,' mm'),
    'Gear ratios':f.transmission.ratios?.join(' / ')||'Not verified',
    'Final drive':f.transmission.finalDriveByGear?Object.entries(f.transmission.finalDriveByGear).map(([gear,ratio])=>`${gear}: ${ratio}`).join(' · '):known(f.transmission.finalDrive),
    'Drag coefficient':known(f.dragCoefficient),
    'Frontal area':known(f.frontalAreaM2,' m²')
  };
  return `<template id="${id}"><div class="vehicle-fact-sections"><section data-label="Factory">${cards(factory)}</section><section data-label="Simulation">${cards({'Power profile':c.fuelProfile||`${c.hp} HP / ${Math.round(c.torque)} Nm`,'Modeled mass':`${c.mass} kg`,'Modeled redline':`${c.redline} RPM`,'Modeled gearing':c.transmissionType==='cvt'?`CVT ${c.cvt.minRatio}–${c.cvt.maxRatio} / ${c.finalDrive} final drive`:`${c.ratios.length} gears / ${c.finalDrive} final drive`,'Model assumptions':c.modelAssumptions.join(' '),'Artwork':'Reviewed illustrated layers; factory paint names with approximate screen colors.','Economy':'Prices are game credits. Performance classes and times come from the simulation.'})}</section><section data-label="Sources"><div class="dialog-grid vehicle-sources">${f.sourceFieldMap.map((source,i)=>`<div class="vehicle-fact"><strong>${esc(i===0?'Manufacturer reference':`Specification source ${i+1}`)}</strong><span>${esc(source.fields.join('; '))}</span><a class="button secondary" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></div>`).join('')}</div></section></div></template>`;
}

export function realVehicleData(c,grades){
  const entries={'Engine':c.engine,'Drivetrain':c.drivetrainLabel||c.drive,'Build power':`${c.hp} HP`,'Build mass':`${Math.round(c.mass)} kg`,'Redline':`${c.redline} RPM`,'Transmission':c.transmissionType==='cvt'?'CVT':`${c.ratios.length}-speed automatic`,'Wheelbase':`${c.wheelbase} m`,'Tire radius':`${c.radius} m`,'Drag (modeled)':`${c.cd.toFixed(3)} Cd`,'Area (modeled)':`${c.area} m²`,'Efficiency (modeled)':`${Math.round(c.efficiency*100)}%`,'Power / weight':`${Math.round(c.hp/c.mass*1000)} HP/t`};
  return `<section class="panel"><div class="section-heading"><h2>Under the skin</h2><span class="tag">REAL VEHICLE / SIMULATION</span></div><h3>Performance grades</h3><div class="component-grades">${grades}</div><div class="technical-grid">${Object.entries(entries).map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div><p class="field-help">Factory specifications and simulation assumptions are stored separately. Quarter-mile estimates use dry Harbor Run asphalt and automatic transmission control.</p><div class="notice">${esc(c.fuelProfile)}<br>${esc(c.modelAssumptions.join(' '))}</div><button class="button secondary" data-dialog="factory-${c.id}">Factory specs & sources</button>${factoryTemplate(c)}</section>`;
}
