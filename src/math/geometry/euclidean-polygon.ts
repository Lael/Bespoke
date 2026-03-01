import {Vector2} from "three";
import {LineSegment} from "./line-segment";
import {EPSILON, normalizeAngle} from "../math-helpers";
import {Line as GeoLine} from "./line";
import {EuclideanRay} from "./euclidean-ray";
import {fixTime} from "../billiards/tables";
import {EuclideanShape, NormalPair, ShapeData, ShapeRayCollision} from "./euclidean-shape";

export interface EuclideanPolygonRayCollision extends ShapeRayCollision {
  sideIndex: number;
}

export class EuclideanPolygon implements EuclideanShape {
  public readonly n: number;
  vertices: Vector2[];

  private _area: number | undefined = undefined;

  constructor(vertices: Vector2[]) {
    this.vertices = vertices;
    this.n = vertices.length;
  }

  static regular(n: number, sidelength?: number) {
    let circumRadius = !!sidelength ? 0.5 * sidelength / Math.sin(Math.PI / n) : 1;
    let vertices = [];
    let theta = 2.0 * Math.PI / n;
    for (let i = 0; i < n; i++) {
      vertices[i] = new Vector2(
        circumRadius * Math.cos(i * theta),
        circumRadius * Math.sin(i * theta),
      );
    }
    return new EuclideanPolygon(vertices);
  }

  shapeData(): ShapeData {
    return {
      path: this.vertices.concat([this.vertices[0]]),
      dots: this.vertices,
    }
  }

  normal(sideIndex: number): Vector2 {
    let v1 = this.vertices[sideIndex];
    let v2 = this.vertices[(sideIndex + 1) % this.n];
    return v2.clone().sub(v1).rotateAround(new Vector2(), -Math.PI / 2).normalize();
  }

  param(t: number): NormalPair {
    const time = fixTime(t) * this.perimeter;
    let s = 0;
    for (let i = 0; i < this.n; i++) {
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % this.n];
      let sl = v1.distanceTo(v2);
      if (s + sl > time) {
        return {
          point: v1.clone().lerp(v2, (time - s) / sl),
          normal: v2.clone().sub(v1).rotateAround(new Vector2(), -Math.PI / 2).normalize()
        };
      }
      s += sl;
    }
    throw Error('no normal pair found');
  }

  get perimeter(): number {
    let p = 0;
    for (let i = 0; i < this.n; i++) {
      p += this.vertices[i].distanceTo(this.vertices[(i + 1) % this.n]);
    }
    return p;
  }

  area(): number {
    if (this._area === undefined) {
      let a = 0;
      let left;
      let right = this.vertices[0].clone();
      for (let i = 0; i < this.n; i++) {
        left = right;
        right = this.vertices[(i + 1) % this.n].clone();
        a += left.cross(right);
      }
      this._area = Math.abs(a) / 2;
    }
    return this._area;
  }

  contains(point: Vector2) {
    // Winding number accumulator
    let wn = 0;
    for (let i = 0; i < this.n; i++) {
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % this.n];
      if (new LineSegment(v1, v2).containsPoint(point)) return true;
      wn += normalizeAngle(
        v2.clone().sub(point).angle() - v1.clone().sub(point).angle()
      );
    }
    return wn > Math.PI;
  }

  castRay(ray: EuclideanRay): EuclideanPolygonRayCollision {
    if (!this.contains(ray.src)) {
      // EuclideanPolygon does not contain ray source for some reason. In practice, this likely means that the previous
      // collision was very close to a corner, so the step forward by epsilon hops over the polygon.
      throw new Error("EuclideanPolygon does not contain ray source");
    }
    let rayLine = GeoLine.srcDir(ray.src, ray.dir);
    let bestT = Number.POSITIVE_INFINITY;
    let bestIntersection: EuclideanPolygonRayCollision | undefined = undefined;
    let s = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      // loop over the sides of the polygon
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % this.n];
      let side = new LineSegment(v1, v2);
      let intersection = side.intersectLine(rayLine)?.toVector2();
      if (intersection == undefined) {
        s += side.length;
        continue;
      }
      // t as in r(t) = P + tV. This is essentially the (signed) distance from the source to the collision
      let t = intersection.clone().sub(ray.src).dot(ray.dir);
      if (t < 0) {
        // negative t means the collision is behind the start point
        s += side.length;
        continue;
      }
      if (t < bestT) {
        // this collision is closer than the previous closest
        bestT = t;
        bestIntersection = {
          point: intersection,
          sideIndex: i,
          paramTime: (intersection.distanceTo(v1) + s) / this.perimeter
        };
      }
      s += side.length;
    }
    if (bestIntersection == undefined) {
      throw new Error("No intersection");
    }
    for (let v of this.vertices) {
      if (bestIntersection.point.distanceTo(v) < EPSILON) {
        throw new Error("Hit a vertex");
      }
    }
    return bestIntersection;
  }

  support(p: Vector2): number {
    let m = 0;
    for (let v of this.vertices) {
      const d = v.dot(p);
      if (d > m) m = d;
    }
    return m;
  }

  rotate(angle: number): EuclideanPolygon {
    return new EuclideanPolygon(
      this.vertices.map(v => v.clone().rotateAround(new Vector2(), angle))
    );
  }

  translate(diff: Vector2): EuclideanPolygon {
    return new EuclideanPolygon(
      this.vertices.map(v => v.clone().add(diff))
    );
  }

  scale(factor: number): EuclideanPolygon {
    return new EuclideanPolygon(
      this.vertices.map(v => v.clone().multiplyScalar(factor))
    );
  }

  corners(): number[] {
    let p = 0;
    let corners = [0];
    for (let i = 0; i < this.n; i++) {
      const l = this.vertices[i].distanceTo(this.vertices[(i + 1) % this.n]);
      p += l;
      corners.push(p);
    }
    return corners.map(l => l / p);
  }
}