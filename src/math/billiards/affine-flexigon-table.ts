import {fixTime} from "./tables";
import {Shape, Vector2} from "three";
import {Complex} from "../complex/complex";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";
import {closeEnough, EPSILON, normalizeAngle, polar} from "../math-helpers";
import {ArcSegment} from "../geometry/arc-segment";
import {AffineOuterBilliardTable, Straight} from "./affine-billiard-table";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {LineSegment} from "../geometry/line-segment";

export class AffineFlexigonTable extends AffineOuterBilliardTable {
  readonly vertices: Vector2[] = [];
  readonly centers: Vector2[] = [];
  readonly angles: Vector2[] = [];
  readonly segments: ArcSegment[] = [];

  constructor(readonly n: number, readonly k: number) {
    super();
    if (k <= 0 || k > 1 || !Number.isInteger(n) || n < 2) {
      throw Error("bad parameters");
    }

    let offset = (n === 2) ? 0 : Math.PI / 2;
    for (let i = 0; i < n; i++) {
      this.vertices.push(Complex.polar(1, Math.PI * 2 / n * i + offset).toVector2());
    }
    let r = 1. / k;
    let l = this.vertices[0].distanceTo(this.vertices[1]) / 2;
    let d = Math.sqrt(r * r - l * l);
    for (let i = 0; i < n; i++) {
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % this.n];
      let m = v1.clone().lerp(v2, 0.5);
      let dv = v2.clone().sub(v1).normalize();
      let c = m.add(new Vector2(-dv.y, dv.x).multiplyScalar(d));
      this.centers.push(c);
      let a1 = v1.clone().sub(c).angle();
      let a2 = normalizeAngle(v2.clone().sub(c).angle(), a1);
      this.angles.push(new Vector2(a1, a2));
      this.segments.push(new ArcSegment(Complex.fromVector2(c), r, a1, a2));
    }
  }

  interior(point: Vector2): boolean {
    for (let s of this.segments) {
      if (!s.circle.containsPoint(Complex.fromVector2(point))) return false;
    }
    return true;
  }

  override circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line {
    return towardCircle ? this.leftTangentLine(circle) : this.rightTangentLine(circle);
  }

  leftTangentLine(circle: AffineCircle): Line {
    for (let s of this.segments) {
      try {
        let ls = s.circle.leftTangentLineSegment(circle);
        if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
      } catch (e) {
      }
    }
    for (let i = 0; i < this.n; i++) {
      const v2 = this.vertices[(i + 1) % this.n];
      const a2 = this.angles[i].y + Math.PI / 2;
      const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
      const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
      const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
      const cp = circle.rightTangentPoint(Complex.fromVector2(v2));
      const d = v2.clone().sub(cp.toVector2());
      if (d.cross(s2) >= 0 && d.cross(s3) <= 0) return Line.throughTwoPoints(cp, v2.clone());
    }
    throw Error("no left tangent line");
  }

  rightTangentLine(circle: AffineCircle): Line {
    for (let i = 0; i < this.n; i++) {
      let s = this.segments[i];
      try {
        let ls = s.circle.rightTangentLineSegment(circle);
        let as = this.angles[i];
        let h = normalizeAngle(s.center.heading(ls.end), as.x);
        if (h < normalizeAngle(as.y, as.x)) {
          return ls.line;
        }
      } catch (e) {
        // console.log(e);
      }
    }
    for (let i = 0; i < this.n; i++) {
      const v = this.vertices[(i + 1) % this.n];
      const a2 = this.angles[i].y + Math.PI / 2;
      const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
      const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
      const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
      const cp = circle.leftTangentPoint(Complex.fromVector2(v));
      const d = cp.toVector2().sub(v);
      if (closeEnough(d.length(), 0)) continue;
      if (d.cross(s2) >= 0 && d.cross(s3) <= 0) return Line.throughTwoPoints(cp, v.clone());
    }
    throw Error("no right tangent line");
  }

  override tangentTowardsPoint(point: Vector2): number {
    return this.time(this.leftTangentPoint(point));
  }

  override tangentFromPoint(point: Vector2): number {
    return this.time(this.rightTangentPoint(point));
  }

  leftTangentPoint(point: Vector2): Vector2 {
    for (let s of this.segments) {
      try {
        let p = s.circle.leftTangentPoint(Complex.fromVector2(point)).toVector2();
        if (this.pointOnBoundary(p)) return p;
      } catch (e) {

      }
    }
    for (let i = 0; i < this.n; i++) {
      const v2 = this.vertices[(i + 1) % this.n];
      const v3 = this.vertices[(i + 2) % this.n];
      const a2 = this.angles[i].y + Math.PI / 2;
      const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
      const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
      const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
      const d2 = point.clone().sub(v2);
      const d3 = point.clone().sub(v3);
      if (s2.cross(d2) >= 0 && s3.cross(d3) <= 0) return v2;
    }
    throw Error("no left tangent point");
  }

  rightTangentPoint(point: Vector2): Vector2 {
    for (let s of this.segments) {
      try {
        let p = s.circle.rightTangentPoint(Complex.fromVector2(point)).toVector2();
        if (this.pointOnBoundary(p)) return p;
      } catch (e) {
      }
    }
    for (let i = 0; i < this.n; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.n];
      const a2 = this.angles[i].y + Math.PI / 2;
      const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
      const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
      const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
      const d1 = point.clone().sub(v1);
      const d2 = point.clone().sub(v2);
      if (s2.cross(d1) <= 0 && s3.cross(d2) >= 0) return v2;
    }
    throw Error("no right tangent point");
  }

  point(time: number): Vector2 {
    let t = fixTime(time);
    let i = Math.floor(t * this.n);
    let v1 = this.vertices[i];
    let v2 = this.vertices[(i + 1) % this.n];
    let alpha = t * this.n - i;
    if (this.k === 0) return v1.clone().lerp(v2, alpha);
    let c = this.centers[i];
    let theta = this.angles[i].x * (1 - alpha) + this.angles[i].y * alpha;
    return c.clone().add(new Vector2(1. / this.k * Math.cos(theta), 1. / this.k * Math.sin(theta)));
  }

  pointOnBoundary(point: Vector2): boolean {
    for (let s of this.segments) {
      if (s.containsPoint(Complex.fromVector2(point))) return true;
    }
    return false;
  }

  tangentHeading(time: number): number | undefined {
    let t = fixTime(time);
    let i = Math.floor(t * this.n);
    let v1 = this.vertices[i];
    let v2 = this.vertices[(i + 1) % this.n];
    let alpha = t * this.n - i;
    if (this.k === 0) return v2.clone().sub(v1).angle();
    let theta = this.angles[i].x * (1 - alpha) + this.angles[i].y * alpha;
    return normalizeAngle(theta + Math.PI / 2);
  }

  override tangentVector(time: number): Vector2 {
    const theta = this.tangentHeading(time);
    if (theta === undefined) return this.tangentVector(time + EPSILON);
    return polar(1, theta);
  }

  time(point: Vector2): number {
    for (let i = 0; i < this.n; i++) {
      const s = this.segments[i];
      if (s.containsPoint(Complex.fromVector2(point))) {
        const theta = point.clone().sub(s.center.toVector2()).angle();
        return (i + (normalizeAngle(theta - s.startAngle, 0) / normalizeAngle(s.endAngle - s.startAngle))) / this.n;
      }
    }
    throw Error('point not on boundary');
  }

  supportPoint(theta: number): Vector2 {
    for (let as of this.segments) {
      const sp = as.circle.supportPoint(theta);
      if (as.containsPoint(Complex.fromVector2(sp))) return sp;
    }
    let pos = Number.NEGATIVE_INFINITY;
    let best: Vector2 | null = null;
    const perp = Complex.polar(1, theta - Math.PI / 2).toVector2();
    for (let v of this.vertices) {
      const d = v.dot(perp);
      if (d > pos) {
        pos = d;
        best = v.clone();
      }
    }
    if (best === null) return Complex.polar(100, theta).toVector2();
    return best;
  }

  override boundary(point: Vector2): boolean {
    try {
      this.time(point);
      return true;
    } catch (e) {
      return false;
    }
  }

  override width(theta: number): number {
    const sp1 = this.supportPoint(theta);
    const sp2 = this.supportPoint(theta + Math.PI);
    const diff = sp1.sub(sp2);
    return Math.abs(diff.dot(new Vector2(-Math.sin(theta), Math.cos(theta))));
  }

  override intersect(ray: EuclideanRay): number {
    let ls = new LineSegment(ray.src, ray.src.clone().addScaledVector(ray.dir, 10));
    for (let s of this.segments) {
      const i = s.intersect(ls);
      if (i.length > 0) {
        return this.time(i[0].toVector2());
      }
    }
    throw Error('no intersection');
  }

  outerAreaPreimages(iterations: number): Straight[] {
    return [];
  }

  outerLengthPreimages(iterations: number): Straight[] {
    return [];
  }

  override shape(_: number): Shape {
    const points = [];
    for (let segment of this.segments) {
      points.push(...segment.interpolate(1).map(c => c.toVector2()));
    }
    return new Shape().setFromPoints(points).closePath();
  }
}