import {Vector3} from "three";
import {closeEnough} from "../math-helpers";
import {Line3D} from "./line3D";

export class Plane {
  // ax + by + cy + d = 0
  constructor(readonly a: number,
              readonly b: number,
              readonly c: number,
              readonly d: number,
  ) {
    if (this.normal.length() === 0) throw new Error('Zero normal');
  }

  get normal(): Vector3 {
    return new Vector3(this.a, this.b, this.c).normalize();
  }

  get point(): Vector3 {
    return this.normal.setLength(-this.d / new Vector3(this.a, this.b, this.c).lengthSq());
  }

  static fromPointAndNormal(point: Vector3, normal: Vector3): Plane {
    if (normal.length() === 0) throw new Error('Zero normal');
    const n = normal.normalize();
    return new Plane(n.x, n.y, n.z, -n.dot(point));
  }

  static fromThreePoints(p1: Vector3, p2: Vector3, p3: Vector3) {
    if (p1.equals(p2) || p2.equals(p3) || p3.equals(p1)) throw new Error('Repeated point');
    const normal = p2.clone().sub(p1).cross(p3.clone().sub(p1));
    return this.fromPointAndNormal(p1.clone(), normal);
  }

  containsPoint(point: Vector3): boolean {
    return closeEnough(this.normal.dot(point), -this.d);
  }

  intersect(that: Plane): Line3D {
    const [a1, b1, c1, d1] = [this.a, this.b, this.c, this.d];
    const [a2, b2, c2, d2] = [that.a, that.b, that.c, that.d];

    // Find direction
    const direction = this.normal.cross(that.normal);

    // Find any point in the intersection
    let point: Vector3;
    const dx = b1 * c2 - c1 * b2;
    const dy = a1 * c2 - c1 * a2;
    const dz = a1 * b2 - b1 * a2;

    if (!closeEnough(dx, 0)) {
      point = new Vector3(c2 * d1 - c1 * d2, b1 * d1 - b2 * d2).multiplyScalar(1 / dx);
    } else if (!closeEnough(dy, 0)) {
      point = new Vector3(c2 * d1 - c1 * d2, a1 * d1 - a2 * d2).multiplyScalar(1 / dy);
    } else if (!closeEnough(dz, 0)) {
      point = new Vector3(b2 * d1 - b1 * d2, a1 * d1 - a2 * d2).multiplyScalar(1 / dz);
    } else {
      throw Error('planes do not intersect');
    }
    return new Line3D(point, direction);
  }

  equals(that: Plane) {
    return parallel(this.normal, that.normal) && this.containsPoint(that.point);
  }
}

function parallel(v1: Vector3, v2: Vector3): boolean {
  return closeEnough(v1.clone().cross(v2).length(), 0);
}
