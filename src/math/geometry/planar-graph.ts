import {Complex} from "../complex";
import {Segment} from "./segment";

export class PlanarGraph {
    private readonly vertices: Vertex[] = [];
    private readonly edges: Edge[] = [];

    constructor(segments: Segment[]) {
        let v1: Vertex;
        let v2: Vertex;
        let edge: Edge;

        for (let s of segments) {
            let v = this.getVertex(s.start);
            if (!v) {
                v1 = new Vertex(s.start);
                this.vertices.push(v1);
            } else {
                v1 = v;
            }

            v = this.getVertex(s.end);
            if (!v) {
                v2 = new Vertex(s.end);
                this.vertices.push(v2);
            } else {
                v2 = v;
            }

            edge = new Edge(s, v1, v2);
            this.edges.push(edge);
            v1.addEdge(edge);
            v2.addEdge(edge);
        }

        for (let v of this.vertices) {
            if (v.edges.length < 2) {
                throw Error('Vertex of degree <2');
            }
        }
    }

    private getVertex(p: Complex): Vertex|null {
        for (let v of this.vertices) {
            if (v.point.equals(p)) return v;
        }
        return null;
    }

    private static areCyclesEqual(c1: Edge[], c2: Edge[]): boolean {
        if (c1.length != c2.length) return false;
        for (let e of c1) {
            if (c2.indexOf(e) === -1) return false;
        }
        return true;
    }

    private static getCycle(e: Edge, orientation: boolean): Edge[] {
        const cycle: Edge[] = [];
        let v = orientation ? e.v2 : e.v1;
        let edge = e;
        do {
            cycle.push(edge);
            edge = v.nextEdge(edge);
            v = edge.v1 === v ? edge.v2: edge.v1;
        } while (edge !== e);
        return cycle;
    }

    shatter(): Segment[][] {
        const cycles: Edge[][] = [];

        for (let e of this.edges) {
            const c1 = PlanarGraph.getCycle(e, true);
            const c2 = PlanarGraph.getCycle(e, false);
            if (c1.length <= 1 || c2.length <= 1) throw Error("Cycle of size 1");

            let i1 = true;
            let i2 = true;
            for (let c of cycles) {
                if (PlanarGraph.areCyclesEqual(c, c1)) i1 = false;
                if (PlanarGraph.areCyclesEqual(c, c2)) i2 = false;
            }
            if (PlanarGraph.areCyclesEqual(c1, c2)) i2 = false;
            if (i1) cycles.push(c1);
            if (i1) cycles.push(c2);
        }

        return cycles.map((c: Edge[]) => c.map((e: Edge) => e.segment));
    }
}

class Vertex {
    constructor(readonly point: Complex, readonly edges: Edge[] = []) {
        this.sortEdges();
    }

    addEdge(e: Edge): void {
        if (e.v1 !== this && e.v2 !== this) throw Error('Edge not incident to vertex');
        if (this.edges.indexOf(e) === -1) {
            this.edges.push(e);
            this.sortEdges();
        }
    }

    private sortEdges(): void {
        this.edges.sort(
            (e1, e2) => {
                const h = e1.heading(this) - e2.heading(this);
                const c = e1.curvature(this) - e2.curvature(this);
                return h == 0 ? c : h;
            }
        );
    }

    nextEdge(edge: Edge): Edge {
        const i = this.edges.indexOf(edge);
        if (i === -1) {
            throw Error('Edge is not incident to vertex');
        }
        return this.edges[(i + 1) % this.edges.length];
    }
}

class Edge {
    constructor(readonly segment: Segment,
                readonly v1: Vertex,
                readonly v2: Vertex) {}

    heading(v: Vertex): number {
        if (v.point.equals(this.segment.start)) return this.segment.startHeading();
        if (v.point.equals(this.segment.end)) return this.segment.endHeading();
        throw Error('Vertex not on edge');
    }

    curvature(v: Vertex): number {
        if (v.point.equals(this.segment.start)) return this.segment.startCurvature();
        if (v.point.equals(this.segment.end)) return this.segment.endCurvature();
        throw Error('Vertex not on edge');
    }
}