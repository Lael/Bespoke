import {AffineOuterBilliardTable, AffineOuterLengthResult, Straight} from "./affine-billiard-table";
import {Vector2} from "three";
import {AffineCircle} from "../geometry/affine-circle";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {Complex} from "../complex/complex";
import {affineFourthCircle} from "./tables";
import {LineSegment} from "../geometry/line-segment";

export class AffineEllipseTable extends AffineOuterBilliardTable {
  private a: number;
  private b: number;
  private a2b2: number

  constructor(private readonly eccentricity: number) {
    super();
    this.a = 1;
    this.b = Math.sqrt(1 - eccentricity * eccentricity);
    this.a2b2 = Math.pow(this.a * this.b, 2);
  }

  boundary(point: Vector2): boolean {
    return closeEnough(Math.pow(point.x * this.b, 2) + Math.pow(point.y * this.a, 2), this.a2b2);
  }

  circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line {
    throw Error('NYI');
  }

  override outerLength(start: Vector2, reverse: boolean = false): AffineOuterLengthResult {
    const towardsPoint = this.point(this.tangentTowardsPoint(start));
    const fromPoint = this.point(this.tangentFromPoint(start));
    const tp = reverse ? fromPoint : towardsPoint;
    const fp = !reverse ? fromPoint : towardsPoint;
    const circle = affineFourthCircle(
      start,
      new LineSegment(start, fp),
      new LineSegment(tp, start),
      fp);

    const a = 0.5 * (start.distanceTo(new Vector2(-this.eccentricity, 0))
      + start.distanceTo(new Vector2(this.eccentricity, 0)));
    const b = Math.sqrt(a * a - this.eccentricity * this.eccentricity);

    // const tts = new Complex(start.x * a, start.y * b);
    // const tpc = new Complex(fp.x * a, fp.y * b);

    const dir = fp.clone().sub(start).normalize();
    const image = ellipseIntersection(a, b, {
      src: start.clone().addScaledVector(dir, 0.000_001),
      dir
    });
    return {
      point: image,
      circle,
    }
  }

  interior(point: Vector2): boolean {
    return Math.pow(point.x * this.b, 2) + Math.pow(point.y * this.a, 2) < this.a2b2;
  }

  intersect(ray: EuclideanRay): number {
    return this.time(ellipseIntersection(this.a, this.b, ray));
  }

  outerAreaPreimages(iterations: number): Straight[] {
    return [];
  }

  outerLengthPreimages(iterations: number): Straight[] {
    return [];
  }

  point(time: number): Vector2 {
    const t = 2 * Math.PI * time;
    return new Vector2(this.a * Math.cos(t), this.b * Math.sin(t))
  }

  tangentFromPoint(point: Vector2): number {
    const tp = new Vector2(point.x / this.a, point.y / this.b);
    const rp = AffineCircle.UNIT_CIRCLE.rightTangentPoint(Complex.fromVector2(tp));
    return normalizeAngle(Math.atan2(rp.y, rp.x), 0) / (2 * Math.PI);
  }

  tangentTowardsPoint(point: Vector2): number {
    const tp = new Vector2(point.x / this.a, point.y / this.b);
    const rp = AffineCircle.UNIT_CIRCLE.leftTangentPoint(Complex.fromVector2(tp));
    return normalizeAngle(Math.atan2(rp.y, rp.x), 0) / (2 * Math.PI);
  }

  tangentVector(time: number): Vector2 {
    const t = 2 * Math.PI * time;
    return new Vector2(this.a * Math.sin(t), this.b * Math.cos(t)).normalize();
  }

  time(point: Vector2): number {
    return normalizeAngle(Math.atan2(point.y / this.b, point.x / this.a), 0) / (2 * Math.PI);
  }

  width(angle: number): number {
    throw Error('NYI');
  }
}

function ellipseIntersection(a: number, b: number, ray: EuclideanRay): Vector2 {
  let tr: EuclideanRay = {
    src: new Vector2(ray.src.x / a, ray.src.y / b),
    dir: new Vector2(ray.dir.x / a, ray.dir.y / b)
  };
  let pts = AffineCircle.UNIT_CIRCLE.intersectLine(Line.srcDir(tr.src, tr.dir))
    .map(c => c.toVector2());
  let best: Vector2 | null = null;
  let bestD: number = Number.POSITIVE_INFINITY;
  for (let pt of pts) {
    const d = pt.clone().sub(tr.src).dot(tr.dir);
    if (d < 0) continue;
    if (d < bestD) {
      bestD = d;
      best = pt;
    }
  }
  if (!best) throw Error('no intersection');
  return new Vector2(best.x * a, best.y * b);
}