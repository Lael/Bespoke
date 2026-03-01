import {Vector2} from "three";
import {AffineCircle} from "../geometry/affine-circle";
import {EuclideanRay} from "../geometry/euclidean-ray";
import {Line} from "../geometry/line";
import {AffineOuterBilliardTable, Straight} from "./affine-billiard-table";
import {closeEnough, EPSILON, findRoot} from "../math-helpers";

export class SuperellipseTable extends AffineOuterBilliardTable {
  readonly q: number;

  constructor(readonly p: number) {
    if (p <= 1) throw Error("Non-convex superellipse. Use a square instead!");
    super();
    this.q = p / (p - 1);
  }

  override tangentTowardsPoint(point: Vector2): number {
    return 1 - this.tangentFromPoint(new Vector2(point.x, -point.y));
  }

  override tangentFromPoint(point: Vector2): number {
    const a = point.x;
    const b = point.y;

    // const q1 = (a >= +1 && b < +1) || (a > 0 && b >= 0 && b < +1);
    const q2 = (b >= +1 && a > -1) || (b > 0 && a <= 0 && a > -1);
    const q3 = (a <= -1 && b > -1) || (a < 0 && b <= 0 && b > -1);
    const q4 = (b <= -1 && a < +1) || (b < 0 && a >= 0 && a < +1);

    if (q2) return 0.25 + this.tangentFromPoint(new Vector2(+b, -a));
    if (q3) return 0.50 + this.tangentFromPoint(new Vector2(-a, -b));
    if (q4) return 0.75 + this.tangentFromPoint(new Vector2(-b, +a));

    if (b === 0) {
      const u = 1 / a;
      const x = Math.pow(u, 1 / (this.p - 1));
      const y = Math.pow(1 - Math.pow(u, this.q), this.p);
      return this.time(new Vector2(x, y));
    } else {
      let u;
      const f = (x: number) => Math.pow(x, this.q) + Math.pow((1 - a * x) / b, this.q) - 1;
      if (a > 1) {
        if (b > 0) {
          u = findRoot(f, EPSILON, 1 / a - EPSILON);
        } else {
          u = findRoot(f, 1 / a + EPSILON, 1 - EPSILON);
        }
      } else {
        if (a === 1) return 0;
        const min = Math.pow(a, this.p - 1) / (Math.pow(a, this.p) + Math.pow(b, this.p));
        u = findRoot(f, EPSILON, min - EPSILON);
      }
      const v = (1 - a * u) / b;
      return this.time(new Vector2(
        Math.pow(u, this.q - 1),
        Math.pow(v, this.q - 1),
      ));
    }
  }

  override circleTangentLine(circle: AffineCircle, towardCircle: boolean): Line {
    throw new Error("Method not implemented.");
  }

  override outerAreaPreimages(iterations: number): Straight[] {
    throw new Error("Method not implemented.");
  }

  override outerLengthPreimages(iterations: number): Straight[] {
    throw new Error("Method not implemented.");
  }

  override intersect(ray: EuclideanRay): number {
    throw new Error("Method not implemented.");
  }

  override width(angle: number): number {
    throw new Error("Method not implemented.");
  }

  override point(time: number): Vector2 {
    const c = Math.cos(2 * Math.PI * time);
    const s = Math.sin(2 * Math.PI * time);
    const r = Math.pow(Math.pow(Math.abs(c), this.p) + Math.pow(Math.abs(s), this.p), -1 / this.p);
    return new Vector2(r * c, r * s);
  }

  override time(point: Vector2): number {
    return point.normalize().angle() / (2 * Math.PI);
  }

  override tangentVector(time: number): Vector2 {
    const c = Math.cos(2 * Math.PI * time);
    const s = Math.sin(2 * Math.PI * time);
    if ((4 * time) % 1 === 0) {
      return new Vector2(-s, c);
    }
    const r = Math.pow(Math.pow(Math.abs(c), this.p) + Math.pow(Math.abs(s), this.p), -1 / this.p);

    const rp = -1 / this.p * Math.pow(Math.pow(Math.abs(c), this.p) + Math.pow(Math.abs(s), this.p), -1 / this.p - 1)
      * (-Math.pow(Math.abs(c), this.p - 1) * s * c / Math.abs(c) + Math.pow(Math.abs(s), this.p - 1) * c * s / Math.abs(s)
      ) * this.p;

    let v = new Vector2(
      (rp * c - r * s),
      rp * s + r * c,
    );
    return v.normalize();
  }

  override interior(point: Vector2): boolean {
    return Math.pow(Math.abs(point.x), this.p) + Math.pow(Math.abs(point.y), this.p) <= 1;
  }

  override boundary(point: Vector2): boolean {
    return closeEnough(Math.pow(Math.abs(point.x), this.p) + Math.pow(Math.abs(point.y), this.p), 1);
  }
}