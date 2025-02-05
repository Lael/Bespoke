import {Segment} from "./segment";
import {Complex} from "../complex";
import {Line} from "./line";
import {ArcSegment} from "./arc-segment";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {Vector2} from "three";

export class LineSegment extends Segment {
    private readonly p1: Complex;
    private readonly p2: Complex;
    private readonly m;
    readonly line: Line;
    readonly length: number;

    constructor(private readonly p: Complex | Vector2, private readonly q: Complex | Vector2) {
        super();
        if (p instanceof Vector2) this.p1 = Complex.fromVector2(p); else this.p1 = p;
        if (q instanceof Vector2) this.p2 = Complex.fromVector2(q); else this.p2 = q;
        if (this.p1.isInfinite() || this.p2.isInfinite()) throw Error('Infinite line segment');
        if (this.p1.equals(this.p2)) throw Error('Degenerate line segment');
        this.m = this.p1.plus(this.p2).scale(0.5);
        this.line = Line.throughTwoPoints(this.p1, this.p2);
        this.length = this.p1.minus(this.p2).modulus();
    }

    override get start() {
        return this.p1;
    }

    override get mid() {
        return this.m;
    }

    override get end() {
        return this.p2;
    }

    override intersect(other: Segment): Complex[] {
        if (other instanceof LineSegment) return this.intersectLineSegment(other);
        if (other instanceof ArcSegment) return this.intersectArc(other);
        throw Error('Unknown segment type');
    }

    private intersectLineSegment(other: LineSegment): Complex[] {
        try {
            const candidate = this.line.intersectLine(other.line);
            if (this.containsPoint(candidate) && other.containsPoint(candidate)) return [candidate];
        } catch (e) {
            return [];
        }
        return [];
    }

    intersectLine(line: Line): Complex | undefined {
        try {
            const candidate = this.line.intersectLine(line);
            if (this.containsPoint(candidate)) return candidate;
        } catch (e) {
            return undefined;
        }
        return undefined;
    }

    private intersectArc(other: ArcSegment): Complex[] {
        const candidates = other.circle.intersectLine(this.line);
        return candidates.filter(candidate => this.containsPoint(candidate) && other.containsPoint(candidate));
    }

    override containsPoint(p: Complex | Vector2): boolean {
        if (p instanceof Vector2) return this.containsPoint(Complex.fromVector2(p));
        return closeEnough(this.p1.distance(p) + this.p2.distance(p), this.length);
    }

    override startHeading(): number {
        return this.p1.heading(this.p2);
    }

    override endHeading(): number {
        return this.p2.heading(this.p1);
    }

    override startCurvature(): number {
        return 0;
    }

    override endCurvature(): number {
        return 0;
    }

    override wind(p: Complex): number {
        if (this.containsPoint(p)) throw Error('Undefined winding number');
        return normalizeAngle(p.heading(this.p2) - p.heading(this.p1));
    }

    override split(points: Complex[]): Segment[] {
        const pts: Complex[] = [];
        pts.push(this.p1);
        pts.push(this.p2);
        pts.push(...points);
        pts.sort((a, b) => {
            if (a.distance(this.p1) == b.distance(this.p1)) return 0;
            return a.distance(this.p1) > b.distance(this.p1) ? 1 : -1;
        });

        const pieces = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            if (a.equals(b)) continue;
            pieces.push(new LineSegment(a, b));
        }
        return pieces;
    }

    override interpolate(direction: number): Complex[] {
        return direction > 0 ? [this.p1, this.p2] : [this.p2, this.p1];
    }
}