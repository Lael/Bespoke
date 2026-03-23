import {Vector3} from "three";
import {Plane} from "./plane";
import {closeEnough} from "../math-helpers";

export class Line3D {
  constructor(readonly start: Vector3, readonly direction: Vector3) {
  }

  intersectPlane(plane: Plane): Vector3 | null {
    const d = this.direction.dot(plane.normal);
    if (closeEnough(d, 0)) return null;
    const w = this.start.clone().sub(plane.point);
    const factor = -(w.dot(plane.normal)) / d;
    return new Vector3(
      this.start.x + factor * this.direction.x,
      this.start.y + factor * this.direction.y,
      this.start.z + factor * this.direction.z,
    );
  }

  containsPoint(v: Vector3): boolean {
    return closeEnough(v.clone().sub(this.project(v)).lengthSq(), 1e-16);
  }

  project(v: Vector3): Vector3 {
    const diff = v.clone().sub(this.start);
    const dot = diff.dot(this.direction);
    const proj = this.direction.clone().multiplyScalar(dot / this.direction.lengthSq());
    return this.start.clone().add(proj);
  }

  time(v: Vector3) {
    if (!this.containsPoint(v)) throw Error('point not on line');
    const diff = v.clone().sub(this.start);
    return diff.dot(this.direction);
  }
}

export class LineSegment3D {
  readonly line: Line3D;
  readonly length: number;
  readonly _start: Vector3;
  readonly _end: Vector3;

  constructor(start: Vector3, end: Vector3) {
    this._start = start;
    this._end = end;
    this.line = new Line3D(start, end.clone().sub(start));
    this.length = start.distanceTo(end);
  }

  get start(): Vector3 {
    return this._start.clone();
  }

  get end(): Vector3 {
    return this._end.clone();
  }

  containsPoint(point: Vector3): boolean {
    return closeEnough(point.distanceTo(this._start) + point.distanceTo(this._end), this.length);
  }

  intersectPlane(plane: Plane): Vector3 | null {
    const i = this.line.intersectPlane(plane);
    if (!!i && this.containsPoint(i)) return i;
    return null;
  }
}