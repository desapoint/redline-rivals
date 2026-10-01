export class EngineAudio {
  constructor(){this.context=null;this.osc=null;this.gain=null;}
  start(){
    try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.osc=this.context.createOscillator();this.osc.type='sawtooth';const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;this.gain=this.context.createGain();this.gain.gain.value=0;this.osc.connect(filter);filter.connect(this.gain);this.gain.connect(this.context.destination);this.osc.start();}this.context.resume();}catch{}
  }
  update(rpm,throttle,enabled,volume){if(!this.context)return;this.osc.frequency.setTargetAtTime(rpm/60*2,this.context.currentTime,.08);this.gain.gain.setTargetAtTime(enabled?volume*(.06+.12*throttle):0,this.context.currentTime,.06);}
  stop(){if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.05);}
}
