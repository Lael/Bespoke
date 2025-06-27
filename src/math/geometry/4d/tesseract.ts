import {Hyperplane} from "./hyperplane";
import {PolytopeRayCollision, Ray4D} from "./ray4D";
import {Vector4} from "three";
import {EPSILON} from "../../math-helpers";

export class Tesseract {

    facets: Hyperplane[];

    constructor() {
        this.facets = [
            new Hyperplane(1, 0, 0, 0, -1),
            new Hyperplane(1, 0, 0, 0, +1),
            new Hyperplane(0, 1, 0, 0, +1),
            new Hyperplane(0, 1, 0, 0, -1),
            new Hyperplane(0, 0, 1, 0, -1),
            new Hyperplane(0, 0, 1, 0, +1),
            new Hyperplane(0, 0, 0, 1, -1),
            new Hyperplane(0, 0, 0, 1, +1),
        ];
    }

    containsPoint(p: Vector4) {
        return (Math.abs(p.x) < 1 + EPSILON)
            && (Math.abs(p.y) < 1 + EPSILON)
            && (Math.abs(p.z) < 1 + EPSILON)
            && (Math.abs(p.w) < 1 + EPSILON);
    }

    castRay(ray: Ray4D): PolytopeRayCollision | undefined {
        let bestT = Number.POSITIVE_INFINITY;
        let bestIntersection: PolytopeRayCollision | undefined = undefined;
        for (let i = 0; i < this.facets.length; i++) {
            let intersection = this.facets[i].intersectRay(ray);
            if (intersection === undefined) {
                continue;
            }
            if (Math.abs(intersection.t) > EPSILON && Math.abs(intersection.t) < bestT) {
                bestT = intersection.t;
                bestIntersection = {
                    t: intersection.t,
                    point: intersection.point,
                    facet: i,
                };
            }
        }
        return bestIntersection;
    }


    normal(p: Vector4): Vector4 {
        let facet: Hyperplane | undefined = undefined;
        for (let f of this.facets) {
            if (f.containsPoint(p)) {
                if (facet !== undefined) throw Error('non-generic');
                facet = f;
            }
        }
        if (facet === undefined) throw Error('not on boundary');
        return facet.n;
    }
}