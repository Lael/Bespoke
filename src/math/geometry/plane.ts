import {Vector3} from "three";
import {closeEnough} from "../math-helpers";

export class Plane {
    // ax + by + cy + d = 0
    constructor(private readonly a: number,
                private readonly b: number,
                private readonly c: number,
                private readonly d: number,
    ) {
        if (this.normal.length() === 0) throw new Error('Zero normal');
    }

    get normal(): Vector3 {
        return new Vector3(this.a, this.b, this.c);
    }

    get point(): Vector3 {
        return this.normal.setLength(-this.d / this.normal.lengthSq());
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

    // intersect(other: Geometry): Line3D|Geometry|null {
    //     // Are these planes parallel?
    //     const sa = this.a / other.a;
    //     const sb = this.b / other.b;
    //     const sc = this.c / other.c;
    //     if (sa === sb && sb === sc) {
    //         if (other.d * sa === this.d) return this;
    //         else return null;
    //     }
    //
    //     // Find any point in the intersection
    //
    //     // Find direction
    //
    //     const direction = this.normal.cross(other.normal);
    //     return null;
    // }

    equals(other: Plane) {
        const sa = this.a / other.a;
        const sb = this.b / other.b;
        const sc = this.c / other.c;
        if (sa === sb && sb === sc) return (other.d * sa === this.d);
        return false;
    }
}