import {Segment} from "./segment";
import {Complex} from "../complex";
import {normalizeAngle} from "../math-helpers";
import {PlanarGraph} from "./planar-graph";

export class ArcRegion {
    readonly orientations: number[] = [];

    constructor(readonly segments: Segment[]) {
        if (segments.length < 2) throw Error('ArcRegion with too few segments');
        this.fixOrientation();
        this.rectify();
    }

    private twoSegmentOrientation(): void {
        const s0 = this.segments[0];
        const s1 = this.segments[1];
        if (s0.start.equals(s1.start) && s0.end.equals(s1.end)) {
            this.orientations.push(1, -1);
        } else if (s0.start.equals(s1.end) && s0.end.equals(s1.start)) {
            this.orientations.push(1, 1);
        } else {
            throw Error('Segments do not line up');
        }
    }

    private fixOrientation(): void {
        if (this.segments.length === 2) {
            this.twoSegmentOrientation();
            return;
        }

        let orientation: number;
        let s0 = this.segments[0];
        let s1 = this.segments[1];

        if (s0.end.equals(s1.start) || s0.end.equals(s1.end)) {
            orientation = 1;
        } else if (s0.start.equals(s1.start) || s0.start.equals(s1.end)) {
            orientation = -1;
        } else {
            throw Error('Segments do not line up');
        }
        this.orientations.push(orientation);

        for (let i = 1; i < this.segments.length; i++) {
            s1 = this.segments[i];
            const p = orientation > 0 ? s0.end : s0.start;
            if (s1.start.equals(p)) {
                orientation = 1;
            } else if (s1.end.equals(p)) {
                orientation = -1;
            } else {
                throw Error('Segments do not line up');
            }
            this.orientations.push(orientation);
            s0 = s1;
        }

        const p1 = orientation > 0 ? s1.end : s1.start;
        const p2 = this.orientations[0] > 0 ? this.segments[0].start : this.segments[0].end;
        if (!p1.equals(p2)) {
            throw Error('Segments do not line up');
        }
    }

    private rectify() {
        let winding = 0;
        for (let i = 0; i < this.segments.length; i++) {
            const s0 = this.segments[i];
            const s1 = this.segments[(i + 1) % this.segments.length];
            const d0 = this.orientations[i];
            const d1 = this.orientations[(i + 1) % this.orientations.length];

            const curve = normalizeAngle(Math.PI + d0 * (s0.endHeading() - s0.startHeading()));
            const h1 = normalizeAngle(Math.PI + (d0 > 0 ? s0.endHeading() : s0.startHeading()));
            const h2 = normalizeAngle(d1 > 0 ? s1.endHeading() : s1.startHeading());
            const corner = normalizeAngle(h2 - h1);
            winding += curve + corner;
        }
        // if (winding < Math.PI) {
        //     this.segments.reverse();
        //     this.orientations.reverse();
        //     for (let i = 0; i < this.orientations.length; i++) {
        //         this.orientations[i] = - this.orientations[i];
        //     }
        // }
    }

    vertices(): Complex[] {
        const vertices: Complex[] = [];
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            const orientation = this.orientations[i];

            const sv = s.interpolate(orientation);
            vertices.push(...sv);
            vertices.pop();
        }
        return vertices;
    }

    // shatter(slices: Segment[]): ArcRegion[] {
    //     let regions: ArcRegion[] = [this];
    //     for (let slice of slices) {
    //         console.log(regions);
    //         regions = regions.flatMap((r: ArcRegion) => r.shatterOnce(slice));
    //     }
    //     return regions;
    // }

    private shatterOnce(slice: Segment): ArcRegion[] {
        const splitSegments: Segment[] = [];
        const cutPoints: Complex[] = [];

        for (let s of this.segments) {
            // By assumption, slice's endpoints lie outside conv(this)
            if (slice.containsPoint(s.start) && slice.containsPoint(s.mid) && slice.containsPoint(s.end)) {
                splitSegments.push(s);
                cutPoints.push(s.start, s.end);
                continue;
            }

            const intersections = s.intersect(slice);
            switch (intersections.length) {
                case 0:
                    splitSegments.push(s);
                    break;
                case 1:
                case 2:
                    cutPoints.push(...intersections);
                    splitSegments.push(...s.split(intersections));
                    break;
                default:
                    throw Error('Unexpected number of intersections');
            }
        }

        const slicePieces = slice.split(cutPoints);
        if (slicePieces.length > 2) {
            for (const s of slicePieces) {
                if (this.containsPoint(s.mid) && s.start.modulusSquared() < 1 && s.end.modulusSquared() < 1) {
                    splitSegments.push(s);
                }
            }
        }

        const graph = new PlanarGraph(splitSegments);
        const regions: ArcRegion[] = graph.shatter().map((segments: Segment[]) => new ArcRegion(segments));
        return regions.filter(r => {
            let good = true;
            for (let s of this.segments) {
                if (r.segments.indexOf(s) !== -1) continue;
                if (r.containsPoint(s.mid)) good = false;
            }
            return good;
        });
    }

    containsPoint(p: Complex): boolean {
        let w = 0;
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            if (s.containsPoint(p)) return true;
            w += s.wind(p) * this.orientations[i];
        }
        return w > Math.PI;
    }

    interiorPoint(): Complex {
        let m = Complex.ZERO;
        for (let s of this.segments) {
            m = m.plus(s.mid);
        }
        const guess = m.scale(1 / this.segments.length);
        if (this.containsPoint(guess)) return guess;

        for (let s of this.segments) {
            const d = s.end.minus(s.start).times(new Complex(0, 1)).normalize(0.000_001);
            const g1 = s.mid.plus(d);
            const g2 = s.mid.minus(d);
            if (this.containsPoint(g1)) return g1;
            if (this.containsPoint(g2)) return g2;
        }
        console.log(this);
        throw Error('Failed to find internal point');
    }

    convexIntersect(_: ArcRegion): ArcRegion {
        throw new Error('Not yet implemented');
    }
}
