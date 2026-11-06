export const STEP = 1000 / 60;
export const WORLD = { width: 2400, height: 1040, ground: 810 };
export const SIDES = [
  { name: 'Ember', color: '#ffb478', center: 470, zone: [270, 680], launcher: [735, 765], direction: 1 },
  { name: 'Tide', color: '#84e1db', center: 1930, zone: [1720, 2130], launcher: [1665, 765], direction: -1 },
];
export const MATERIALS = {
  wood: { name: 'Timber', density: .0017, friction: .7, restitution: .05, health: 42, resistance: 1, color: '#c9b38b', hatch: 'grain' },
  stone: { name: 'Stone', density: .0038, friction: .85, restitution: .015, health: 78, resistance: .8, color: '#b9c4cf', hatch: 'stone' },
  metal: { name: 'Steel', density: .006, friction: .45, restitution: .025, health: 180, resistance: 1.8, color: '#e4eee9', hatch: 'metal' },
  foam: { name: 'Cork', density: .00045, friction: .9, restitution: .38, health: 15, resistance: .6, color: '#b8ce95', hatch: 'dots' },
};
export const PIECES = [
  { id: 'brick', name: 'Timber brick', material: 'wood', w: 72, h: 30, count: 4, icon: '▰' },
  { id: 'beam', name: 'Timber beam', material: 'wood', w: 150, h: 20, count: 3, icon: '━' },
  { id: 'pillar', name: 'Timber pillar', material: 'wood', w: 24, h: 86, count: 2, icon: '┃' },
  { id: 'stone', name: 'Stone block', material: 'stone', w: 62, h: 36, count: 3, icon: '▥' },
  { id: 'steel', name: 'Steel slab', material: 'metal', w: 110, h: 16, count: 1, icon: '═' },
  { id: 'wedge', name: 'Cork wedge', material: 'foam', w: 70, h: 50, count: 2, icon: '◢', shape: 'wedge' },
  { id: 'brace', name: 'Timber elbow', material: 'wood', w: 72, h: 62, count: 0, icon: '┗', shape: 'brace' },
];
export const AMMO = {
  bolt: { name: 'Bolt', subtitle: 'Precise • unlimited', radius: 8, density: .016, scale: 1, damage: 1.2, color: '#f0e9d6' },
  heavy: { name: 'Breaker', subtitle: 'Heavy • punches supports', radius: 13, density: .023, scale: .9, damage: 1.1, color: '#ffb478' },
  bomb: { name: 'Burst', subtitle: 'Blast • clears light cover', radius: 11, density: .009, scale: .96, damage: .5, color: '#cfb0ef' },
};
export function random(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export function pullVelocity(dx, dy, ammo = 'bolt') {
  const length = Math.hypot(dx, dy); if (length < 12) return null;
  const ratio = Math.min(1, 135 / length);
  return { x: -dx * ratio * .185 * AMMO[ammo].scale, y: -dy * ratio * .185 * AMMO[ammo].scale };
}
export function initialInventory() { return Object.fromEntries(PIECES.map(p => [p.id, p.count])); }
export function repairInventory(rng) {
  const inv = Object.fromEntries(PIECES.map(p => [p.id, 0]));
  for (const id of ['beam','brick','brace']) inv[id]++;
  for (let i=0;i<2;i++) inv[['stone','pillar','wedge'][Math.floor(rng()*3)]]++;
  return inv;
}
export function resultFor(counts, round, limit = 10) {
  if (!counts[0] && !counts[1]) return { winner: -1, reason: 'Mutual destruction' };
  if (!counts[0] || !counts[1]) return { winner: counts[0] ? 0 : 1, reason: 'Last soldiers standing' };
  if (round > limit) return { winner: counts[0] === counts[1] ? -1 : counts[0] > counts[1] ? 0 : 1, reason: 'Siege limit reached • surviving soldiers decide' };
  return null;
}
