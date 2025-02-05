import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex";
import {Mobius} from "../../../math/mobius";
import {AffinePolygon} from "./affine-polygon";
import {HyperbolicRay} from "./hyperbolic-ray";
import {EPSILON} from "../../../math/math-helpers";

export interface HyperbolicPolygonRayCollision {
    point: HyperPoint;
    sideIndex: number;
}

export class HyperbolicPolygon {
    vertices: HyperPoint[];
    n: number;
    sides: HyperGeodesic[] = [];

    constructor(vertices: HyperPoint[]) {
        this.vertices = vertices;
        this.n = vertices.length;
        for (let i = 0; i < this.n; i++) {
            this.sides.push(
                new HyperGeodesic(
                    this.vertices[i],
                    this.vertices[(i + 1) % this.n],
                )
            );
        }
    }

    static regular(n: number, sideLength: number): HyperbolicPolygon {
        const theta = 2 * Math.PI / n;
        const rh = Math.asinh(Math.sqrt(
            (Math.cosh(sideLength) - 1) / (1 - Math.cos(theta))
        ));
        const rp = Math.tanh(rh / 2);
        let vertices = [];
        for (let i = 0; i < n; i++) {
            vertices.push(HyperPoint.fromPoincare(Complex.polar(rp, i * theta)));
        }
        return new HyperbolicPolygon(vertices);
    }

    transform(mobius: Mobius): HyperbolicPolygon {
        return new HyperbolicPolygon(this.vertices.map(v =>
            HyperPoint.fromPoincare(mobius.apply(v.poincare))));
    }

    contains(point: HyperPoint): boolean {
        return new AffinePolygon(this.vertices.map(v => v.klein.toVector2()))
            .contains(point.klein.toVector2());
    }

    castRay(ray: HyperbolicRay): HyperbolicPolygonRayCollision {
        if (!this.contains(ray.src)) {
            throw new Error("HyperbolicPolygon does not contain point");
        }
        let rayGeo = HyperGeodesic.poincareRay(ray.src, ray.poincareDir);
        let rayGeoKlein = rayGeo.segment(HyperbolicModel.KLEIN);
        let bestT = Number.POSITIVE_INFINITY;
        let bestCollision: HyperbolicPolygonRayCollision = {
            point: rayGeo.q,
            sideIndex: -1,
        };
        for (let i = 0; i < this.vertices.length; i++) {
            const side = this.sides[i];
            let intersection = rayGeo.intersect(side);
            if (intersection == undefined) continue;
            if (!rayGeoKlein.containsPoint(intersection.klein) || !side.containsPoint(intersection)) continue;
            let t = intersection.distance(ray.src);
            if (t > 0 && t < bestT) {
                bestT = t;
                bestCollision = {
                    point: intersection,
                    sideIndex: i,
                }
            }
        }
        if (bestCollision == undefined) throw new Error('no collision');
        for (let v of this.vertices) {
            if (bestCollision.point.distance(v) < EPSILON) throw new Error('hit a vertex')
        }
        return bestCollision;
    }
}