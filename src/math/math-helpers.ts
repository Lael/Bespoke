import {Complex} from "./complex/complex";
import {Matrix3, Vector2, Vector3} from "three";

export const EPSILON: number = 1e-12;

export function normalizeAngle(theta: number, low: number = -Math.PI) {
  if (!isFinite(theta)) throw Error(`Cannot normalize non-finite number: ${theta}`);
  while (theta < low) theta += 2 * Math.PI;
  while (theta >= low + 2 * Math.PI) theta -= 2 * Math.PI;
  return theta;
}

export function closeEnough(r1: number, r2: number, eps: number = 0.000_000_1) {
  if (!isFinite(r1) || !isFinite(r2)) return false;
  return Math.abs(r1 - r2) < eps;
}

export function solveQuadratic(a: Complex, b: Complex, c: Complex): Complex[] {
  const d = b.times(b).minus(a.times(c).scale(4)).sqrt();
  if (d.isZero()) return [b.scale(-0.5).over(a)];
  return [b.scale(-1).minus(d).over(a.scale(2)), b.scale(-1).plus(d).over(a.scale(2))];
}

export function lcm(a: number, b: number): number {
  if (!Number.isInteger(a) && !Number.isInteger(b)) throw Error('Cannot compute LCM of non-integers');
  const aa = Math.abs(a);
  const bb = Math.abs(b);
  if (aa === bb) return aa;
  if (aa === 0 || bb === 0) return Math.max(aa, bb);

  // O(min(a,b)) implementation:
  const small = Math.min(aa, bb);
  const large = Math.max(aa, bb);
  for (let i = 1; i < small; i++) {
    const guess = i * large;
    if (guess % small === 0) return guess;
  }
  return small * large;
}

export function includedAngle(p1: Vector2, p2: Vector2, p3: Vector2) {
  let d1 = p1.clone().sub(p2);
  let d2 = p3.clone().sub(p2);
  return Math.acos(d1.dot(d2) / (d1.length() * d2.length()));
}

export function polar(radius: number, theta: number): Vector2 {
  return new Vector2(
    radius * Math.cos(theta),
    radius * Math.sin(theta),
  );
}

export function applyAffinity(affinity: Matrix3, v: Vector2): Vector2 {
  const v3 = new Vector3(v.x, v.y, 1).applyMatrix3(affinity);
  return new Vector2(v3.x, v3.y);
}

export function affinity(src: Vector2[], dst: Vector2[]): Matrix3 {
  return basisToThree(src[0], src[1], src[2]).invert()
    .premultiply(basisToThree(dst[0], dst[1], dst[2]));
}

export function basisToThree(v1: Vector2, v2: Vector2, v3: Vector2): Matrix3 {
  return new Matrix3().set(
    v3.x - v2.x, v1.x - v2.x, v2.x,
    v3.y - v2.y, v1.y - v2.y, v2.y,
    0, 0, 1,
  );
}


export function findRoot(f: (x: number) => number, start: number, end: number): number {
  let s = start;
  let e = end;
  let fs, fe, invSlope, mid, fm;
  let i = 0;
  for (; i < 100; i++) {
    fs = f(s);
    fe = f(e);
    if (fs * fe > 0) throw Error('bad interval');
    invSlope = (e - s) / (fe - fs);
    if (Math.abs(invSlope) < 0.01 || Math.abs(fs) < 0.01 || Math.abs(fe) < 0.01) {
      mid = 0.5 * (s + e);
    } else {
      mid = s - fs * invSlope;
    }
    fm = f(mid);
    if (isNaN(fm)) debugger;
    if (closeEnough(s, e, 1e-14)) return mid;
    if (closeEnough(invSlope, 0, 1e-14)) return mid;
    else if (closeEnough(fm, 0, 1e-14)) return mid;

    if (invSlope > 0 && fm > 0) e = mid;
    else if (invSlope > 0 && fm < 0) s = mid;
    else if (invSlope < 0 && fm < 0) e = mid;
    else s = mid;
  }
  console.log(`Initial window: (${start}, ${f(start)}) -> (${end}, ${f(end)})`);
  throw Error(`did not converge: (${s}, ${fs}) -> (${mid}, ${fm}) -> (${e}, ${fe})`);
}
