import {Shape, Vector2} from "three";
import {Generator} from "./new-billiard";
import {LineSegment} from "../geometry/line-segment";
import {Complex} from "../complex";
import {AffineInnerState, AffineOuterBilliardTable, fixTime} from "./tables";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {AffineCircle} from "../geometry/affine-circle";

const SYMPLECTIC_PREIMAGE_PIECES = 2000;
const SYMPLECTIC_PREIMAGE_LENGTH = 100;

export type AffineChord = {
    startTime: number;
    startAngle: number;
    endTime: number;
    endAngle: number;

    p1: Vector2;
    p2: Vector2;
}

export class AffineRay {
    line: Line;

    constructor(readonly start: Vector2,
                readonly end: Vector2,
                readonly infinite: boolean) {
        this.line = Line.throughTwoPoints(Complex.fromVector2(start), Complex.fromVector2(end));
    }

    intersect(other: AffineRay): Vector2 | null {
        let intersection: Vector2;
        try {
            intersection = this.line.intersectLine(other.line).toVector2();
        } catch (e) {
            return null;
        }
        const valid = this.containsPoint(intersection) && other.containsPoint(intersection);
        return valid ? intersection : null;
    }

    containsPoint(point: Vector2): boolean {
        if (!this.line.containsPoint(Complex.fromVector2(point))) return false;
        const d1 = point.distanceTo(this.start);
        const d2 = point.distanceTo(this.end);
        // Between start and end
        if (closeEnough(d1 + d2, this.start.distanceTo(this.end))) return true;
        return this.infinite && d1 > d2;
    }
}

export class AffinePolygonTable extends AffineOuterBilliardTable {

    readonly n: number;
    readonly sides: LineSegment[] = [];
    readonly slicingRays: AffineRay[] = [];

    constructor(readonly vertices: Vector2[]) {
        super();
        this.n = vertices.length;
        for (let i = 0; i < this.n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % this.n];
            const ls = new LineSegment(Complex.fromVector2(v1), Complex.fromVector2(v2))
            this.sides.push(ls);
            this.slicingRays.push(
                new AffineRay(
                    v2,
                    v2.clone().add(v2.clone().sub(v1).normalize()),
                    true)
            );
            this.slicingRays.push(
                new AffineRay(
                    v1,
                    v1.clone().add(v1.clone().sub(v2).normalize()),
                    true)
            );
        }
    }

    point(time: number): Vector2 {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);
        const f = nt % 1;

        const v1 = Complex.fromVector2(this.vertices[i]);
        const v2 = Complex.fromVector2(this.vertices[(i + 1) % this.n]);

        return Complex.lerp(v1, v2, f).toVector2();
    }

    private angle(startTime: number, endTime: number): number {
        const p1 = Complex.fromVector2(this.point(startTime));
        const p2 = Complex.fromVector2(this.point(endTime));
        const heading = this.tangentHeading(startTime);
        return normalizeAngle(p1.heading(p2) - heading, 0) % Math.PI;
    }

    time(point: Vector2): number {
        const z = Complex.fromVector2(point);
        for (let [i, segment] of this.sides.entries()) {
            if (!segment.containsPoint(z)) continue;
            const l = segment.length;
            const f = z.distance(segment.start) / l;
            return (i + f) / this.n;
        }
        throw Error('Point not on polygon');
    }

    tangentHeading(time: number): number {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);

        const v1 = this.vertices[i];
        const v2 = this.vertices[(i + 1) % this.n];

        return Complex.fromVector2(v1).heading(Complex.fromVector2(v2));
    }

    containsPoint(point: Vector2): boolean {
        const c = Complex.fromVector2(point);
        for (let s of this.sides) {
            if (s.end.minus(s.start).cross(c.minus(s.start)) < 0) return false;
        }
        return true;
    }

    pointOnBoundary(point: Vector2): boolean {
        const c = Complex.fromVector2(point);
        for (let s of this.sides) {
            if (s.containsPoint(c)) {
                return true;
            }
        }
        return false;
    }

    leftTangentLine(circle: AffineCircle): Line {
        return this.circleTangentHelper(circle, true);
    }

    rightTangentLine(circle: AffineCircle): Line {
        return this.circleTangentHelper(circle, false);
    }

    private circleTangentHelper(circle: AffineCircle, left: boolean = false): Line {
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i % this.n];
            const v2 = this.vertices[(i + 1) % this.n];
            if (circle.pointOnBoundary(v2)) continue;
            const v3 = this.vertices[(i + 2) % this.n];
            const s2 = v1.clone().sub(v2);
            const s3 = v3.clone().sub(v2);
            let cp, d;
            if (left) {
                cp = circle.rightTangentPoint(Complex.fromVector2(v2));
                d = cp.toVector2().sub(v2);
            } else {
                cp = circle.leftTangentPoint(Complex.fromVector2(v2));
                d = v2.clone().sub(cp.toVector2());
            }
            if (d.cross(s2) >= 0 && d.cross(s3) >= 0) return Line.throughTwoPoints(cp, v2.clone());
        }
        throw Error(`no ${left ? 'left' : 'right'} tangent line`);
    }

    private intersect(state: AffineInnerState): AffineInnerState {
        const t = fixTime(state.time);
        if (closeEnough(state.angle % Math.PI, 0)) return state;
        if (state.angle < 0 || state.angle > Math.PI) throw Error('Invalid angle');
        const z = Complex.fromVector2(this.point(t));
        const theta = this.tangentHeading(t);
        const line = Line.throughTwoPoints(z, z.plus(Complex.polar(1, state.angle + theta)));
        for (let segment of this.sides) {
            let intersection;
            try {
                intersection = segment.line.intersectLine(line);
            } catch (e) {
                continue;
            }
            if (intersection.equals(z)) continue;
            if (segment.containsPoint(intersection)) {
                const time = this.time(intersection.toVector2());
                const angle = normalizeAngle(intersection.heading(z) - this.tangentHeading(time), 0);
                return {time, angle};
            }
        }
        throw Error('No intersection');
    }

    iterateInner(state: AffineInnerState,
                 flavor: Generator,
                 iterations: number = 1): AffineChord[] {
        let chord;
        try {
            chord = this.innerStateToChord(state);
        } catch (e) {
            return [];
        }
        const chords = [chord];
        for (let i = 0; i < iterations; i++) {
            let newChord: AffineChord;
            switch (flavor) {
            case Generator.LENGTH:
                try {
                    newChord = this.innerRegular(chord);
                } catch (e) {
                    return chords;
                }
                break;
            case Generator.AREA:
                try {
                    newChord = this.innerSymplectic(chord);
                } catch (e) {
                    return chords;
                }
                break;
            default:
                throw Error('Unknown generator');
            }
            if (closeEnough(newChord.startTime, state.time) && closeEnough(newChord.startAngle, state.angle)) break;
            chords.push(newChord);
            chord = newChord;
        }
        return chords;
    }

    private innerRegular(chord: AffineChord): AffineChord {
        const regularIntersection = this.intersect({
            time: chord.endTime,
            angle: Math.PI - chord.endAngle,
        });
        return {
            startTime: chord.endTime,
            startAngle: Math.PI - chord.endAngle,
            endTime: regularIntersection.time,
            endAngle: regularIntersection.angle,
            p1: chord.p2,
            p2: this.point(regularIntersection.time),
        };
    }

    private innerSymplectic(chord: AffineChord): AffineChord {
        const symplecticIntersection = this.intersect({
            time: chord.startTime,
            angle: normalizeAngle(this.tangentHeading(chord.endTime) - this.tangentHeading(chord.startTime), 0) % Math.PI,
        });
        return {
            startTime: chord.endTime,
            startAngle: this.angle(chord.endTime, symplecticIntersection.time),
            endTime: symplecticIntersection.time,
            endAngle: this.angle(symplecticIntersection.time, chord.endTime),
            p1: chord.p2,
            p2: this.point(symplecticIntersection.time),
        };
    }

    private innerStateToChord(state: AffineInnerState): AffineChord {
        const p1 = this.point(state.time);
        const intersection = this.intersect(state);
        const p2 = this.point(intersection.time);
        return {
            startTime: state.time,
            startAngle: state.angle,
            endTime: intersection.time,
            endAngle: intersection.angle,
            p1, p2
        };
    }

    private reflectRegular(pivot: Vector2, point: Vector2) {
        const diff = pivot.clone().sub(point);
        return point.clone().add(diff.multiplyScalar(2));
    }

    rightTangentPoint(point: Vector2): Vector2 {
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            const s2 = v2.clone().sub(v1);
            const s3 = v3.clone().sub(v2);
            const d1 = point.clone().sub(v1);
            const d2 = point.clone().sub(v2);
            if (s2.cross(d1) <= 0 && s3.cross(d2) >= 0) return v2;
        }
        throw Error('Point is not in domain of forward map');
    }

    leftTangentPoint(point: Vector2): Vector2 {
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            const s2 = v2.clone().sub(v1);
            const s3 = v3.clone().sub(v2);
            const d2 = point.clone().sub(v2);
            const d3 = point.clone().sub(v3);
            if (s2.cross(d2) >= 0 && s3.cross(d3) <= 0) return v2;
        }
        throw Error('Point is not in domain of backward map');
    }

    override preimages(flavor: Generator, iterations: number): AffineRay[] {
        switch (flavor) {
        case Generator.AREA:
            return this.regularPreimages(iterations);
        case Generator.LENGTH:
            return this.symplecticPreimages(iterations);
        default:
            throw Error('Unknown generator');
        }
    }

    private regularPreimages(iterations: number) {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const diff = v1.clone().sub(v2).normalize();
            frontier.push(new AffineRay(v1, v1.clone().add(diff), true));
        }
        for (let i = 0; i < iterations; i++) {
            preimages.push(...frontier);
            const newFrontier: AffineRay[] = [];
            for (let preimage of frontier) {
                const pieces = this.slicePreimage(preimage);
                for (let piece of pieces) {
                    let mid: Vector2;
                    if (piece.infinite) {
                        mid = piece.end;
                        // If far away and pointing away, skip
                        if (piece.start.lengthSq() > 10_000 &&
                            piece.end.clone().sub(piece.start).dot(piece.start) > 0) continue;
                    } else {
                        mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > 10_000) continue;
                        // If tiny, skip
                        if (piece.start.distanceToSquared(piece.end) < 0.000_000_01) continue;
                    }
                    let pivot: Vector2;
                    try {
                        pivot = this.leftTangentPoint(mid);
                    } catch (e) {
                        continue;
                    }
                    newFrontier.push(
                        new AffineRay(
                            this.reflectRegular(pivot, piece.start),
                            this.reflectRegular(pivot, piece.end),
                            piece.infinite)
                    );
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    private slicePreimage(preimage: AffineRay, buffer: boolean = false): AffineRay[] {
        const intersections = [];
        for (let slicingRay of this.slicingRays) {
            const intersection = slicingRay.intersect(preimage);
            if (intersection === null) continue;
            if (closeEnough(intersection.distanceTo(preimage.start), 0) && !buffer) continue;
            if (!preimage.infinite && closeEnough(intersection.distanceTo(preimage.end), 0) && !buffer) continue;
            intersections.push(intersection);
        }

        if (intersections.length === 0) return [preimage];
        let bufferDiff = new Vector2();
        if (buffer) {
            bufferDiff = preimage.end.clone().sub(preimage.start).normalize().multiplyScalar(0.000_000_001);
        }

        const pieces = [];
        intersections.sort((a, b) => a.distanceToSquared(preimage.start) - b.distanceToSquared(preimage.start));
        if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
            pieces.push(new AffineRay(preimage.start, intersections[0].clone().sub(bufferDiff), false));
        }
        for (let i = 0; i < intersections.length - 1; i++) {
            try {
                pieces.push(new AffineRay(
                    intersections[i].clone().add(bufferDiff),
                    intersections[i + 1].clone().sub(bufferDiff), false));
            } catch (e) {
            }
        }
        const lastIntersection = intersections[intersections.length - 1];
        const end = lastIntersection.clone().add(preimage.end.clone().sub(preimage.start).normalize());
        try {
            if (preimage.infinite) pieces.push(new AffineRay(lastIntersection, end, true));
            else if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
                pieces.push(new AffineRay(lastIntersection.clone().add(bufferDiff), preimage.end, false));
            }
        } catch (e) {
        }

        return pieces;
    }

    private symplecticPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const diff = v1.clone().sub(v2).normalize();
            for (let j = 1; j < SYMPLECTIC_PREIMAGE_PIECES; j++) {
                frontier.push(new AffineRay(
                    v1.clone().add(diff.clone().multiplyScalar(j * dl)),
                    v1.clone().add(diff.clone().multiplyScalar((j + 1) * dl)),
                    false));
            }
        }

        for (let i = 0; i < iterations; i++) {
            for (let f of frontier) {
                preimages.push(f);
            }
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.slicePreimage(segment, true);
                } catch (e) {
                    console.log(e);
                    continue;
                }
                const extraPieces = [];
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > SYMPLECTIC_PREIMAGE_LENGTH * SYMPLECTIC_PREIMAGE_LENGTH) continue;
                        // If tiny, skip
                        const l = piece.start.distanceTo(piece.end);
                        // If tiny, skip
                        if (l < dl / 50) continue;
                        // if giant, break apart
                        // if (l > 5 * dl) {
                        //     const n = Math.ceil(l / dl);
                        //     const dd = l / n;
                        //     const dv = piece.end.clone().sub(piece.start).normalize();
                        //     for (let i = 0; i < n; i++) {
                        //         extraPieces.push(
                        //             new AffineRay(piece.start.clone().addScaledVector(dv, i * dd),
                        //                 piece.start.clone().addScaledVector(dv, (i + 1) * dd), false)
                        //         );
                        //     }
                        //     continue;
                        // }
                        newFrontier.push(
                            new AffineRay(
                                this.outer(piece.start, Generator.LENGTH, true),
                                this.outer(piece.end, Generator.LENGTH, true), false));

                    } catch (e) {
                    }
                }
                // for (let piece of extraPieces) {
                //     try {
                //         newFrontier.push(
                //             new AffineRay(
                //                 this.outerLength(piece.start, true),
                //                 this.outerLength(piece.end, true), false));
                //     } catch (e) {
                //     }
                // }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    override shape(_: number): Shape {
        return new Shape(this.vertices);
    }
}
