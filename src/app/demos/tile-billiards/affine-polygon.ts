import {Vector2} from "three";
import {LineSegment} from "../../../math/geometry/line-segment";
import {EPSILON, normalizeAngle} from "../../../math/math-helpers";
import {Line} from "../../../math/geometry/line";
import {AffineRay} from "./affine-ray";

export interface AffinePolygonRayCollision {
    point: Vector2;
    sideIndex: number;
}

export class AffinePolygon {
    public readonly n: number;
    vertices: Vector2[];

    constructor(vertices: Vector2[]) {
        this.vertices = vertices;
        this.n = vertices.length;
    }

    static regular(n: number, sidelength: number) {
        let circumRadius = 0.5 * sidelength / Math.sin(Math.PI / n);
        let vertices = [];
        let theta = 2.0 * Math.PI / n;
        for (let i = 0; i < n; i++) {
            vertices[i] = new Vector2(
                circumRadius * Math.cos(i * theta),
                circumRadius * Math.sin(i * theta),
            );
        }
        return new AffinePolygon(vertices);
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

    castRay(ray: AffineRay): AffinePolygonRayCollision {
        if (!this.contains(ray.src)) {
            // AffinePolygon does not contain ray source for some reason. In practice, this likely means that the previous
            // collision was very close to a corner, so the step forward by epsilon hops over the polygon.
            throw new Error("AffinePolygon does not contain ray source");
        }
        let rayLine = Line.srcDir(ray.src, ray.dir);
        let bestT = Number.POSITIVE_INFINITY;
        let bestIntersection: AffinePolygonRayCollision | undefined = undefined;
        for (let i = 0; i < this.vertices.length; i++) {
            // loop over the sides of the polygon
            let v1 = this.vertices[i];
            let v2 = this.vertices[(i + 1) % this.n];
            let side = new LineSegment(v1, v2);
            let intersection = side.intersectLine(rayLine)?.toVector2();
            if (intersection == undefined) {
                continue;
            }
            // t as in r(t) = P + tV. This is essentially the (signed) distance from the source to the collision
            let t = intersection.clone().sub(ray.src).dot(ray.dir);
            if (t < 0) {
                // negative t means the collision is behind the start point
                continue;
            }
            if (t < bestT) {
                // this collision is closer than the previous closest
                bestT = t;
                bestIntersection = {
                    point: intersection,
                    sideIndex: i,
                };
            }
        }
        if (bestIntersection == undefined) throw new Error("No intersection");
        for (let v of this.vertices) {
            if (bestIntersection.point.distanceTo(v) < EPSILON) {
                throw new Error("Hit a vertex");
            }
        }
        return bestIntersection;
    }

    rotate(angle: number): AffinePolygon {
        return new AffinePolygon(
            this.vertices.map(v => v.clone().rotateAround(new Vector2(), angle))
        );
    }

    translate(diff: Vector2): AffinePolygon {
        return new AffinePolygon(
            this.vertices.map(v => v.clone().add(diff))
        );
    }
}