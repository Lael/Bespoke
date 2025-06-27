import {HyperbolicModel} from "../hyperbolic/hyperbolic";
import {Complex} from "../complex/complex";
import {Segment} from "./segment";
import {LineSegment} from "./line-segment";
import {Line} from "./line";
import {closeEnough} from "../math-helpers";
import {AffineCircle} from "./affine-circle";
import {Vector2, Vector2Like} from "three";

export interface PointLike {
    // distanceTo(other: PointLike): number;
    resolve(model?: HyperbolicModel): Complex;
    heading(other: PointLike): number;
}

export class AffinePoint implements PointLike {
    constructor(private complex: Complex) {
    }

    resolve(_?: HyperbolicModel): Complex {
        return new Complex(this.complex.real, this.complex.imag);
    }

    heading(other: AffinePoint): number {
        return this.resolve().heading(other.resolve());
    }

    distance(other: AffinePoint): number {
        return this.resolve().distance(other.resolve());
    }

    equals(other: AffinePoint): boolean {
        return this.resolve().equals(other.resolve());
    }

    rotate(theta: number): AffinePoint {
        return new AffinePoint(new Complex(0, theta).exp().times(this.complex));
    }

    translate(z: Vector2Like): AffinePoint {
        return new AffinePoint(this.complex.plus(new Complex(z.x, z.y)));
    }
}

export abstract class GeodesicLike<Point extends PointLike> {
    protected constructor(readonly p1: Point,
                          readonly p2: Point,
                          readonly infForward: boolean = false,
                          readonly infReverse: boolean = false) {
    }

    abstract reverse(): GeodesicLike<Point>;

    abstract heading1(): number;

    abstract heading2(): number;

    abstract segment(model: HyperbolicModel): Segment;
}

export class AffineGeodesic extends GeodesicLike<AffinePoint> {
    constructor(p1: AffinePoint,
                p2: AffinePoint,
                infForward: boolean = false,
                infReverse: boolean = false) {
        super(p1, p2, infForward, infReverse);
        if (p1.equals(p2)) {
            throw Error('Degenerate geodesic');
        }
    }

    reverse() {
        return new AffineGeodesic(this.p2, this.p1, this.infReverse, this.infForward);
    }

    heading1(): number {
        return this.p1.resolve().heading(this.p2.resolve());
    }

    heading2(): number {
        return this.p1.resolve().heading(this.p2.resolve());
    }

    override segment(model?: HyperbolicModel): Segment {
        let c1 = this.p1.resolve();
        let c2 = this.p2.resolve();
        const diff = c2.minus(c1).normalize(1000);
        if (this.infForward) c2 = c2.plus(diff);
        if (this.infReverse) c1 = c1.minus(diff);
        return new LineSegment(c1, c2);
    }

    split(geodesics: AffineGeodesic[]): AffineGeodesic[] {
        const splitPoints: AffinePoint[] = [];
        // if (this.infForward) splitPoints.push(this.p1);
        // if (this.infReverse) splitPoints.push(this.p2);
        for (let geodesic of geodesics) {
            const intersection = this.intersect(geodesic);
            if (!!intersection) {
                if (!this.infReverse && closeEnough(intersection.distance(this.p1), 0)) continue;
                if (!this.infForward && closeEnough(intersection.distance(this.p2), 0)) continue;
                splitPoints.push(intersection);
            }
        }
        if (splitPoints.length === 0) return [this];
        if (!this.infReverse) splitPoints.push(this.p1);
        if (!this.infForward) splitPoints.push(this.p2);


        // Sort split points carefully
        const before = splitPoints.filter(p =>
            closeEnough(p.distance(this.p2), p.distance(this.p1) + this.p1.distance(this.p2))
        );
        const after = splitPoints.filter(p =>
            !closeEnough(p.distance(this.p2), p.distance(this.p2) + this.p1.distance(this.p2))
        );

        before.sort((a, b) => b.distance(this.p1) - a.distance(this.p1));
        after.sort((a, b) => a.distance(this.p1) - b.distance(this.p1));
        const sorted = [...before, ...after];
        const splitGeodesics: AffineGeodesic[] = [];

        const c1 = this.p1.resolve();
        const c2 = this.p2.resolve();
        const diff = c2.minus(c1);
        if (this.infReverse) {
            const s = sorted[0];
            const sr = s.resolve();
            splitGeodesics.push(new AffineGeodesic(new AffinePoint(s.resolve().minus(diff)), s, false, true));
        }
        for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i];
            const b = sorted[i + 1];
            if (a.equals(b)) continue;
            splitGeodesics.push(new AffineGeodesic(a, b));
        }
        if (this.infForward) {
            const s = sorted[sorted.length - 1];
            splitGeodesics.push(new AffineGeodesic(s, new AffinePoint(s.resolve().plus(diff)), true, false));
        }
        return splitGeodesics;
    }

    intersect(other: AffineGeodesic): AffinePoint | undefined {
        const c1 = this.p1.resolve();
        const c2 = this.p2.resolve();
        const l = Line.throughTwoPoints(c1, c2);
        const o1 = other.p1.resolve();
        const o2 = other.p2.resolve();
        const ol = Line.throughTwoPoints(o1, o2);

        try {
            const intersection = new AffinePoint(l.intersectLine(ol));
            if (this.contains(intersection) && other.contains(intersection)) return intersection;
        } catch (e) {
            // No intersection
            return undefined;
        }
        return undefined;
    }

    contains(p: AffinePoint): boolean {
        const between = closeEnough(p.distance(this.p1) + p.distance(this.p2), this.p1.distance(this.p2));
        const before = this.infReverse &&
            closeEnough(p.distance(this.p2) - p.distance(this.p1), this.p1.distance(this.p2));
        const after = this.infForward &&
            closeEnough(p.distance(this.p1) - p.distance(this.p2), this.p1.distance(this.p2));
        return between || before || after;
    }

    mid(): AffinePoint {
        return new AffinePoint(
            this.p1.resolve().plus(this.p2.resolve()).scale(0.5)
        );
    }

    translate(v: Vector2Like): AffineGeodesic {
        return new AffineGeodesic(
            this.p1.translate(v),
            this.p2.translate(v),
            this.infForward,
            this.infReverse,
        );
    }

    endpoints(view: AffineCircle): Vector2[] {
        let p1 = this.p1.resolve();
        let p2 = this.p2.resolve();
        let intersections = view.intersectLine(Line.throughTwoPoints(p1, p2));
        if (intersections.length < 2) return [];
        let v = p2.minus(p1);
        let t0 = intersections[0].minus(p1).dot(v) / v.dot(v);
        let t1 = intersections[1].minus(p1).dot(v) / v.dot(v);
        let tm = Math.min(t0, t1);
        let tM = Math.max(t0, t1);
        let lo: number;
        if (tm < 0 && !this.infReverse) lo = 0;
        else if (tm > 1 && !this.infForward) return [];
        else lo = tm;
        let hi: number;
        if (tM > 1 && !this.infForward) hi = 1;
        else if (tM < 0 && !this.infReverse) return [];
        else hi = tM;
        return [
            p1.plus(v.scale(lo)).toVector2(),
            p1.plus(v.scale(hi)).toVector2(),
        ];
    }
}


export class Circle<Point extends PointLike> {
    readonly center: Point;
    readonly radius: number;

    constructor(center: Point, radius: number) {
        if (radius <= 0) throw Error('Nonsense circle');
        this.center = center;
        this.radius = radius;
    }
}

export function affineCircleTangents(c: Circle<AffinePoint>, p: AffinePoint): AffineGeodesic[] {
    const pr = p.resolve();
    const cr = c.center.resolve();
    if (closeEnough(p.distance(c.center), c.radius)) {
        const diff = cr.minus(pr);
        return [new AffineGeodesic(
            p,
            new AffinePoint(pr.plus(diff.times(new Complex(0, 1)))),
            true, true
        )];
    }
    if (p.distance(c.center) < c.radius) throw Error('Point inside circle');


    const mid = pr.plus(cr).scale(0.5);
    const tps = new AffineCircle(mid, mid.distance(cr)).intersectCircle(new AffineCircle(cr, c.radius));
    if (tps.length !== 2) throw Error('Expected two intersections');
    return [
        new AffineGeodesic(new AffinePoint(tps[0]), p, true, true),
        new AffineGeodesic(new AffinePoint(tps[1]), p, true, true)
    ];
}


export function affinePointInvert(point: AffinePoint, center: AffinePoint) {
    const p = point.resolve();
    const c = center.resolve();
    return new AffinePoint(c.plus(c.minus(p)));
}