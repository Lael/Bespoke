import {Vector3} from "three";
import {Plane} from "./plane";
import {closeEnough} from "../math-helpers";

export class Line3D {
    constructor(readonly start: Vector3, readonly direction: Vector3) {
    }

    intersectPlane(plane: Plane): Vector3|null {
        const d = this.direction.dot(plane.normal);
        if (closeEnough(d, 0)) return null;
        const w = this.start.clone().sub(plane.point);
        const factor = -(w.dot(plane.normal)) / d;
        return this.start.clone().add(this.direction.clone().multiplyScalar(factor));

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

    intersectPlane(plane: Plane): Vector3|null {
        const i = this.line.intersectPlane(plane);
        if (!!i && this.containsPoint(i)) return i;
        return null;
    }
}