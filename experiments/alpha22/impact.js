import Matter from 'matter-js';
// Contact-space impact model informed by the attached PlushSiege reference.
// Measure before the solver responds. Sliding is not a crushing impact.
export function contactImpact(a, b, point, normal) {
  const ra = { x: point.x-a.position.x, y: point.y-a.position.y };
  const rb = { x: point.x-b.position.x, y: point.y-b.position.y };
  const av=Matter.Body.getVelocity(a),bv=Matter.Body.getVelocity(b),aw=Matter.Body.getAngularVelocity(a),bw=Matter.Body.getAngularVelocity(b);
  const va = { x: av.x-aw*ra.y, y: av.y+aw*ra.x };
  const vb = { x: bv.x-bw*rb.y, y: bv.y+bw*rb.x };
  const closing = Math.max(0, -((va.x-vb.x)*normal.x+(va.y-vb.y)*normal.y));
  const ca=ra.x*normal.y-ra.y*normal.x, cb=rb.x*normal.y-rb.y*normal.x;
  const inverse=a.inverseMass+b.inverseMass+ca*ca*a.inverseInertia+cb*cb*b.inverseInertia;
  return { closing, energy: inverse > 0 ? .5*closing*closing/inverse : 0 };
}
