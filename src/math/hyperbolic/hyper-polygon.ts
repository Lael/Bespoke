import {Polygon2D, PolygonSpec} from "../../graphics/shapes/polygon2D";
import {Complex} from "../complex";
import {Color} from "../../graphics/shapes/color";
import {HyperbolicModel, HyperGeodesic, HyperIsometry, HyperPoint} from "./hyperbolic";
import {fromThreePoints} from "../geometry/geometry-helpers";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {Segment} from "../geometry/segment";

export class IdealArc {
    constructor(readonly start: HyperPoint, readonly mid: HyperPoint, readonly end: HyperPoint) {
    }

    interpolate(model: HyperbolicModel, start: HyperPoint, includeLast: boolean = true): Complex[] {
        const s = fromThreePoints(
            this.start.resolve(model),
            this.mid.resolve(model),
            this.end.resolve(model),
        );
        let points = s.interpolate(1);
        if (!points[0].equals(start.resolve(model))) points = points.reverse();
        if (!includeLast) points.pop();
        return points;
    }

    wind(p: HyperPoint): number {
        const h1 = p.klein.heading(this.start.klein);
        const h2 = p.klein.heading(this.end.klein)
        if (normalizeAngle(this.end.klein.argument() - this.mid.klein.argument()) > 0) {
            // If start, mid, end are ccw
            return normalizeAngle(h2, h1) - h1;
        } else {
            // If start, mid, end are cw
            const w = normalizeAngle(h2 - h1);
            if (w > 0) return -Math.PI - w;
            return w;
        }
    }

    contains(other: IdealArc): boolean {
        const s1 = this.start.klein.argument();
        const m1 = this.mid.klein.argument();
        const e1 = this.end.klein.argument();
        const s2 = other.start.klein.argument();
        const m2 = other.mid.klein.argument();
        const e2 = other.end.klein.argument();

        const c1 = normalizeAngle(m1, s1) < normalizeAngle(e1, s1); // true if s1, m1, e1 are in ccw order
        const c2 = normalizeAngle(m2, s2) < normalizeAngle(e2, s2); // true if s2, m2, e2 are in ccw order

        const l1 = c1 ? s1 : e1; // cw-most vertex of this
        const h1 = normalizeAngle(c1 ? e1 : s1, l1);

        const l2 = normalizeAngle(c2 ? s2 : e2, l1); // cw-most vertex of this
        const h2 = normalizeAngle(c2 ? e2 : s2, l2);

        return l1 <= l2 && h1 >= h2;
    }

    segment(model: HyperbolicModel): Segment {
        return fromThreePoints(
            this.start.resolve(model),
            this.mid.resolve(model),
            this.end.resolve(model),
        );
    }

    containsPoint(p: HyperPoint): boolean {
        return this.segment(HyperbolicModel.KLEIN).containsPoint(p.klein);
    }

    // intersect(other: IdealArc): IdealArc[] {
    //     const s1 = this.start.klein.argument();
    //     const m1 = this.mid.klein.argument();
    //     const e1 = this.end.klein.argument();
    //     const s2 = other.start.klein.argument();
    //     const m2 = other.mid.klein.argument();
    //     const e2 = other.end.klein.argument();
    //
    //     const c1 = normalizeAngle(m1, s1) < normalizeAngle(e1, s1); // true if s1, m1, e1 are in ccw order
    //     const c2 = normalizeAngle(m2, s2) < normalizeAngle(e2, s2); // true if s2, m2, e2 are in ccw order
    //
    //     const l1 = c1 ? s1 : e1; // cw-most vertex of this
    //     const l2 = c2 ? s2 : e2; // cw-most vertex of other
    //
    //
    // }
}

export type HyperSegment = IdealArc | HyperGeodesic;

export class HyperPolygon {
    readonly vertices: HyperPoint[];
    readonly poincareVertices: Complex[];
    readonly kleinVertices: Complex[];
    // readonly halfPlaneVertices: Complex[];
    readonly directions: number[];
    readonly geodesics: HyperGeodesic[];
    readonly arcs: IdealArc[];

    constructor(readonly edges: HyperSegment[]) {
        if (edges.length < 3) throw Error('HyperbolicPolygon must have at least 3 vertices');

        this.directions = HyperPolygon.validateEdges(this.edges);
        this.geodesics = edges.filter(s => s instanceof HyperGeodesic) as HyperGeodesic[];
        this.arcs = edges.filter(s => s instanceof IdealArc) as IdealArc[];

        this.poincareVertices = this.interpolateVertices(HyperbolicModel.POINCARE);

        this.kleinVertices = this.interpolateVertices(HyperbolicModel.KLEIN);

        // this.halfPlaneVertices = this.interpolateVertices(HyperbolicModel.HALF_PLANE);
        this.vertices = [];
        for (let i = 0; i < edges.length; i++) {
            this.vertices.push(this.directions[i] > 0 ? edges[i].end : edges[i].start);
        }
    }

    static fromAngles(angles: number[]): HyperPolygon {
        if (angles.length !== 3) throw new Error('Constructing a polygon by angles is only supported for triangles.');
        // Validate angles
        let s = 0;
        let v = angles.length >= 3;
        for (let a of angles) {
            if (a < 0 || a > Math.PI) {
                v = false;
                break;
            }
            s += a;
        }
        if (s > (angles.length - 2) * Math.PI) v = false;
        if (!v) throw new Error('Invalid angle list');

        const a0 = angles[0];
        const a1 = angles[1];
        const a2 = angles[2];

        const c0 = Math.cos(a0);
        const c1 = Math.cos(a1);
        const c2 = Math.cos(a2);
        const s0 = Math.sin(a0);
        const s1 = Math.sin(a1);
        const s2 = Math.sin(a2);

        let v0, v1, v2;
        let center = undefined;

        if (a0 === 0 && a1 === 0 && a2 === 0) {
            // Ideal triangle
            v0 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2));
            v1 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2 + 2 * Math.PI / 3));
            v2 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2 + 4 * Math.PI / 3));
        } else if (a0 + a1 === 0 || a0 + a2 === 0 || a1 + a2 === 0) {
            v0 = HyperPoint.fromPoincare(Complex.ZERO);
            v1 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2));
            v2 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2 + a0 + a1 + a2));
        } else if (a0 === 0) {
            const t0 = Math.acosh((c0 + c1 * c2) / (s1 * s2));
            const l0 = HyperPoint.trueToPoincare(t0);
            v0 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2));
            v1 = HyperPoint.fromPoincare(Complex.polar(l0, Math.PI / 2 + a2));
            v2 = HyperPoint.fromPoincare(Complex.ZERO);
        } else if (a1 === 0) {
            const t1 = Math.acosh((c1 + c2 * c0) / (s2 * s0));
            const l1 = HyperPoint.trueToPoincare(t1);
            v0 = HyperPoint.fromPoincare(Complex.ZERO);
            v1 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2));
            v2 = HyperPoint.fromPoincare(Complex.polar(l1, Math.PI / 2 + a1));
        } else if (a2 === 0) {
            const t2 = Math.acosh((c2 + c0 * c1) / (s0 * s1));
            const l2 = HyperPoint.trueToPoincare(t2);
            v0 = HyperPoint.fromPoincare(Complex.ZERO);
            v1 = HyperPoint.fromPoincare(Complex.polar(1, Math.PI / 2));
            v2 = HyperPoint.fromPoincare(Complex.polar(l2, Math.PI / 2 + a1));
        } else {
            // All angles are positive
            const t1 = Math.acosh((c1 + c2 * c0) / (s2 * s0));
            const t2 = Math.acosh((c2 + c0 * c1) / (s0 * s1));
            const l1 = HyperPoint.trueToPoincare(t1);
            const l2 = HyperPoint.trueToPoincare(t2);

            const l01 = HyperPoint.trueToPoincare(t1 / 2);
            const l02 = HyperPoint.trueToPoincare(t2 / 2);
            const m01 = HyperPoint.fromPoincare(Complex.polar(l01, Math.PI / 2));
            const m02 = HyperPoint.fromPoincare(Complex.polar(l02, Math.PI / 2 + a0));

            v0 = HyperPoint.fromPoincare(Complex.ZERO);
            v1 = HyperPoint.fromPoincare(Complex.polar(l1, Math.PI / 2));
            v2 = HyperPoint.fromPoincare(Complex.polar(l2, Math.PI / 2 + a0));
            center = new HyperGeodesic(v2, m01).intersect(new HyperGeodesic(v1, m02));
        }

        if (!center) center = HyperPoint.fromPoincare(v0.poincare.plus(v1.poincare).plus(v2.poincare).scale(1 / 3.0));
        const b = HyperIsometry.blaschkeTransform(center);

        v0 = b.apply(v0);
        v1 = b.apply(v1);
        v2 = b.apply(v2);

        if (!v0.poincare.equals(Complex.ZERO)) {
            const angle = -v0.poincare.argument();
            const r = HyperIsometry.rotation(angle);
            v0 = r.apply(v0);
            v1 = r.apply(v1);
            v2 = r.apply(v2);
        }

        return new HyperPolygon([
            new HyperGeodesic(v0, v1),
            new HyperGeodesic(v1, v2),
            new HyperGeodesic(v2, v0)]);
    }

    private interpolateVertices(model: HyperbolicModel): Complex[] {
        const interpolated: Complex[] = [];
        for (let i = 0; i < this.edges.length; i++) {
            const g = this.edges[i];
            const d = this.directions[i];
            const start = d > 0 ? g.start : g.end;
            interpolated.push(...g.interpolate(model, start, false));
        }
        return interpolated;
    }

    // private static generateGeodesics(vertices: HyperPoint[]): HyperGeodesic[] {
    //     const gs: HyperGeodesic[] = [];
    //     const n = vertices.length;
    //     for (let i = 0; i < n; i++) {
    //         const v1 = vertices[i];
    //         const v2 = vertices[(i + 1) % n];
    //         const g = new HyperGeodesic(v1, v2);
    //         gs.push(g);
    //     }
    //     return gs;
    // }

    private static chooseDirection(e0: HyperSegment, e1: HyperSegment) {
        if (e0.end.equals(e1.start) || e0.end.equals(e1.end)) {
            return 1;
        } else if (e0.start.equals(e1.start) || e0.start.equals(e1.end)) {
            return -1;
        } else {
            throw new Error('Edges do not line up');
        }
    }

    private static validateEdges(edges: HyperSegment[]): number[] {
        const directions: number[] = [];
        let e0 = edges[0];
        let e1 = edges[1];
        directions.push(HyperPolygon.chooseDirection(e0, e1));
        for (let i = 1; i < edges.length; i++) {
            e0 = edges[i];
            e1 = edges[(i + 1) % edges.length];
            directions.push(HyperPolygon.chooseDirection(e0, e1));
        }
        const p1 = directions[0] === 1 ? edges[0].start : edges[0].end;
        const p2 = directions[directions.length - 1] === 1 ? edges[edges.length - 1].end : edges[edges.length - 1].start;
        if (!p1.equals(p2)) throw new Error('Edges do not line up');
        return directions;
    }

    containsPoint(p: HyperPoint, strictInclusion: boolean = true): boolean {
        let wind = 0;
        for (let i = 0; i < this.edges.length; i++) {
            const d = this.directions[i];
            const e = this.edges[i];
            if (e.containsPoint(p)) return !strictInclusion;
            wind += d * e.wind(p);
        }
        return closeEnough(wind, 2 * Math.PI);
    }

    interiorPoint(): HyperPoint {
        let c = Complex.ZERO;
        for (let e of this.edges) {
            c = c.plus(e.mid.klein);
        }
        c = c.scale(1 / this.edges.length);
        if (this.containsPoint(HyperPoint.fromKlein(c))) return HyperPoint.fromKlein(c);
        for (let e of this.edges) {
            const d = e.start.klein.minus(e.end.klein).times(new Complex(0, 1)).scale(0.0001);
            try {
                const c1 = HyperPoint.fromKlein(e.mid.klein.plus(d));
                if (this.containsPoint(c1)) return c1;
            } catch (e) {
            }
            try {
                const c2 = HyperPoint.fromKlein(e.mid.klein.minus(d));
                if (this.containsPoint(c2)) return c2;
            } catch (e) {
            }
        }
        throw new Error('Could not find interior point');
    }

    polygon(model: HyperbolicModel,
            gl: WebGL2RenderingContext,
            fillColor: Color | undefined,
            borderColor: Color | undefined,
            ordering = 0) {
        if (!fillColor && !borderColor) throw Error('Invisible HyperbolicPolygon');
        switch (model) {
        case HyperbolicModel.POINCARE:
            return new Polygon2D(gl, new PolygonSpec(this.poincareVertices, fillColor, borderColor), ordering);
        case HyperbolicModel.KLEIN:
            return new Polygon2D(gl, new PolygonSpec(this.kleinVertices, fillColor, borderColor), ordering);
            // case HyperbolicModel.HALF_PLANE:
            //     return this.halfPlane;
        default:
            throw new Error('Unknown hyperbolic model');
        }
    }

    convexIntersect(other: HyperPolygon): HyperPolygon | undefined {
        const vertices: HyperPoint[] = [];
        // Intersection has vertices of this contained in other...
        vertices.push(...this.edges.map(e => e.start).filter(v => other.containsPoint(v, false)));
        // ...vertices of other contained in this...
        vertices.push(...other.edges.map(e => e.start).filter(v => this.containsPoint(v, false)));

        for (let e of this.geodesics) {
            // ...and edge intersections.
            vertices.push(...other.geodesics.map(oe => e.intersect(oe)).filter(i => i !== undefined) as HyperPoint[]);
        }

        if (vertices.length < 2) return undefined;

        // Sort counterclockwise
        let center = Complex.ZERO;
        for (let v of vertices) {
            center = center.plus(v.klein);
        }
        center = center.scale(1 / vertices.length);
        vertices.sort((p1, p2) => center.heading(p1.klein) - center.heading(p2.klein));

        const edges: HyperSegment[] = [];
        // Determine if adjacent pairs of ideal vertices are connected by ideal arcs or geodesics
        for (let i = 0; i < vertices.length; i++) {
            const v0 = vertices[i];
            const v1 = vertices[(i + 1) % vertices.length];
            if (v0.equals(v1)) continue;
            if (v0.isIdeal() && v1.isIdeal()) {
                const c1 = this.arcs.findIndex(a => a.containsPoint(v0) && a.containsPoint(v1)) !== -1;
                const c2 = other.arcs.findIndex(a => a.containsPoint(v0) && a.containsPoint(v1)) !== -1;
                if (c1 && c2) {
                    const la = v0.klein.argument();
                    const ha = normalizeAngle(v1.klein.argument(), la);
                    const ma = (la + ha) / 2;

                    edges.push(new IdealArc(v0, HyperPoint.fromKlein(Complex.polar(1, ma)), v1));
                    continue;
                }
            }
            edges.push(new HyperGeodesic(v0, v1));
        }

        if (edges.length === 2 && edges[0].start.isIdeal() && edges[0].end.isIdeal()) {
            // Lenticular polygon - do something about this later?
            throw new Error('Lenticular polygon!');
        }
        if (edges.length < 3) return undefined;

        try {
            return new HyperPolygon(edges);
        } catch (e) {
            return undefined;
        }
    }

    static fromVertices(...vertices: HyperPoint[]): HyperPolygon {
        const edges: HyperSegment[] = [];
        for (let i = 0; i < vertices.length; i++) {
            const v0 = vertices[i];
            const v1 = vertices[(i + 1) % vertices.length];
            edges.push(new HyperGeodesic(v0, v1));
        }
        return new HyperPolygon(edges);
    }

    // static regular(n: number, v1: HyperPoint, v2: HyperPoint): HyperPolygon {
    //     const l = v1.distance(v2);
    //     const vertices = [v1, v2];
    //     for (let i = 0; i < n; i++) ;
    //     return undefined;
    // }
}
