const Audio={ctx:null,enabled:true,init(){
  try{ if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
  try{this.enabled=JSON.parse(localStorage.getItem('vroomiiies_sound')||'true');}catch(e){this.enabled=true;}
}};
Audio.toggle=function(){this.enabled=!this.enabled;localStorage.setItem('vroomiiies_sound',JSON.stringify(this.enabled));};
Audio.beep=function(freq=440,dur=0.1,vol=0.05){if(!this.enabled||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=freq;o.connect(g);g.connect(this.ctx.destination);g.gain.value=vol;o.start();o.stop(this.ctx.currentTime+dur);};
Audio.sfx={bonus:()=>Audio.beep(880,0.12,0.06),finish:()=>Audio.beep(660,0.2,0.08),crash:()=>Audio.beep(220,0.15,0.05),lap:()=>Audio.beep(784,0.1,0.05)};EOF
echo done
