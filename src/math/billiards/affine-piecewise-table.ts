import {AffineOuterBilliardTable, Straight} from "./affine-billiard-table";
import {Shape, Vector2} from "three";
import {AffineCircle} from "../geometry/affine-circle";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {Line} from "../geometry/line";
import {Segment} from "../geometry/segment";
import {LineSegment} from "../geometry/line-segment";
import {Complex} from "../complex/complex";
import {ArcSegment} from "../geometry/arc-segment";
import {closeEnough, normalizeAngle, polar} from "../math-helpers";
import {fixTime} from "./tables";

function segmentWithCurvature(v1: Vector2, v2: Vector2, k: number): Segment {
  if (k === 0) return new LineSegment(v1, v2);
  const r = 1.0 / k;
  const s = Complex.fromVector2(v1);
  const e = Complex.fromVector2(v2);
  const diff = e.minus(s);
  const mid = e.plus(s).scale(0.5);
  const a = Math.sqrt(r * r - diff.modulusSquared() / 4);

  const c = mid.plus(new Complex(-diff.y, diff.x).normalize(a));
  const a1 = s.minus(c).argument();
  const a2 = normalizeAngle(e.minus(c).argument(), a1);
  return new ArcSegment(c, r, a1, a2);
}

export class AffinePiecewiseTable extends AffineOuterBilliardTable {
  readonly n: number;
  readonly segments: Segment[] = [];
  readonly lengths: number[] = [];
  readonly perimeter: number;

  constructor(readonly vertices: Vector2[], readonly curvatures: number[]) {
    super();
    this.n = vertices.length;
    if (this.n < 2 || curvatures.length !== this.n) throw Error('bad input');
    let p = 0;
    for (let i = 0; i < this.n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % this.n];
      const s = segmentWithCurvature(v1, v2, curvatures[i]);
      this.segments.push(s)
      this.lengths.push(s.length);
      p += s.length;
    }
    this.perimeter = p;
  }

  boundary(point: Vector2): boolean {
    const c = Complex.fromVector2(point);
    for (let s of this.segments) {
      if (s.containsPoint(c)) return true;
    }
    return false;
  }

  circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line {
    console.log('circle tangent');
    const pt = this.point(this.tangency(circle, !towardCircle));
    return towardCircle ? circle.rightTangentLine(Complex.fromVector2(pt)) : circle.leftTangentLine(Complex.fromVector2(pt));
  }

  interior(point: Vector2): boolean {
    if (this.boundary(point)) return false;
    let w = 0;
    const c = Complex.fromVector2(point);
    for (let s of this.segments) {
      w += s.wind(c);
    }
    return closeEnough(w, 2 * Math.PI);
  }

  intersect(ray: EuclideanRay): number {
    const ls = new LineSegment(ray.src, ray.src.clone().addScaledVector(ray.dir, 10));
    let bestT = Number.POSITIVE_INFINITY;
    let bestPT = ray.src.clone();
    for (let s of this.segments) {
      const int = s.intersect(ls);
      for (let c of int) {
        const pt = c.toVector2();
        const t = pt.clone().sub(ray.src).dot(ray.dir);
        if (t > 0 && t < bestT) {
          bestT = t;
          bestPT = pt;
        }
      }
    }
    return this.time(bestPT);
  }

  outerAreaPreimages(iterations: number): Straight[] {
    return [];
  }

  outerLengthPreimages(iterations: number): Straight[] {
    return [];
  }

  point(time: number): Vector2 {
    const t = fixTime(time);
    const pt = t * this.perimeter;
    let al = 0;
    for (let i = 0; i < this.n; i++) {
      if (al + this.lengths[i] < pt) {
        al += this.lengths[i];
        continue;
      }
      const a = (pt - al) / this.lengths[i];
      const s = this.segments[i];
      if (s instanceof ArcSegment) {
        const theta = s.startAngle * (1 - a) + s.endAngle * a;
        return s.center.plus(Complex.polar(s.radius, theta)).toVector2();
      } else {
        return s.start.toVector2().lerp(s.end.toVector2(), a);
      }
    }
    throw Error('no point found');
  }

  shape(n: number): Shape {
    let points: Vector2[] = [];
    for (let s of this.segments) {
      points.push(...s.interpolate(1).map(c => c.toVector2()));
    }
    return new Shape().setFromPoints(points).closePath();
  }

  tangentFromPoint(point: Vector2): number {
    // let tp: Vector2 | null = null;
    // for (let i = 0; i < this.n; i++) {
    //   const s1 = this.segments[i];
    //   const p = this.vertices[(i + 1) % this.n];
    //   const s2 = this.segments[(i + 1) % this.n];
    //
    //   // might it be the arc?
    //   if (s1 instanceof ArcSegment) {
    //     const circle = s1.circle;
    //     try {
    //       const tpc = circle.rightTangentPoint(Complex.fromVector2(point));
    //       if (s1.containsPoint(tpc)) {
    //         tp = tpc.toVector2();
    //         break;
    //       }
    //     } catch (e) {
    //     }
    //   }
    //   const theta = p.clone().sub(point).angle();
    //   const s1eh = s1.endHeading() + Math.PI;
    //   const s2sh = s2.startHeading();
    //   const n1 = normalizeAngle(theta, s1eh) - s1eh;
    //   const n2 = normalizeAngle(s2sh, theta) - theta;
    //   if (n1 < Math.PI && n2 < Math.PI) {
    //     tp = p.clone();
    //     break;
    //   }
    // }
    // if (tp === null) {
    //   throw Error('no tangent from point');
    // }
    // return this.time(tp);
    console.log('tangent from point');
    return this.tangency(new AffineCircle(Complex.fromVector2(point), 0), true);
  }

  tangentTowardsPoint(point: Vector2): number {
    console.log('tangent towards point');
    return this.tangency(new AffineCircle(Complex.fromVector2(point), 0), false);
  }

  private tangency(circle: AffineCircle, forward: boolean) {
    let tp: Vector2 | null = null;
    for (let i = 0; i < this.n; i++) {
      const s1 = this.segments[i];
      const p = this.vertices[(i + 1) % this.n];
      const s2 = this.segments[(i + 1) % this.n];

      // might it be the arc?
      if (s1 instanceof ArcSegment) {
        const s1circle = s1.circle;
        try {
          const tls = forward ? s1circle.rightTangentLineSegment(circle) : s1circle.leftTangentLineSegment(circle);
          if (s1.containsPoint(tls.end)) {
            tp = tls.end.toVector2();
            console.log(`circle point: (${tls.start.x},${tls.start.y})`);
            console.log(`table point: (${tp.x},${tp.y})`);
            break;
          }
        } catch (e) {
        }
      }
      const cp = Complex.fromVector2(p);
      const point = forward ? circle.leftTangentPoint(cp) : circle.rightTangentPoint(cp);
      if (closeEnough(point.distance(cp), 0)) continue;
      const theta = p.clone().sub(point).angle();
      const s1eh = s1.endHeading() + (forward ? Math.PI : 0);
      const s2sh = s2.startHeading() + (forward ? 0 : Math.PI);
      const n1 = normalizeAngle(theta, s1eh) - s1eh;
      const n2 = normalizeAngle(s2sh, theta) - theta;
      if (n1 < Math.PI && n2 < Math.PI) {
        console.log(`circle point: (${point.x},${point.y})`);
        console.log(`table point: (${p.x},${p.y})`);
        tp = p.clone();
        break;
      }
    }
    if (tp === null) {
      throw Error('no tangent point');
    }
    return this.time(tp);
  }

  tangentVector(time: number): Vector2 {
    const pt = fixTime(time) * this.perimeter;
    let al = 0;
    for (let s of this.segments) {
      if (al + s.length < pt) {
        al += s.length;
        continue;
      }
      if (s instanceof ArcSegment) {
        const theta = (pt - al) / s.radius + s.startAngle + Math.PI / 2;
        return polar(1, theta);
      } else {
        return s.end.minus(s.start).toVector2().normalize();
      }
    }
    throw Error('no tangent vector found');
  }

  time(point: Vector2): number {
    const c = Complex.fromVector2(point);
    let t = 0;
    for (let i = 0; i < this.n; i++) {
      const s = this.segments[i];
      if (!s.containsPoint(c)) {
        t += s.length;
        continue;
      }
      if (s instanceof ArcSegment) {
        const theta = point.clone().sub(s.center.toVector2()).angle();
        return (t + normalizeAngle(theta - s.startAngle, 0) * s.radius) / this.perimeter;
      } else {
        return (t + c.distance(s.start)) / this.perimeter;
      }
    }
    throw Error('point not on boundary');
  }

  width(angle: number): number {
    return 0;
  }
}