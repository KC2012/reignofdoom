// Contact-space impact model informed by the attached PlushSiege reference.
// Measure before the solver responds. Sliding is not a crushing impact.
export function contactImpact(a, b, point, normal) {
  const ra = { x: point.x-a.position.x, y: point.y-a.position.y };
  const rb = { x: point.x-b.position.x, y: point.y-b.position.y };
  const va = { x: a.velocity.x-a.angularVelocity*ra.y, y: a.velocity.y+a.angularVelocity*ra.x };
  const vb = { x: b.velocity.x-b.angularVelocity*rb.y, y: b.velocity.y+b.angularVelocity*rb.x };
  const closing = Math.max(0, -((va.x-vb.x)*normal.x+(va.y-vb.y)*normal.y));
  const ca=ra.x*normal.y-ra.y*normal.x, cb=rb.x*normal.y-rb.y*normal.x;
  const inverse=a.inverseMass+b.inverseMass+ca*ca*a.inverseInertia+cb*cb*b.inverseInertia;
  return { closing, energy: inverse > 0 ? .5*closing*closing/inverse : 0 };
}
