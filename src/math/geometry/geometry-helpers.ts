import {Complex} from "../complex";
import {Segment} from "./segment";
import {LineSegment} from "./line-segment";
import {AffineCircle} from "./affine-circle";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {ArcSegment as ArcSegment} from "./arc-segment";

export function fromThreePoints(p1: Complex, p2: Complex, p3: Complex): Segment {
    if (p1.isInfinite() || p2.isInfinite() || p3.isInfinite()) throw Error('Infinite segment');
    if (p1.equals(p2) || p2.equals(p3) || p3.equals(p1)) throw Error('Degenerate segment');

    const d1 = p1.minus(p2);
    const d2 = p2.minus(p3);
    const det = d1.x * d2.y - d1.y * d2.x;

    if (closeEnough(det, 0)) return new LineSegment(p1, p3);

    const c = AffineCircle.fromThreePoints(p1, p2, p3);
    const a1 = c.center.heading(p1);
    const a2 = normalizeAngle(c.center.heading(p2), a1);
    const a3 = normalizeAngle(c.center.heading(p3), a1);

    let start: number;
    let end: number;
    if (a2 < a3) {
        start = a1;
        end = a3;
    } else {
        start = a3;
        end = a1;
    }
    return new ArcSegment(c.center, c.radius, start, normalizeAngle(end, start));
}