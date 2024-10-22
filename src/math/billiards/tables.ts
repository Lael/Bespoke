import {Complex} from "../complex";
import {ColorRepresentation, Mesh, Shape, Vector2, Vector3} from "three";
import {Generator} from "./new-billiard";
import {LineSegment} from "../geometry/line-segment";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";
import {closeEnough} from "../math-helpers";
import {AffineRay} from "./affine-polygon-table";
import {SpherePoint, SphericalArc} from "../geometry/spherical";
import {ThickLine} from "../../graphics/thickline";

export type AffineInnerState = {
    time: number;
    angle: number;
}

export abstract class AffineOuterBilliardTable {
    abstract point(time: number): Vector2;

    abstract time(point: Vector2): number;

    abstract tangentHeading(time: number): number | undefined;

    abstract leftTangentPoint(point: Vector2): Vector2;

    abstract rightTangentPoint(point: Vector2): Vector2;

    abstract leftTangentLine(circle: AffineCircle): Line;

    abstract rightTangentLine(circle: AffineCircle): Line;

    abstract containsPoint(point: Vector2): boolean;

    abstract pointOnBoundary(point: Vector2): boolean;

    outer(point: Vector2, generator: Generator, inverse = false): Vector2 {
        switch (generator) {
        case Generator.LENGTH:
            let lt = this.leftTangentPoint(point);
            let rt = this.rightTangentPoint(point);
            let fourthCircle = this.outerLengthCircle(point, inverse);
            if (inverse) {
                let l1 = this.leftTangentLine(fourthCircle);
                let l2 = Line.throughTwoPoints(point, lt);
                return l1.intersectLine(l2).toVector2();
            } else {
                let l1 = this.rightTangentLine(fourthCircle);
                let l2 = Line.throughTwoPoints(point, rt);
                return l1.intersectLine(l2).toVector2();
            }
        case Generator.AREA:
            let invertPoint: Vector2;
            if (inverse) {
                invertPoint = this.leftTangentPoint(point);
            } else {
                invertPoint = this.rightTangentPoint(point);
            }
            return invertPoint.clone().sub(point).add(invertPoint);
        }
    }

    outerLengthCircle(point: Vector2, reverse: boolean = false) {
        const t1 = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
        const t2 = reverse ? this.rightTangentPoint(point) : this.leftTangentPoint(point);
        const d = t1.distanceTo(point);
        const m = point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
        const lf = Line.throughTwoPoints(point, t1);
        const lb = Line.throughTwoPoints(point, t2);
        const pf = lf.perpAtPoint(t1);
        const pb = lb.perpAtPoint(m);
        const cc = pf.intersectLine(pb);
        const radius = cc.toVector2().distanceTo(t1);
        return new AffineCircle(cc, radius);
    }

    iterateOuter(start: Vector2, generator: Generator, iters: number, computeCenters: boolean = false): Vector2[][] {
        if (this.containsPoint(start)) {
            // console.log(`point is in interior of table: <${start.x}, ${start.y}>`);
            return [[], []];
        }
        if (this.pointOnBoundary(start)) {
            // console.log(`point is on boundary of table: <${start.x}, ${start.y}>`);
            return [[], []];
        }
        const points = [start];
        const centers: Vector2[] = [];
        let point = start;
        for (let i = 0; i < iters; i++) {
            let newPoint: Vector2;
            try {
                newPoint = this.outer(point, generator);
                points.push(newPoint);
                if (computeCenters) {
                    if (generator === Generator.LENGTH) {
                        const circle = this.outerLengthCircle(point, false);
                        centers.push(circle.center.toVector2());
                    } else {
                        centers.push(point.clone().add(newPoint).multiplyScalar(0.5));
                    }
                }
            } catch (e) {
                console.log(e);
                return [points, centers];
            }
            point = newPoint;
            // if (closeEnough(newPoint.distanceTo(start), 0)) break;
        }
        return [points, centers];
    }

    shape(n: number): Shape {
        let points = [];
        for (let i = 0; i <= n; i++) {
            points.push(this.point(i * (1.0 / n)));
        }
        let s = new Shape(points);
        return s;
    }

    preimages(flavor: Generator, iterations: number): AffineRay[] {
        return [];
    }

    headingCoords(point: Vector2): Vector2 {
        const r = this.rightTangentPoint(point);
        const l = this.leftTangentPoint(point);
        const x = point.clone().sub(l).angle();
        const y = r.clone().sub(point).angle();
        return new Vector2(
            x, y
        );
    }
}


export abstract class SphericalOuterBilliardTable {
    abstract point(time: number): SpherePoint;

    abstract time(point: SpherePoint): number;

    abstract tangentVector(time: number): Vector3 | undefined;

    abstract leftTangentPoint(point: SpherePoint): SpherePoint;

    abstract rightTangentPoint(point: SpherePoint): SpherePoint;

    abstract containsPoint(point: SpherePoint): boolean;

    abstract pointOnBoundary(point: SpherePoint): boolean;

    outer(point: SpherePoint, inverse = false): SpherePoint[] {
        let invertPoint: SpherePoint;
        if (inverse) {
            invertPoint = this.leftTangentPoint(point);
        } else {
            invertPoint = this.rightTangentPoint(point);
        }
        return [point.reflectThrough(invertPoint), invertPoint];
    }

    iterateOuter(start: SpherePoint, iters: number): SpherePoint[][] {
        if (this.containsPoint(start) || this.containsPoint(start.antipode)) {
            console.log(`point or antipode is in interior of table: <${start.x}, ${start.y}>`);
            return [[start], []];
        }
        if (this.pointOnBoundary(start) || this.pointOnBoundary(start.antipode)) {
            console.log(`point or antipode  is on boundary of table: <${start.x}, ${start.y}>`);
            return [[start], []];
        }
        const points = [start];
        const centers = [];
        let point = start;
        for (let i = 0; i < iters; i++) {
            let newPoint, center;
            try {
                [newPoint, center] = this.outer(point);
                points.push(newPoint);
                centers.push(center);
            } catch (e) {
                console.log(e);
                return [points, centers];
            }
            point = newPoint;
            if (closeEnough(newPoint.distanceTo(start), 0)) break;
        }
        return [points, centers];
    }

    mesh(n: number, color: ColorRepresentation, stereograph: boolean): Mesh {
        let points = [];
        for (let i = 0; i <= n; i++) {
            points.push(this.point(i * (1.0 / n)).coords);
        }
        // return new ThickLine(points, 6, 0.1, 0xff0000).mesh;
        return new ThickLine([
            new Vector3(0, 1, 0),
            new Vector3(0, 2, 0),
            new Vector3(2, 2, 0),
            new Vector3(2, 2, 2),
        ], 12, 0.1, color).mesh;
    }

    abstract preimages(flavor: Generator, iterations: number): SphericalArc[];
}

export function fixTime(time: number): number {
    let t = time % 1;
    if (t < 0) t += 1;
    return t;
}

// Arguments:
// ip, g1, g2, tp
// ip is intersection, tp lies on g1, circle should be between positive directions of g1 and g2
// export function affineFourthCircle(ip: AffinePoint,
//                                    g1: AffineGeodesic,
//                                    g2: AffineGeodesic,
//                                    tp: AffinePoint): Circle<AffinePoint> {
//     const v1 = g1.p2.resolve().minus(g1.p1.resolve()).normalize();
//     const v2 = g2.p2.resolve().minus(g2.p1.resolve()).normalize();
//     const bv = v1.plus(v2).normalize();
//     const ab = new AffineGeodesic(ip, new AffinePoint(ip.resolve().plus(bv)), true, true);
//     const pv = v1.times(new Complex(0, 1));
//     const pl = new AffineGeodesic(tp, new AffinePoint(tp.resolve().plus(pv)), true, true);
//     const c = ab.intersect(pl);
//     if (c === undefined) throw Error('No circle intersection');
//     return new Circle<AffinePoint>(
//         c, c.distance(tp)
//     );
// }

// Arguments:
// ip, g1, g2, tp
// ip is intersection, tp lies on g1, circle should be between positive directions of g1 and g2
export function affineFourthCircle(ip: Vector2,
                                   g1: LineSegment,
                                   g2: LineSegment,
                                   tp: Vector2): AffineCircle {
    const v1 = g1.end.minus(g1.start).toVector2().normalize();
    const v2 = g2.end.minus(g2.start).toVector2().normalize();
    const bv = v1.clone().add(v2).normalize();
    const ab = Line.throughTwoPoints(ip, ip.clone().add(bv));
    const pv = new Vector2(-v1.y, v1.x);
    const pl = Line.throughTwoPoints(tp, tp.clone().add(pv));
    const c = ab.intersectLine(pl);
    if (c === undefined) throw Error('No circle intersection');
    return new AffineCircle(
        c, c.distance(Complex.fromVector2(tp))
    );
}
