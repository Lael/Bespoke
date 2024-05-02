import {Complex} from "../complex";
import {AffineCircle} from "../geometry/affine-circle";
import {normalizeAngle} from "../math-helpers";
import {Line} from "../geometry/line";
import {Segment} from "../geometry/segment";
import {LineSegment} from "../geometry/line-segment";
import {ArcSegment} from "../geometry/arc-segment";

export class HyperbolicGeodesic {
    readonly isDiameter: boolean;
    readonly circle: AffineCircle | null;

    // The ideal points on the unit circle closer to p1 and p2, respectively.
    readonly ideal1: Complex;
    readonly ideal2: Complex;

    readonly startAngle: number;
    readonly endAngle: number;

    constructor(readonly p1: Complex, readonly p2: Complex) {
        if (p1.equals(p2)) throw Error('Degenerate geodesic');
        if (p1.modulusSquared() > 1 || p2.modulusSquared() > 1) throw Error('Points outside disk');
        if (p1.x * p2.y - p1.y * p2.x === 0) {
            this.isDiameter = true;
            const diff = p2.minus(p1);
            this.ideal2 = diff.scale(1 / diff.modulus());
            this.ideal1 = this.ideal2.scale(-1);
            this.circle = null;
            this.startAngle = this.ideal1.argument();
            this.endAngle = this.ideal2.argument();
        } else {
            this.isDiameter = false;
            this.circle = HyperbolicGeodesic.computeCircle(p1, p2);
            const a2c = this.circle.center.argument();
            const offset = Math.atan(this.circle.radius);
            const a = Complex.polar(1, a2c - offset);
            const b = Complex.polar(1, a2c + offset);
            if (a.distance(p1) < a.distance(p2)) {
                this.ideal1 = a;
                this.ideal2 = b;
            } else {
                this.ideal1 = b;
                this.ideal2 = a;
            }
            const s = this.circle.center.heading(this.ideal1);
            const e = normalizeAngle(this.circle.center.heading(this.ideal2),
                s - Math.PI);
            this.startAngle = Math.min(s, e);
            this.endAngle = Math.max(s, e);
        }
    }

    private static computeCircle(p1: Complex, p2: Complex): AffineCircle {
        const pp = p1.scale(1.0 / p1.modulusSquared());
        const p1ppb = Line.bisector(p1, pp);
        const p1p2b = Line.bisector(p1, p2);
        const center = p1ppb.intersectLine(p1p2b);
        const radius = center.distance(p1);
        return new AffineCircle(center, radius);
    }

    startHeading() {
        if (this.isDiameter) return this.p1.heading(this.p2);
        const a = this.circle!.center.heading(this.p1) + Math.PI / 2;
        return Math.abs(normalizeAngle(a - this.p1.heading(this.p2))) > Math.PI / 2
            ? normalizeAngle(a - Math.PI)
            : normalizeAngle(a);
    }

    endHeading() {
        if (this.isDiameter) return this.p2.heading(this.p1);
        const a = this.circle!.center.heading(this.p2) + Math.PI / 2;
        return Math.abs(normalizeAngle(a - this.p2.heading(this.p1))) > Math.PI / 2
            ? normalizeAngle(a - Math.PI)
            : normalizeAngle(a);
    }

    leftTail(): Segment {
        if (this.isDiameter) return new LineSegment(this.p1, this.ideal1);
        const ha = this.circle!.center.heading(this.p1);
        const hb = this.circle!.center.heading(this.ideal1);
        const swap = normalizeAngle(hb, ha) - ha > Math.PI;
        const a = swap ? hb : ha;
        const b = normalizeAngle(swap ? ha : hb, a);
        return new ArcSegment(
            this.circle!.center,
            this.circle!.radius,
            a, b,
        );
    }

    centralSegment(): Segment {
        if (this.isDiameter) return new LineSegment(this.p1, this.p2);
        const ha = this.circle!.center.heading(this.p1);
        const hb = this.circle!.center.heading(this.p2);
        const swap = normalizeAngle(hb, ha) - ha > Math.PI;
        const a = swap ? hb : ha;
        const b = normalizeAngle(swap ? ha : hb, a);
        return new ArcSegment(
            this.circle!.center,
            this.circle!.radius,
            a, b,
        );
    }

    rightTail(): Segment {
        if (this.isDiameter) return new LineSegment(this.p2, this.ideal2);
        const ha = this.circle!.center.heading(this.ideal2);
        const hb = this.circle!.center.heading(this.p2);
        const swap = normalizeAngle(hb, ha) - ha > Math.PI;
        const a = swap ? hb : ha;
        const b = normalizeAngle(swap ? ha : hb, a);
        return new ArcSegment(
            this.circle!.center,
            this.circle!.radius,
            a, b
        );
    }

    entireSegment(): Segment {
        if (this.isDiameter) return new LineSegment(this.ideal1, this.ideal2);
        return new ArcSegment(
            this.circle!.center,
            this.circle!.radius,
            this.circle!.center.heading(this.ideal2),
            this.circle!.center.heading(this.ideal1)
        );
    }

    rightPortion() {
        if (this.isDiameter) return new LineSegment(this.p1, this.ideal2);
        return new ArcSegment(
            this.circle!.center,
            this.circle!.radius,
            this.circle!.center.heading(this.ideal2),
            this.circle!.center.heading(this.p1)
        );
    }
}