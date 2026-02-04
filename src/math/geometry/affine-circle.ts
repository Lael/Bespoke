import {Complex} from "../complex/complex";
import {Line} from "./line";
import {closeEnough} from "../math-helpers";
import {LineSegment} from "./line-segment";
import {Vector2} from "three";

export class AffineCircle {

  static readonly UNIT_CIRCLE: AffineCircle = new AffineCircle(Complex.ZERO, 1);

  private r2: number | undefined = undefined;

  constructor(readonly center: Complex, readonly radius: number) {
    if (center.isInfinite() || !isFinite(radius)) throw Error('Circle with infinite parameter');
    if (radius < 0) throw Error('Circle with negative radius');
  }

  static fromThreePoints(p1: Complex, p2: Complex, p3: Complex): AffineCircle {
    const center = Line.bisector(p1, p2).intersectLine(Line.bisector(p2, p3));
    const radius = center.distance(p2);
    return new AffineCircle(center, radius);
  }

  static withTangent(p: Complex, heading: number, through: Complex): AffineCircle {
    const perp = Line.srcDir(p, Complex.polar(1, heading)).perpAtPoint(p);
    const center = perp.intersectLine(Line.bisector(p, through));
    const radius = center.distance(p);
    return new AffineCircle(center, radius);
  }

  intersectCircle(other: AffineCircle): Complex[] {
    const v = other.center.minus(this.center);
    const d = v.modulus();
    if (closeEnough(d, 0)) {
      // if (this.radius === other.radius) throw Error('Trivial circle-circle intersection');
      return [];
    }
    if (d > this.radius + other.radius || d < Math.abs(this.radius - other.radius)) return [];
    if (d === this.radius + other.radius) return [this.center.plus(v.normalize(this.radius))];
    const x = (d * d - other.radius * other.radius + this.radius * this.radius) / (2 * d);
    const c = this.center.plus(v.normalize(x));
    const y2 = this.radius * this.radius - x * x;
    if (closeEnough(y2, 0)) return [c];
    if (y2 < 0) throw Error(`this shouldn't have happened: ${this} ${other}`);
    const perp = v.times(Complex.I).normalize(Math.sqrt(y2));
    return [c.plus(perp), c.minus(perp)];
  }

  intersectLine(line: Line): Complex[] {
    const cc = line.c + (line.a * this.center.x + line.b * this.center.y);
    return intersectHelper(line.a, line.b, cc, this.radius).map(c => c.plus(this.center));
  }

  containsPoint(p: Complex): boolean {
    return this.center.distanceSquared(p) < this.radiusSquared;
  }

  containsCircle(other: AffineCircle): boolean {
    const d = this.center.distance(other.center);
    return this.radius >= other.radius + d;
  }

  rightTangentPoint(point: Complex): Complex {
    if (this.radius === 0) return this.center;
    let d = point.distance(this.center);
    if (d < this.radius) throw Error("point inside circle");
    if (d === this.radius) return point;
    let m = point.plus(this.center).scale(0.5);
    const intersections = this.intersectCircle(new AffineCircle(m, d / 2));
    return intersections[0];
  }

  leftTangentPoint(point: Complex): Complex {
    if (this.radius === 0) return this.center;
    let d = point.distance(this.center);
    if (closeEnough(d, this.radius)) return point;
    if (d < this.radius) throw Error("point inside circle");
    let m = point.plus(this.center).scale(0.5);
    const intersections = this.intersectCircle(new AffineCircle(m, d / 2));
    return intersections[1];
  }

  conePoint(other: AffineCircle): Complex {
    if (this.radius === 0) return this.center;
    if (this.radius === other.radius) {
      if (other.center.equals(this.center)) return this.center;
      else return Complex.INFINITY;
    }
    let d = this.center.distance(other.center);
    let r1, r2, b, v;
    r1 = this.radius;
    r2 = other.radius;
    b = other.center;
    v = this.center.minus(other.center).normalize();
    let x = r2 * d / (r2 - r1);
    return b.plus(v.scale(x));
  }

  rightTangentLine(point: Complex): Line {
    return Line.throughTwoPoints(point, this.rightTangentPoint(point));
  }

  leftTangentLine(point: Complex): Line {
    return Line.throughTwoPoints(point, this.leftTangentPoint(point));
  }

  rightTangentLineSegment(other: AffineCircle): LineSegment {
    if (this.containsCircle(other) || other.containsCircle(this)) throw Error("no common tangents");
    let c = this.conePoint(other);
    if (this.radius > other.radius)
      return new LineSegment(other.rightTangentPoint(c), this.rightTangentPoint(c));
    else
      return new LineSegment(other.leftTangentPoint(c), this.leftTangentPoint(c));
  }

  leftTangentLineSegment(other: AffineCircle): LineSegment {
    if (this.containsCircle(other) || other.containsCircle(this)) throw Error("no common tangents");
    let c = this.conePoint(other);
    if (this.radius > other.radius)
      return new LineSegment(other.leftTangentPoint(c), this.leftTangentPoint(c));
    else
      return new LineSegment(other.rightTangentPoint(c), this.rightTangentPoint(c));
  }

  pointOnBoundary(point: Vector2) {
    return closeEnough(point.distanceTo(this.center.toVector2()), this.radius);
  }

  get radiusSquared(): number {
    if (this.r2 == undefined) {
      this.r2 = this.radius * this.radius;
    }
    return this.r2;
  }

  supportPoint(theta: number): Vector2 {
    return this.center.plus(Complex.polar(this.radius, theta - Math.PI / 2)).toVector2();
  }

  invert(pt: Complex): Complex {
    const diff = pt.minus(this.center);
    const l2 = diff.modulusSquared();
    return this.center.plus(diff.scale(this.radius / l2));
  }
}

function intersectHelper(a: number, b: number, c: number, r: number): Complex[] {
  if (a === 0) {
    const d = -c / b;
    if (Math.abs(d) > r) return [];
    if (Math.abs(d) === r) return [new Complex(0, d)];
    const s = Math.sqrt(r * r - d * d);
    return [new Complex(s, d), new Complex(-s, d)];
  }
  if (b === 0) {
    const d = -c / a;
    if (Math.abs(d) > r) return [];
    if (Math.abs(d) === r) return [new Complex(d, 0)];
    const s = Math.sqrt(r * r - d * d);
    return [new Complex(d, s), new Complex(d, -s)];
  }
  const x = -c * a / (a * a + b * b);
  const y = b / a * x;
  const p = new Complex(x, y);
  const d = p.modulus();
  if (d > r) return [];
  if (d === r) return [p];
  const diff = new Complex(-b, a).normalize(Math.sqrt(r * r - d * d));
  return [p.minus(diff), p.plus(diff)];
}