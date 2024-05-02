import {HyperbolicModel, HyperGeodesic, HyperIsometry, HyperPoint} from "../hyperbolic/hyperbolic";
import {Generator} from "./new-billiard";
import {Vector2} from "three";
import {HyperPolygon} from "../hyperbolic/hyper-polygon";
import {LineSegment} from "../geometry/line-segment";
import {fixTime} from "./tables";
import {normalizeAngle} from "../math-helpers";
import {Complex} from "../complex";

export type HyperbolicInnerState = {
    time: number;
    angle: number;
}

export type WorkerMessage = {
    id: number;
    vertices: number[][];
    frontier: number[][];
    iterations: number;
}

export type WorkerResponse = {
    id: number;
    singularities: number[][];
    stillWorking: boolean;
}

export class HyperbolicPolygonTable {
    readonly n: number;
    readonly polygon: HyperPolygon;
    readonly kleinSegments: LineSegment[] = [];
    readonly slicingRays: LineSegment[] = [];

    workStartTime: number = 0;
    workerJobID: number = 1;
    working = 0;
    singularities: HyperGeodesic[] = [];
    fresh = false;

    constructor(readonly vertices: HyperPoint[]) {
        this.n = vertices.length;
        this.polygon = HyperPolygon.fromVertices(...vertices);
        for (let i = 0; i < this.n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % this.n];
            this.kleinSegments.push(new LineSegment(v1.klein, v2.klein));
            const g = this.polygon.geodesics[i];
            this.slicingRays.push(new LineSegment(g.p2.klein, g.iq.klein));
        }
    }

    onWorkerMessage(event: MessageEvent) {
        const response = (event.data as WorkerResponse);
        console.log('Worker response:', response);
        if (response.id != this.workerJobID) return;
        this.singularities.push(...response.singularities.map(f => new HyperGeodesic(
            HyperPoint.fromPoincare(new Complex(
                f[0],
                f[1],
            )),
            HyperPoint.fromPoincare(new Complex(
                f[2],
                f[3],
            )),
        )));
        if (!response.stillWorking) this.working--;
        if (this.working === 0) {
            this.workerJobID++;
            console.log('Finished in: ', -(this.workStartTime - Date.now()) / 1000, ' seconds');
        }
        this.fresh = true;
    }

    onWorkerError(event: ErrorEvent) {
        console.error('Worker error event:', event);
    }

    iterateInner(state: HyperbolicInnerState,
                 flavor: Generator,
                 iterations: number = 1): HyperGeodesic[] {
        let chord;
        try {
            chord = this.innerStateToGeodesic(state);
        } catch (e) {
            return [];
        }
        const chords: HyperGeodesic[] = [chord];
        for (let i = 0; i < iterations; i++) {
            let newChord: HyperGeodesic;
            switch (flavor) {
            case Generator.LENGTH:
                try {
                    newChord = this.innerRegular(chord);
                } catch (e) {
                    return chords;
                }
                break;
            case Generator.AREA:
                return chords;
                // try {
                //     newChord = this.innerSymplectic(chord);
                // } catch (e) {
                //     return chords;
                // }
                // break;
            default:
                throw Error('Unknown generator');
            }
            if (newChord.p1.equals(chords[0].p1) && newChord.p2.equals(chords[0].p2)) break;
            chords.push(newChord);
            chord = newChord;
        }
        return chords;
    }

    innerStateToGeodesic(state: HyperbolicInnerState): HyperGeodesic {
        // return geodesic between given point and ideal in given direction
        const point = this.point(state.time);
        const heading = this.heading(state.time) + state.angle;
        const g = HyperGeodesic.poincareRay(point, heading);
        const intersection = this.intersect(g);
        return new HyperGeodesic(point, intersection);
    }

    intersect(chord: HyperGeodesic): HyperPoint {
        const chordKlein = new LineSegment(chord.p1.klein, chord.iq.klein);
        for (let kleinSegment of this.kleinSegments) {
            const intersection = kleinSegment.intersect(chordKlein);
            if (intersection.length !== 1) continue;
            if (intersection[0].equals(chord.p1.klein)) continue;
            return HyperPoint.fromKlein(intersection[0]);
        }
        throw Error('Chord does not intersect polygon again');
    }

    innerRegular(chord: HyperGeodesic): HyperGeodesic {
        const endTime = this.timeOf(chord.p2);
        const endAngle = normalizeAngle(chord.heading2() - this.heading(endTime), 0) % Math.PI;
        return this.innerStateToGeodesic({time: endTime, angle: Math.PI - endAngle});
    }

    timeOf(point: HyperPoint): number {
        for (let i = 0; i < this.n; i++) {
            if (!this.kleinSegments[i].containsPoint(point.klein)) continue;
            const sideLength = this.kleinSegments[i].length;
            const distToVi = this.vertices[i].klein.distance(point.klein);
            const f = distToVi / sideLength;
            return (i + f) / this.n;
        }
        throw Error('Point not on polygon');
    }

    private point(time: number): HyperPoint {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);
        const f = nt % 1;

        const v1 = this.vertices[i];
        const v2 = this.vertices[(i + 1) % this.n];

        return HyperPoint.fromKlein(Complex.lerp(v1.klein, v2.klein, f));
    }

    private heading(time: number): number {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);

        const p = this.point(time);
        const v2 = this.vertices[(i + 1) % this.n];

        return new HyperGeodesic(p, v2).heading1();
    }

    iterateOuter(startingPoint: HyperPoint,
                 flavor: Generator,
                 iterations: number = 1): HyperPoint[] {
        const orbit = [startingPoint];
        let point = startingPoint;
        if (flavor === Generator.LENGTH) return orbit;
        for (let i = 0; i < iterations; i++) {
            let v: HyperPoint;
            try {
                v = this.forwardVertex(point);
            } catch (e) {
                return orbit;
            }
            const inversion = HyperIsometry.pointInversion(v);
            point = inversion.apply(point);
            orbit.push(point);
            if (point.equals(startingPoint)) {
                console.log(`periodic with period ${i + 1}`);
                break;
            }
        }
        return orbit;
    }

    preimages(flavor: Generator,
              iterations: number = 1, singInterval: number): HyperGeodesic[] {
        if (flavor === Generator.LENGTH) return [];
        this.workStartTime = Date.now();
        this.singularities = [];
        let frontier: HyperGeodesic[] = [];
        for (let i = 0; i < this.n; i++) {
            // for (let i = 0; i < 1; i++) {
            const g = this.polygon.geodesics[i];

            if (singInterval > 0) {
                let n1 = g.p.translate(g.ip, g.length * (singInterval - 1));
                let n2 = g.p.translate(g.ip, g.length * singInterval);
                frontier.push(new HyperGeodesic(n1, n2));
            } else {
                frontier.push(new HyperGeodesic(g.p, g.ip));
            }
        }
        for (let i = 0; i < iterations; i++) {
            // wait until there are enough preimages to use all the workers
            // if (frontier.length >= workers.length) {
            //     const geodesicsPerWorker = Math.ceil(frontier.length / workers.length);
            //     for (let j = 0; j < workers.length; j++) {
            //         const message: WorkerMessage = {
            //             id: this.workerJobID,
            //             vertices: this.vertices.map(v => [v.poincare.x, v.poincare.y]),
            //             frontier: frontier.slice(j * geodesicsPerWorker, Math.min((j + 1) * geodesicsPerWorker, frontier.length)).map(f => [
            //                 f.start.poincare.x,
            //                 f.start.poincare.y,
            //                 f.end.poincare.x,
            //                 f.end.poincare.y,
            //             ]),
            //             iterations: iterations - i,
            //         }
            //         workers[i].postMessage(message);
            //     }
            //     this.working = workers.length;
            //     break;
            // }
            this.singularities.push(...frontier);
            frontier = this.generatePreimages(frontier);
        }
        this.singularities.push(...frontier);
        return this.singularities;
    }

    generatePreimages(frontier: HyperGeodesic[]) {
        const newFrontier: HyperGeodesic[] = [];
        for (let preimage of frontier) {
            const pieces = this.slicePreimage(preimage);
            for (let piece of pieces) {
                const mid = piece.mid;
                let pivot: HyperPoint;
                try {
                    pivot = this.reverseVertex(mid);
                } catch (e) {
                    continue;
                }
                try {
                    const newP = this.reflect(piece.p1, pivot);
                    const newQ = this.reflect(piece.p2, pivot);
                    if (newP.klein.distance(newQ.klein) < 0.000_01 ||
                        newP.poincare.distance(newQ.poincare) < 0.000_01) {
                        continue;
                    }

                    newFrontier.push(new HyperGeodesic(newP, newQ));
                } catch (e) {

                }
            }
        }
        return newFrontier;
    }

    private reflect(point: HyperPoint, pivot: HyperPoint) {
        const hi = HyperIsometry.pointInversion(pivot);
        return hi.apply(point);
    }

    private slicePreimage(preimage: HyperGeodesic): HyperGeodesic[] {
        const intersections: HyperPoint[] = [];
        for (let slicingRay of this.slicingRays) {
            const slicePoints = slicingRay.intersect(new LineSegment(preimage.p1.klein, preimage.p2.klein));
            if (slicePoints.length !== 1) continue;
            const intersection = slicePoints[0];
            const ip = HyperPoint.fromKlein(intersection);
            if (ip.equals(preimage.start) || ip.equals(preimage.end)) continue;
            intersections.push(ip);
        }

        if (intersections.length === 0) return [preimage];

        const pieces: HyperGeodesic[] = [];
        intersections.sort((a, b) => a.distance(preimage.start) - b.distance(preimage.start));
        pieces.push(new HyperGeodesic(preimage.start, intersections[0]));
        for (let i = 0; i < intersections.length - 1; i++) {
            try {
                pieces.push(new HyperGeodesic(
                    intersections[i],
                    intersections[i + 1]));
            } catch (e) {
            }
        }
        const lastIntersection = intersections[intersections.length - 1];
        try {
            pieces.push(new HyperGeodesic(lastIntersection, preimage.end));
        } catch (e) {
        }

        return pieces;
    }

    private forwardVertex(point: HyperPoint): HyperPoint {
        const pk = point.klein;
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i].klein;
            const v2 = this.vertices[(i + 1) % this.n].klein;
            const v3 = this.vertices[(i + 2) % this.n].klein;
            const s2 = v2.minus(v1);
            const s3 = v3.minus(v2);
            const d1 = pk.minus(v1);
            const d2 = pk.minus(v2);
            if (s2.cross(d1) < 0 && s3.cross(d2) > 0) return this.vertices[(i + 1) % this.n];
        }
        throw Error('Point is not in domain of forward map');
    }

    private reverseVertex(point: HyperPoint): HyperPoint {
        const pk = point.klein;
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i].klein;
            const v2 = this.vertices[(i + 1) % this.n].klein;
            const v3 = this.vertices[(i + 2) % this.n].klein;
            const s2 = v2.minus(v1);
            const s3 = v3.minus(v2);
            const d2 = pk.minus(v2);
            const d3 = pk.minus(v3);
            if (s2.cross(d2) > 0 && s3.cross(d3) < 0) return this.vertices[(i + 1) % this.n];
        }
        throw Error('Point is not in domain of backward map');
    }

    interpolateVertices(model: HyperbolicModel): Vector2[] {
        switch (model) {
        case HyperbolicModel.POINCARE:
            return this.polygon.poincareVertices.map(c => c.toVector2());
        case HyperbolicModel.KLEIN:
            return this.polygon.kleinVertices.map(c => c.toVector2());
        default:
            throw Error('Unsupported model');
        }
    }
}