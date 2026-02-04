import {
  BufferGeometry,
  ColorRepresentation,
  Group,
  Line as ThreeLine,
  LineBasicMaterial,
  Shape,
  Vector2,
  Vector3
} from "three";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {fixTime} from "./tables";
import {Complex} from "../complex/complex";
import {AffineOuterBilliardTable, Straight} from "./affine-billiard-table";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {EuclideanShape, NormalPair, ShapeRayCollision} from "../geometry/euclidean-shape";
import {findPeriodicMinimumX} from "./find-min";

export type Parametrization = (t: number) => Vector2;
export type ContainmentTest = (v: Vector2) => boolean;

export function smoothPolygon(n: number, p: number) {
  function radial(t: number) {
    return Math.pow(
      Math.pow(Math.abs(Math.cos(n / 4 * t)), p) +
      Math.pow(Math.abs(Math.sin(n / 4 * t)), p),
      (-1 / p));
  }

  function dRadial(t: number) {
    const c = Math.cos(n / 4 * t);
    const s = Math.sin(n / 4 * t);
    return -n / 4 * c * s *
      (Math.pow(Math.abs(s), p - 2) - Math.pow(Math.abs(c), p - 2)) *
      Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -(1 + p) / p);
  }

  const parametrization = (t: number) => {
    const theta = 2 * Math.PI * t;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const r = radial(theta);
    return new Vector2(r * c, r * s);
  };

  const derivative = (t: number) => {
    const theta = 2 * Math.PI * t;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const r = radial(theta);
    const rp = dRadial(theta);
    return new Vector2(
      rp * c - r * s,
      rp * s + r * c,
    ).normalize()
  }

  const containmentTest = (v: Vector2) => radial(v.angle()) >= v.length();

  return new AffineOvalTable(parametrization, derivative, containmentTest);
}

export function lpCircle(p: number, xScale: number = 1): AffineOvalTable {
  // x^polygon + y^polygon = 1
  // x(t) = cos^(2/polygon)(t), x'(t) = -(2/polygon)cos^(2/polygon - 1)(t)*sin(t)
  // y(t) = sin^(2/polygon)(t), y'(t) = (2/polygon)sin^(2/polygon - 1)(t)*cos(t)
  const parametrization = (t: number) => {
    const c = Math.cos(2 * Math.PI * t);
    const s = Math.sin(2 * Math.PI * t);
    const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);
    return new Vector2(r * c * xScale, r * s);
  };
  const derivative = (t: number) => {
    const c = Math.cos(2 * Math.PI * t);
    const s = Math.sin(2 * Math.PI * t);
    if (4 * t % 1 === 0) {
      return new Vector2(-s, c);
    }
    const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);

    const rp = -1 / p * Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p - 1)
      * (-Math.pow(Math.abs(c), p - 1) * s * c / Math.abs(c) + Math.pow(Math.abs(s), p - 1) * c * s / Math.abs(s)
      ) * p;

    let v = new Vector2(
      (rp * c - r * s) * xScale,
      rp * s + r * c,
    );
    return v.normalize();
  }
  const containmentTest = (v: Vector2) => Math.pow(Math.abs(v.x), p) + Math.pow(Math.abs(v.y), p) <= 1;
  return new AffineOvalTable(parametrization, derivative, containmentTest);
}

export function ellipse(eccentricity: number): AffineOvalTable {
  const a: number = 1;
  const b = Math.sqrt(1 - eccentricity * eccentricity);
  const parametrization = (t: number) => {
    const c = Math.cos(2 * Math.PI * t);
    const s = Math.sin(2 * Math.PI * t);
    return new Vector2(a * c, b * s);
  };
  const derivative = (t: number) => {
    const c = Math.cos(2 * Math.PI * t);
    const s = Math.sin(2 * Math.PI * t);
    return new Vector2(-a * s, b * c).normalize();
  }
  const containmentTest = (v: Vector2) => new Vector2(v.x / a, v.y / b).lengthSq() <= 1;
  return new AffineOvalTable(parametrization, derivative, containmentTest);
}

const EPSILON = 0.000_001;

// function derivative(value: (t: number) => number, t: number): number {
//     return (value(t + EPSILON) - value(t - EPSILON)) / (2 * EPSILON);
// }

function findOnInterval(f: (t: number) => number,
                        start: number,
                        end: number): number {
  if (closeEnough(start, end)) return start;
  let g1 = start;
  let g2 = start + (end - start) / 3;
  let g3 = start + 2 * (end - start) / 3;
  let g4 = end;
  let v1 = f(g1);
  let v2 = f(g2);
  let v3 = f(g3);
  let v4 = f(g4);
  if (v2 === v3) {
    return findOnInterval(f, g2, g3);
  } else if (v2 < v3) {
    return findOnInterval(f, g1, g3);
  } else {
    return findOnInterval(f, g2, g4);
  }
  // ddd -> g2, g4
  // ddu -> g2, g4
  // dud -> // impossible?
  // udd -> // impossible?
  // duu -> g1, g3
  // udu -> // impossible?
  // uud -> // impossible?
  // uuu -> g1, g3
}

// Assumptions: f(t) = f(t + 1) & value has one min and one max on [0, 1).
function findOnCircle(f: (t: number) => number): number {
  let tv = new Vector3(0.0, 1. / 3, 2. / 3);
  let v1 = f(tv.x);
  let v2 = f(tv.y);
  let v3 = f(tv.z);
  if (v1 === v2) {
    tv.y = 0.5;
    v2 = f(tv.y);
  } else if (v2 === v3) {
    tv.z = 0.75;
    v3 = f(tv.z);
  } else if (v3 === v1) {
    tv.x = 0.25;
    v1 = f(tv.x);
  }
  if (v1 === v2 || v2 === v3) {
    // constant function
    return 0;
  }
  if (v1 > v2) {
    if (v2 > v3) {
      // •       •
      //  X     /
      //   •   /
      //    \ /
      //     •
      return findOnInterval(f, tv.y, tv.x + 1);
    } else {
      if (v3 > v1) {
        //       •
        //      / X
        // •   /   •
        //  \ /
        //   •
        return findOnInterval(f, tv.x, tv.z);
      } else {
        // •       •
        //  \     X
        //   \   •
        //    \ /
        //     •
        return findOnInterval(f, tv.x, tv.z);
      }
    }
  } else {
    if (v2 < v3) {
      //     •
      //    X \
      //   •   \
      //  /     \
      // •       •
      return findOnInterval(f, tv.z, tv.y + 1);
    } else {
      if (v3 < v1) {
        //   •
        //  X \
        // •   \   •
        //      \ /
        //       •
        return findOnInterval(f, tv.y, tv.x + 1);
      } else {
        //     •
        //    / X
        //   /   •
        //  /     \
        // •       •
        return findOnInterval(f, tv.z, tv.y + 1);
      }
    }
  }
}

// Assumed to be smooth and strictly convex
export class AffineOvalTable extends AffineOuterBilliardTable implements EuclideanShape {
  private angle: number = 0;
  private factor: number = 1;
  private translation = new Vector2();

  constructor(
    private readonly parametrization: Parametrization,
    private readonly tangent: Parametrization,
    private readonly contains: ContainmentTest) {
    super();
  }

  point(time: number): Vector2 {
    const raw = this.parametrization(fixTime(time));
    return raw.multiplyScalar(this.factor).rotateAround(new Vector2(), this.angle).add(this.translation);
  }

  time(point: Vector2): number {
    const bestGuess = findOnCircle(
      (t: number) => {
        return this.point(t).distanceTo(point)
      }
    )
    if (this.point(bestGuess).distanceTo(point) > EPSILON) {
      throw Error('point does not lie on curve');
    }
    return fixTime(bestGuess);
  }

  override tangentVector(time: number): Vector2 {
    return this.tangent(fixTime(time)).rotateAround(new Vector2(), this.angle).normalize();
  }

  leftTangentLine(circle: AffineCircle): Line {
    // console.log('finding left tangent line');
    const alignment = (t: number) => {
      const pt = this.point(t);
      const th = this.heading(t);
      const cp = circle.rightTangentPoint(Complex.fromVector2(pt)).toVector2();
      const d = cp.sub(pt);
      return Math.pow(normalizeAngle(th - d.angle()), 2);
    };
    const bestGuess = findOnCircle(alignment);

    console.log(alignment(bestGuess));

    const pt = this.point(bestGuess);
    return Line.throughTwoPoints(pt, circle.rightTangentPoint(Complex.fromVector2(pt)).toVector2());
  }

  rightTangentLine(circle: AffineCircle): Line {
    console.clear();
    console.log('finding right tangent line');
    const bestGuess = findPeriodicMinimumX(
      (t: number) => {
        const pt = this.point(t);
        const th = this.heading(t);
        const cp = circle.leftTangentPoint(Complex.fromVector2(pt)).toVector2();
        const d = pt.sub(cp);
        return Math.pow(normalizeAngle(th - d.angle()), 2);
      },
      {
        x0: 0,
        samples: 100,
        tol: 1e-12,
        maxIter: 100,
      }
    );

    const pt = this.point(bestGuess);
    return Line.throughTwoPoints(pt, circle.leftTangentPoint(Complex.fromVector2(pt)).toVector2());
  }

  interior(point: Vector2): boolean {
    return this.contains(point.clone().sub(this.translation).rotateAround(new Vector2(), -this.angle).multiplyScalar(1 / this.factor));
  }

  override intersect(ray: EuclideanRay): number {
    let tLo = 0;
    let tHi = 1;

    function rp(t: number) {
      return ray.src.clone().addScaledVector(ray.dir, t);
    }

    while (this.interior(rp(tHi))) {
      tHi *= 2;
    }

    while (tHi - tLo > 0.000_000_001) {
      let mid = (tLo + tHi) / 2;
      if (this.interior(rp(mid))) {
        tLo = mid;
      } else {
        tHi = mid;
      }
    }
    return this.time(rp(tLo));
  }

  boundary(point: Vector2): boolean {
    try {
      this.time(point);
      return true;
    } catch (e) {
      return false;
    }
  }

  points(divisions: number): Vector2[] {
    const points = [];
    for (let i = 0; i < divisions; i++) {
      points.push(this.point(i / divisions));
    }
    return points;
  }

  tangentialAngle(t: number, p: Vector2, sign: number) {
    const r = this.point(t)
    return angle3(
      r,
      r.clone().add(this.tangentVector(t).multiplyScalar(sign)),
      p,
    );
  }

  // left as viewed by the point
  leftTangentPoint(point: Vector2): [number, Vector2] {
    if (this.contains(point)) {
      throw Error('point inside table');
    }
    const t = this.findClimbingZero((t: number) => {
      const p = this.point(t);
      const tv = this.tangentVector(t);
      const diff = p.clone().sub(point).normalize();
      return tv.cross(diff);
    });
    return [t, this.point(t)];
  }

  findClimbingZero(f: (t: number) => number): number {
    const dt: number = 0.01;
    let lt = 0;
    let lv = f(lt);
    if (closeEnough(lv, 0)) return lt;
    let ht = dt;
    let hv = f(ht);
    let found = false;
    for (; lt <= 1.0; lt += dt) {
      ht = lt + dt;
      hv = f(ht);
      if (closeEnough(hv, 0)) return ht;
      if (lv < 0 && hv > 0) {
        found = true;
        break;
      }
      lv = hv;
    }

    if (!found) throw Error('no climbing zeros found');

    let mt = (lt + ht) / 2;
    let mv = f(mt);
    let steps = 0;
    while (Math.abs(mv) > 1e-6 && steps < 100) {
      steps++;
      if (mv < 0) {
        lt = mt;
        lv = mv;
      } else {
        ht = mt;
        hv = mv;
      }
      mt = (lt + ht) / 2;
      mv = f(mt);
    }

    return mt;
  }

  // right as viewed by the point
  rightTangentPoint(point: Vector2): [number, Vector2] {
    if (this.contains(point)) {
      throw Error('point inside table');
    }
    const t = this.findClimbingZero((t: number) => {
      const p = this.point(t);
      const tv = this.tangentVector(t);
      const diff = point.clone().sub(p).normalize();
      return tv.cross(diff);
    });
    return [t, this.point(t)];
  }

  supportPoint(theta: number): Vector2 {
    const t = findOnCircle(t =>
      Math.pow(normalizeAngle(this.heading(t) - theta), 2)
    );
    return this.point(t);
  }

  width(theta: number): number {
    const sp1 = this.supportPoint(theta);
    const sp2 = this.supportPoint(theta + Math.PI);
    const diff = sp1.sub(sp2);
    return Math.abs(diff.dot(new Vector2(-Math.sin(theta), Math.cos(theta))));
  }

  shape(n: number): Shape {
    const points = [];
    for (let i = 0.0; i < n; i++) {
      points.push(this.point(i / n));
    }
    return new Shape().setFromPoints(points).closePath();
  }

  circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line {
    return towardCircle ?
      this.leftTangentLine(circle) : this.rightTangentLine(circle);
  }

  outerAreaPreimages(iterations: number): Straight[] {
    return [];
  }

  outerLengthPreimages(iterations: number): Straight[] {
    return [];
  }

  tangentTowardsPoint(point: Vector2): number {
    return this.leftTangentPoint(point)[0];
  }

  tangentFromPoint(point: Vector2): number {
    return this.rightTangentPoint(point)[0];
  }

  castRay(ray: EuclideanRay): ShapeRayCollision {
    const t = this.intersect(ray);
    return {
      point: this.point(t),
      paramTime: t,
    };
  }

  drawable(color: ColorRepresentation): Group {
    let l = new ThreeLine(
      new BufferGeometry().setFromPoints(this.points(360).concat([this.point(0)])),
      new LineBasicMaterial({color})
    );
    return new Group().add(l);
  }

  param(t: number): NormalPair {
    const n = this.tangentVector(t);
    return {
      point: this.point(t),
      normal: new Vector2(n.y, -n.x),
    };
  }

  rotate(angle: number): EuclideanShape {
    const dupe = new AffineOvalTable(this.parametrization, this.tangent, this.contains);
    dupe.angle = this.angle + angle;
    return dupe;
  }

  scale(factor: number): EuclideanShape {
    const dupe = new AffineOvalTable(this.parametrization, this.tangent, this.contains);
    dupe.factor = this.factor * factor;
    return dupe;
  }

  translate(t: Vector2): EuclideanShape {
    const dupe = new AffineOvalTable(this.parametrization, this.tangent, this.contains);
    dupe.translation = this.translation.add(t);
    return dupe;
  }

  corners(): number[] {
    return [];
  }
}

function angle3(v1: Vector2, v2: Vector2, v3: Vector2): number {
  try {
    const h1 = v2.clone().sub(v1).angle();
    const h2 = v3.clone().sub(v1).angle();
    return normalizeAngle(h2 - h1, -Math.PI);
  } catch (e) {
    console.log(v1, v2, v3);
    throw e;
  }
}