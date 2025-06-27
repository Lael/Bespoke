import {Vector4} from "three";
import {HyperplaneRayIntersection, Ray4D} from "./ray4D";
import {closeEnough} from "../../math-helpers";

export class Hyperplane {
    // ax + by + cz + dw + e = 0
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;

    n: Vector4;

    constructor(a: number, b: number, c: number, d: number, e: number) {
        const v = new Vector4(a, b, c, d);
        let l = v.length();
        if (l === 0) throw Error('degenerate hyperplane');
        if (a < 0
            || (a === 0 && b < 0)
            || (a === 0 && b === 0 && c < 0)
            || (a === 0 && b === 0 && c === 0 && d < 0)) {
            l *= -1;
        }
        this.a = a / l;
        this.b = b / l;
        this.c = c / l;
        this.d = d / l;
        this.e = e / l;
        this.n = new Vector4(this.a, this.b, this.c, this.d);
    }

    intersectRay(ray: Ray4D): HyperplaneRayIntersection | undefined {
        const dot = ray.dir.dot(this.n);
        // check for non-transverse configuration
        if (dot === 0) return undefined;
        const t = (this.e - ray.src.dot(this.n)) / dot;
        const point = ray.src.clone().addScaledVector(ray.dir, t);
        return {t, point};
    }

    containsPoint(p: Vector4) {
        return closeEnough(this.n.dot(p), this.e);
    }
}