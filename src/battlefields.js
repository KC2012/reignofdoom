import { WORLD, SIDES } from './rules.js';
export const SCALES = {
  skirmish: { name:'Skirmish', width:4000, zone:720, height:440, stock:1, build:55, repair:24, limit:8 },
  siege: { name:'Siege', width:4800, zone:900, height:560, stock:1.5, build:70, repair:30, limit:8 },
  grand: { name:'Grand Siege · experimental', width:6400, zone:1300, height:720, stock:2, build:90, repair:40, limit:10 },
};
export const FIELDS = {
  scrap:{name:'Scrapworks',description:'Preloaded springs and powder traps. Hard contact releases a pad once.'},
  powder:{name:'Powder Yard',description:'Mirrored powder crates: risky cover and visible chain targets.'},
  hanging:{name:'Hanging Works',description:'Roped weights depend on breakaway posts.'},
  valley:{name:'The Flats',description:'Open foundations. Room for layered walls.'},
  ridge:{name:'The Divide',description:'A central ridge catches low shots.'},
  steps:{name:'Terraces',description:'Raised mirrored shelves expand your foundations.'},
  ravine:{name:'The Chasm',description:'A deep central void. Keep your troops on home ground.'},
  highlands:{name:'High Ground',description:'Elevated fort foundations and open firing lanes.'},
};
export function battlefield(scale='siege',terrain='valley') {
  const config=SCALES[scale]??SCALES.siege,width=config.width;
  const sides=SIDES.map((s,i)=>{const center=i?width-1000:1000;return {...s,center,zone:[center-config.zone/2,center+config.zone/2],launcher:[i?width-440:440,665]};});
  return {...WORLD,width,height:1250,buildHeight:config.height,sides,scale:config,terrain: FIELDS[terrain]?terrain:'valley'};
}
