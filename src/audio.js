export class Audio {
  constructor(){this.enabled=true;this.ctx=null;this.last=0;}
  unlock(){if(!this.ctx)try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch{}this.ctx?.resume();}
  play(type,amount=1){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const c=this.ctx,t=c.currentTime;
    if((type==='impact'||type==='tension'||type==='countdown')&&t-this.last<.1)return;if(type==='impact'||type==='tension'||type==='countdown')this.last=t;
    const config={reward:[440,880,.3,'sine'],ignite:[170,70,.25,'sawtooth'],'fire-hit':[120,45,.3,'sawtooth'],vortex:[100,380,.5,'sine'],spring:[170,620,.25,'triangle'],release:[190,45,.2,'triangle'],crack:[240,75,.18,'square'],tension:[120,190,.07,'triangle'],countdown:[520,390,.05,'sine'],phase:[260,420,.2,'triangle'],dust:[95,35,.09,'triangle'],place:[330,130,.08,'triangle'],launch:[180,48,.22,'sawtooth'],impact:[120,36,.12,'triangle'],break:[95,24,.2,'sawtooth'],blast:[65,20,.45,'sawtooth'],defeat:[440,130,.25,'square'],victory:[330,660,.55,'triangle']}[type];
    if(!config)return;
    const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);
    o.type=config[3];o.frequency.setValueAtTime(config[0],t);o.frequency.exponentialRampToValueAtTime(config[1],t+config[2]);
    g.gain.setValueAtTime(Math.min(.075,.025+amount*.003),t);g.gain.exponentialRampToValueAtTime(.001,t+config[2]);o.start(t);o.stop(t+config[2]);
  }
}
