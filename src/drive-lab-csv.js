const columns=[['time','time_s'],['speed','speed_kmh'],['rpm','engine_rpm'],['gear','gear'],['elapsed','elapsed_s'],['distance','distance_m'],['slip','wheel_slip_pct'],['boost','boost_bar'],['temperature','tire_temp_c'],['wear','tire_wear'],['stress','engine_stress'],['acceleration','acceleration_g'],['throttle','throttle_pct'],['clutch','clutch_pedal_pct'],['brake','brake_pct'],['torque','torque_nm'],['power','power_hp'],['reaction','reaction_s']];
export function telemetryCSV(records){
  return columns.map(([,header])=>header).join(',')+'\n'+records.map(record=>columns.map(([key])=>Number.isFinite(record[key])?record[key].toFixed(6):'').join(',')).join('\n');
}
