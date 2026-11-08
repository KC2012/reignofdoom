const originalSoldier={density:.0018,health:16,friction:.9,restitution:0,chamfer:4,pinned:.8};
const toySoldier={density:.0075,health:28,friction:.45,restitution:.1,chamfer:6,pinned:.35};
/** Named experimental profiles keep comparisons reproducible. Structural health is unchanged. */
export const PHYSICS_PROFILES={
 baseline:{name:'Alpha 2.2',soldier:originalSoldier,radius:11,density:.014,damage:2.6,grip:1,kick:.035,kickCap:7,soldierImpact:2.1},
 large:{name:'Larger ball',soldier:toySoldier,radius:16,density:.014,damage:1.25,grip:1,kick:.035,kickCap:7,soldierImpact:1.4},
 cartoon:{name:'Cartoon momentum',soldier:toySoldier,radius:11,density:.014,damage:1.25,grip:.8,kick:.1,kickCap:11,soldierImpact:1.4},
 hybrid:{name:'Hybrid toy',soldier:toySoldier,radius:15,density:.014,damage:1.25,grip:.8,kick:.08,kickCap:11,soldierImpact:1.4},
};
export const TOY_PHYSICS=PHYSICS_PROFILES.hybrid;
