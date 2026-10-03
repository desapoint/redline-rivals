export class EngineAudio {
  constructor(){this.context=null;this.osc=null;this.gain=null;}
  start(){
    try{
      if(!this.context){
        const context=this.context=new (window.AudioContext||window.webkitAudioContext)();
        this.gain=context.createGain();this.gain.gain.value=0;this.gain.connect(context.destination);
        this.engine=context.createGain();this.engine.gain.value=0;this.engine.connect(this.gain);
        this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=650;this.filter.Q.value=.65;this.filter.connect(this.engine);
        this.osc=context.createOscillator();this.osc.type='sawtooth';this.osc.connect(this.filter);this.osc.start();
        this.sub=context.createOscillator();this.sub.type='triangle';
        const subGain=context.createGain();subGain.gain.value=.55;this.sub.connect(subGain);subGain.connect(this.filter);this.sub.start();
        this.harmonic=context.createOscillator();this.harmonic.type='sine';
        const harmonicGain=context.createGain();harmonicGain.gain.value=.25;this.harmonic.connect(harmonicGain);harmonicGain.connect(this.filter);this.harmonic.start();
        // Air/tire noise grows with speed and stays audible through the shift's torque cut.
        const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
        let previous=0;for(let i=0;i<data.length;i++){previous=previous*.72+(Math.random()*2-1)*.28;data[i]=previous;}
        this.wind=context.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;
        this.windFilter=context.createBiquadFilter();this.windFilter.type='highpass';this.windFilter.frequency.value=300;
        this.windGain=context.createGain();this.windGain.gain.value=0;
        this.wind.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.gain);this.wind.start();
      }
      this.context.resume()?.catch(()=>{});
    }catch{}
  }
  update(rpm,throttle,enabled,volume,{speed=0,shifting=false}={}){
    if(!this.context||!this.osc||!this.gain)return;
    const now=this.context.currentTime,load=Math.max(0,Math.min(1,throttle)),air=Math.max(0,Math.min(1.4,speed/55));
    const firing=Math.max(24,rpm/60*2);
    this.osc.frequency.setTargetAtTime(firing,now,.025);
    this.sub.frequency.setTargetAtTime(firing*.5,now,.025);
    this.harmonic.frequency.setTargetAtTime(firing*2,now,.025);
    this.filter.frequency.setTargetAtTime(320+rpm*.19+load*700,now,.045);
    this.engine.gain.setTargetAtTime(shifting?.12:.35+load*.65,now,.025);
    this.windFilter.frequency.setTargetAtTime(180+air*1100,now,.1);
    this.windGain.gain.setTargetAtTime(air*air*1.5,now,.08);
    this.gain.gain.setTargetAtTime(enabled?Math.max(0,Math.min(1,volume))*.25:0,now,.045);
  }
  stop(){if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.035);}
}
