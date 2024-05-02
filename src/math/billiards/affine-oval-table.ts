import {Vector2} from "three";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";
import {normalizeAngle} from "../math-helpers";
import {AffineOuterBilliardTable, fixTime} from "./tables";
import {Complex} from "../complex";

export type Parametrization = (t: number) => Vector2;
export type ContainmentTest = (v: Vector2) => boolean;

export function lpCircle(p: number, xScale: number = 1): AffineOvalTable {
    // x^p + y^p = 1
    // x(t) = cos^(2/p)(t), x'(t) = -(2/p)cos^(2/p - 1)(t)*sin(t)
    // y(t) = sin^(2/p)(t), y'(t) = (2/p)sin^(2/p - 1)(t)*cos(t)
    const parametrization = (t: number) => {
        const c = Math.cos(2 * Math.PI * t);
        const s = Math.sin(2 * Math.PI * t);
        const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);
        return new Vector2(r * c * xScale, r * s);
    };
    const derivative = (t: number) => {
        const c = Math.cos(2 * Math.PI * t);
        const s = Math.sin(2 * Math.PI * t);
        if (4 * t % 1 === 0) {
            return new Vector2(-s, c);
        }
        const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);

        const rp = -1 / p * Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p - 1)
            * (-Math.pow(Math.abs(c), p - 1) * s * c / Math.abs(c) + Math.pow(Math.abs(s), p - 1) * c * s / Math.abs(s)
            ) * p;

        let v = new Vector2(
            (rp * c - r * s) * xScale,
            rp * s + r * c,
        );
        return v.normalize();
    }
    const containmentTest = (v: Vector2) => Math.pow(Math.abs(v.x), p) + Math.pow(Math.abs(v.y), p) <= 1;
    return new AffineOvalTable(parametrization, derivative, containmentTest);
}

const EPSILON = 0.000_001;

// function derivative(value: (t: number) => number, t: number): number {
//     return (value(t + EPSILON) - value(t - EPSILON)) / (2 * EPSILON);
// }

// function findOnInterval(value: (t: number) => number,
//                         debug: boolean = false,
//                         start: number,
//                         end: number): number {
//     if (closeEnough(start, end)) return start;
//     let g1 = start;
//     let g2 = start + (end - start) / 3;
//     let g3 = start + 2 * (end - start) / 3;
//     let g4 = end;
//     // let v1 = value(g1);
//     // let v2 = value(g2);
//     // let v3 = value(g3);
//     // let v4 = value(g4);
//     // ddd -> g3, g4
//     // ddu -> g2, g4
//     // dud -> g1, g3 (assert(v1 < v3))
//     // udd ->
//     // duu ->
//     // udu ->
//     // uud ->
//     // uuu ->
//     return 0;
// }

// Assumptions: value(t) = value(t + 1) & value has one min and one max on [0, 1).
function findOnCircle(value: (t: number) => number): number {
    return value(0);
}

// Assumed to be smooth and strictly convex
export class AffineOvalTable extends AffineOuterBilliardTable {

    point(time: number): Vector2 {
        return this.parametrization(fixTime(time));
    }

    time(point: Vector2): number {
        const bestGuess = findOnCircle(
            (t: number) => {
                return this.parametrization(t).distanceTo(point)
            }
        )
        if (this.parametrization(bestGuess).distanceTo(point) > EPSILON) {
            throw Error('point does not lie on curve');
        }
        return bestGuess;
    }

    tangentHeading(time: number): number {
        return this.tangent(fixTime(time)).angle();
    }

    leftTangentLine(circle: AffineCircle): Line {
        // console.log('finding left tangent line');
        const bestGuess = findOnCircle(
            (t: number) => {
                const pt = this.parametrization(t);
                const th = this.tangentHeading(t);
                const cp = circle.rightTangentPoint(Complex.fromVector2(pt)).toVector2();
                const d = cp.sub(pt);
                return Math.pow(normalizeAngle(th - d.angle()), 2);
            }
        );

        const pt = this.parametrization(bestGuess);
        return Line.throughTwoPoints(pt, circle.rightTangentPoint(Complex.fromVector2(pt)).toVector2());
    }

    rightTangentLine(circle: AffineCircle): Line {
        // console.log('finding right tangent line');
        const bestGuess = findOnCircle(
            (t: number) => {
                const pt = this.parametrization(t);
                const th = this.tangentHeading(t);
                const cp = circle.leftTangentPoint(Complex.fromVector2(pt)).toVector2();
                const d = pt.sub(cp);
                return Math.pow(normalizeAngle(th - d.angle()), 2);
            }
        );

        const pt = this.parametrization(bestGuess);
        return Line.throughTwoPoints(pt, circle.leftTangentPoint(Complex.fromVector2(pt)).toVector2());
    }

    containsPoint(point: Vector2): boolean {
        return this.contains(point);
    }

    pointOnBoundary(point: Vector2): boolean {
        try {
            this.time(point);
            return true;
        } catch (e) {
            return false;
        }
    }

    constructor(
        private readonly parametrization: Parametrization,
        private readonly tangent: Parametrization,
        private readonly contains: ContainmentTest) {
        super();
    }

    points(divisions: number): Vector2[] {
        const points = [];
        for (let i = 0; i < divisions; i++) {
            points.push(this.parametrization(i / divisions));
        }
        return points;
    }

    tangentialAngle(t: number, p: Vector2, sign: number) {
        const r = this.parametrization(t)
        return angle3(
            r,
            r.clone().add(this.tangent(t).multiplyScalar(sign)),
            p,
        );
    }

    // left as viewed by the point
    leftTangentPoint(point: Vector2): Vector2 {
        if (this.contains(point)) {
            throw Error('point inside table');
        }
        const t1 = point.angle() / (2 * Math.PI) + 0.5;
        const t2 = point.angle() / (2 * Math.PI) + 1;
        const a1 = this.tangentialAngle(t1, point, 1);
        const a2 = this.tangentialAngle(t2, point, 1);
        if (a1 === 0) return this.parametrization(t1);
        if (a2 === 0) return this.parametrization(t2);
        let interval: Vector2;
        let ma;
        if (a1 > 0 && a2 < 0) {
            interval = new Vector2(t1, t2);
        } else {
            throw Error('bad parametrization');
        }
        let m = 0.5 * (interval.x + interval.y);
        let safety = 0;
        while (Math.abs(ma = this.tangentialAngle(m, point, 1)) > 0.000_000_1 && safety < 100) {
            safety++;
            if (ma === 0) break;
            else if (ma > 0) interval.x = m;
            else if (ma < 0) interval.y = m;
            m = 0.5 * (interval.x + interval.y);
        }

        return this.parametrization(m);
    }

    // right as viewed by the point
    rightTangentPoint(point: Vector2): Vector2 {
        if (this.contains(point)) {
            throw Error('point inside table');
        }
        // if (this.rightTangent) return this.rightTangent(point);
        const t1 = point.angle() / (2 * Math.PI);
        const t2 = point.angle() / (2 * Math.PI) + 0.5;
        const a1 = this.tangentialAngle(t1, point, -1);
        const a2 = this.tangentialAngle(t2, point, -1);
        if (a1 === 0) return this.parametrization(t1);
        if (a2 === 0) return this.parametrization(t2);
        let interval: Vector2;
        let ma;
        if (a1 > 0 && a2 < 0) {
            interval = new Vector2(t1, t2);
        } else {
            throw Error('bad parametrization');
        }
        let m = 0.5 * (interval.x + interval.y);
        let safety = 0;
        while (Math.abs(ma = this.tangentialAngle(m, point, -1)) > 0.000_000_1 && safety < 100) {
            safety++;
            if (ma === 0) break;
            else if (ma > 0) interval.x = m;
            else if (ma < 0) interval.y = m;
            m = 0.5 * (interval.x + interval.y);
        }

        return this.parametrization(m);
    }
}

function angle3(v1: Vector2, v2: Vector2, v3: Vector2): number {
    try {
        const h1 = v2.clone().sub(v1).angle();
        const h2 = v3.clone().sub(v1).angle();
        return normalizeAngle(h2 - h1, -Math.PI);
    } catch (e) {
        console.log(v1, v2, v3);
        throw e;
    }
}