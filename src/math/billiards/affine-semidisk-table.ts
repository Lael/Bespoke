import {Shape, Vector2} from "three";
import {closeEnough} from "../math-helpers";
import {Line} from "../geometry/line";
import {Generator} from "./new-billiard";
import {AffineRay} from "./affine-polygon-table";
import {AffineCircle} from "../geometry/affine-circle";
import {Complex} from "../complex";
import {AffineOuterBilliardTable, fixTime} from "./tables";

const SYMPLECTIC_PREIMAGE_PIECES = 2000;
const SYMPLECTIC_PREIMAGE_LENGTH = 20;
const UNIT_CIRCLE = new AffineCircle(new Complex(), 1);

export class AffineSemidiskTable extends AffineOuterBilliardTable {

    slicingRays: AffineRay[] = [];
    perimeter: number;
    curveTime: number;
    flatTime: number;
    x: number;
    y: number;
    leftPoint: Vector2;
    rightPoint: Vector2;


    constructor(readonly beta: number) {
        super();
        this.perimeter = 2 * (Math.PI - beta) + 2 * Math.sin(beta);
        this.curveTime = 2 * (Math.PI - beta) / this.perimeter;
        this.flatTime = 2 * Math.sin(beta) / this.perimeter;
        this.x = Math.sin(beta);
        this.y = -Math.cos(beta);
        this.leftPoint = new Vector2(-this.x, this.y);
        this.rightPoint = new Vector2(this.x, this.y);
        this.slicingRays.push(
            new AffineRay(new Vector2(-this.x, this.y), new Vector2(-this.x - 1, this.y), true)
        );
    }

    point(time: number): Vector2 {
        let t = fixTime(time);
        if (t <= this.curveTime) {
            let theta = t / this.curveTime - (Math.PI / 2 - this.beta);
            return new Vector2(Math.cos(theta), Math.sin(theta));
        } else {
            let alpha = (t - this.curveTime) / this.flatTime;
            return new Vector2((2 * alpha - 1) * this.x, Math.cos(this.beta));
        }
    }

    time(point: Vector2): number {
        if (closeEnough(point.y, this.y) && Math.abs(point.x) < this.x) {
            const alpha = (point.x / this.x + 1) / 2;
            return this.curveTime + this.flatTime * alpha;
        } else if (point.y > this.y && closeEnough(point.lengthSq(), 1)) {
            const theta = point.angle() - (Math.PI / 2 - this.beta);
            return theta / this.curveTime;
        } else {
            throw Error('point is not on boundary of semi-disk');
        }
    }

    tangentHeading(time: number): number | undefined {
        let t = fixTime(time);
        if (t === 0 || t === this.curveTime) return undefined;
        if (t < this.curveTime) {
            const theta = t * this.curveTime - (Math.PI / 2 - this.beta);
            return theta + Math.PI / 2;
        } else {
            // on the flat
            return 0;
        }
    }

    leftTangentLine(circle: AffineCircle): Line {
        if (!circle.pointOnBoundary(this.leftPoint)) {
            let cp = circle.rightTangentPoint(Complex.fromVector2(this.leftPoint));
            let l = Line.throughTwoPoints(Complex.fromVector2(this.leftPoint), cp);
            if (Number.isFinite(l.slope) && l.slope < 0) return l;
        }

        if (!circle.pointOnBoundary(this.rightPoint)) {
            let cp = circle.rightTangentPoint(Complex.fromVector2(this.rightPoint));
            let l = Line.throughTwoPoints(Complex.fromVector2(this.rightPoint), cp);
            if (Number.isFinite(l.slope) && l.slope > 0) return l;
        }

        let ls = UNIT_CIRCLE.leftTangentLineSegment(circle);
        if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
        throw Error('No right tangent line');
    }

    rightTangentLine(circle: AffineCircle): Line {
        if (!circle.pointOnBoundary(this.leftPoint)) {
            let cp = circle.leftTangentPoint(Complex.fromVector2(this.leftPoint));
            let l = Line.throughTwoPoints(Complex.fromVector2(this.leftPoint), cp);
            if (Number.isFinite(l.slope) && l.slope < 0) return l;
        }

        if (!circle.pointOnBoundary(this.rightPoint)) {
            let cp = circle.leftTangentPoint(Complex.fromVector2(this.rightPoint));
            let l = Line.throughTwoPoints(Complex.fromVector2(this.rightPoint), cp);
            if (Number.isFinite(l.slope) && l.slope > 0) return l;
        }

        let ls = UNIT_CIRCLE.rightTangentLineSegment(circle);
        if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
        throw Error('No right tangent line');
    }

    containsPoint(point: Vector2): boolean {
        return point.y > this.y && point.lengthSq() < 1;
    }

    pointOnBoundary(point: Vector2): boolean {
        if (point.y > this.y && closeEnough(point.lengthSq(), 1)) return true;
        return (closeEnough(point.y, this.y) && Math.abs(point.x) <= this.x);
    }

    // private outerRegular(point: Vector2): Vector2 {
    //     const pivot = this.rightTangentPoint(point);
    //     return this.reflectRegular(pivot, point);
    // }
    //
    // private reflectRegular(pivot: Vector2, point: Vector2) {
    //     const diff = pivot.clone().sub(point);
    //     return point.clone().add(diff.multiplyScalar(2));
    // }

    leftTangentPoint(point: Vector2): Vector2 {
        if (point.y === this.y && point.x < -this.x || this.containsPoint(point) || this.pointOnBoundary(point)) {
            throw Error('Point is not in domain of reverse map');
        }

        try {
            const cp = UNIT_CIRCLE.leftTangentPoint(Complex.fromVector2(point)).toVector2();
            if (this.pointOnBoundary(cp)) return cp;
        } catch (e) {
        }

        if (point.y < this.y) return this.leftPoint;
        return this.rightPoint;
    }

    rightTangentPoint(point: Vector2): Vector2 {
        if (point.y === this.y && point.x > this.x || this.containsPoint(point) || this.pointOnBoundary(point)) {
            throw Error('Point is not in domain of forward map');
        }

        try {
            const cp = UNIT_CIRCLE.rightTangentPoint(Complex.fromVector2(point)).toVector2();
            if (this.pointOnBoundary(cp)) return cp;
        } catch (e) {
        }

        if (point.y < this.y) return this.rightPoint;
        return this.leftPoint;
    }

    private outerSymplectic(point: Vector2, reverse: boolean = false): Vector2 {
        const circle = this.outerLengthCircle(point, reverse);
        const forward = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
        const fl = Line.throughTwoPoints(point, forward);
        let tl: Line;
        // find shared tangent between circle and unit circle
        if (reverse) {
            // if circle's leftmost point is in region 5 or if circle's bottommost point is in region 6:
            if ((circle.center.x - circle.radius >= -1 && circle.center.y < 0) ||
                (circle.center.x > 1 && circle.center.y - circle.radius < 0)) {
                tl = circle.rightTangentLine(new Complex(-1, 0));
                // want line through (-1, 0)

            }
            // if circle's rightmost point is in region 1:
            else if (circle.center.x + circle.radius > 1 && circle.center.y > 0) {
                // want line through (1, 0)
                tl = circle.rightTangentLine(new Complex(1, 0));
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.rightTangentLineSegment(UNIT_CIRCLE).line;
            }
        } else {
            if (circle.center.x + circle.radius > 1 && circle.center.y < 0) {
                tl = circle.leftTangentLineSegment(UNIT_CIRCLE).line;
            }
            // if circle's rightmost point is in region 5 or if circle's bottommost point is in region 4:
            else if ((circle.center.x + circle.radius <= 1 && circle.center.y < 0) ||
                (circle.center.x < -1 && circle.center.y - circle.radius < 0)) {
                tl = circle.leftTangentLine(new Complex(-1, 0));
                // want line through (1, 0)

            }
            // if circle's leftmost point is in region 3:
            else if (circle.center.x - circle.radius < -1 && circle.center.y > 0) {
                // want line through (-1, 0)
                tl = circle.leftTangentLine(new Complex(-1, 0));
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.rightTangentLineSegment(UNIT_CIRCLE).line;
            }
        }

        try {
            return tl.intersectLine(fl).toVector2();
        } catch (e) {
            console.log(fl, tl)
            throw e;
        }
    }

    // outerLengthCircle(point: Vector2, reverse: boolean): AffineCircle {
    //     const t1 = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
    //     const t2 = reverse ? this.rightTangentPoint(point) : this.leftTangentPoint(point);
    //     const d = t1.distanceTo(point);
    //     const m = point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
    //     const lf = Line.throughTwoPoints(point, t1);
    //     const lb = Line.throughTwoPoints(point, t2);
    //     const pf = lf.perpAtPoint(t1);
    //     const pb = lb.perpAtPoint(m);
    //     try {
    //         const cc = pf.intersectLine(pb).toVector2();
    //         const radius = cc.distanceTo(t1);
    //         return new AffineCircle(Complex.fromVector2(cc), radius);
    //     } catch (e) {
    //         console.log(t1, t2);
    //         throw e;
    //     }
    // }

    // symplecticTangentPoint(point: Vector2, reverse: boolean): Vector2 {
    //     const t1 = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
    //     const t2 = reverse ? this.rightTangentPoint(point) : this.leftTangentPoint(point);
    //     const d = t1.distanceTo(point);
    //     return point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
    // }

    override preimages(flavor: Generator, iterations: number): AffineRay[] {
        switch (flavor) {
        case Generator.LENGTH:
            return this.symplecticPreimages(iterations);
        case Generator.AREA:
            return this.regularPreimages(iterations);
        default:
            throw Error('Unknown generator');
        }
    }

    // private regularPreimages(iterations: number) {
    //     const preimages: AffineRay[] = [];
    //     let frontier: AffineRay[] = [];
    //     for (let i = 0; i < this.n; i++) {
    //         const v1 = this.vertices[i];
    //         const v2 = this.vertices[(i + 1) % this.n];
    //         const diff = v1.clone().sub(v2).normalize();
    //         frontier.push(new AffineRay(v1, v1.clone().add(diff), true));
    //     }
    //     for (let i = 0; i < iterations; i++) {
    //         preimages.push(...frontier);
    //         const newFrontier: AffineRay[] = [];
    //         for (let preimage of frontier) {
    //             const pieces = this.slicePreimage(preimage);
    //             for (let piece of pieces) {
    //                 let mid: Vector2;
    //                 if (piece.infinite) {
    //                     mid = piece.end;
    //                     // If far away and pointing away, skip
    //                     if (piece.start.lengthSq() > 10_000 &&
    //                         piece.end.clone().sub(piece.start).dot(piece.start) > 0) continue;
    //                 } else {
    //                     mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
    //                     // If far away, skip
    //                     if (mid.lengthSq() > 10_000) continue;
    //                     // If tiny, skip
    //                     if (piece.start.distanceToSquared(piece.end) < 0.000_000_01) continue;
    //                 }
    //                 let pivot: Vector2;
    //                 try {
    //                     pivot = this.reverseVertex(mid);
    //                 } catch (e) {
    //                     continue;
    //                 }
    //                 newFrontier.push(
    //                     new AffineRay(
    //                         this.reflectRegular(pivot, piece.start),
    //                         this.reflectRegular(pivot, piece.end),
    //                         piece.infinite)
    //                 );
    //             }
    //         }
    //         frontier = newFrontier;
    //     }
    //     return preimages;
    // }

    private sliceRegularPreimage(preimage: AffineRay): AffineRay[] {
        const intersections = [preimage.start, preimage.end];
        for (let slicingRay of this.slicingRays) {
            const intersection = slicingRay.intersect(preimage);
            if (intersection === null) continue;
            intersections.push(intersection);
        }
        if (intersections.length === 2) return [preimage];
        const pieces = [];
        intersections.sort((a, b) => a.distanceToSquared(preimage.start) - b.distanceToSquared(preimage.start));
        for (let i = 0; i < intersections.length - 1; i++) {
            let p1 = intersections[i];
            let p2 = intersections[i + 1];
            if (p1.distanceTo(p2) < 0.000_000_1) continue;
            pieces.push(new AffineRay(p1, p2, false));
        }
        return pieces;
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


    private regularPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
        for (let i = 1; i < SYMPLECTIC_PREIMAGE_PIECES; i++) {
            frontier.push(new AffineRay(
                new Vector2((this.x + i * dl), this.y),
                new Vector2((this.x + (i + 1) * dl), this.y),
                false));
            // frontier.push(new AffineRay(
            //     v2.clone().sub(diff.clone().multiplyScalar(i * dl)),
            //     v2.clone().sub(diff.clone().multiplyScalar((i + 1) * dl)),
            //     false));
        }
        for (let i = 0; i < iterations; i++) {
            console.log(frontier.length);
            preimages.push(...frontier);
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.sliceRegularPreimage(segment);
                } catch (e) {
                    continue;
                }
                const extraPieces = [];
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > SYMPLECTIC_PREIMAGE_LENGTH * SYMPLECTIC_PREIMAGE_LENGTH) continue;
                        const l = piece.start.distanceTo(piece.end);
                        // If tiny or giant, skip
                        if (l < dl / 5 || l > dl * 10) continue;
                        // if big, break apart
                        if (l > 5 * dl) {
                            const n = Math.ceil(l / dl);
                            const dd = l / n;
                            const dv = piece.end.clone().sub(piece.start).normalize();
                            for (let j = 0; j < n; j++) {
                                extraPieces.push(
                                    new AffineRay(
                                        piece.start.clone().addScaledVector(dv, j * dd),
                                        piece.start.clone().addScaledVector(dv, (j + 1) * dd), false)
                                );
                            }
                            continue;
                        }
                        newFrontier.push(
                            new AffineRay(
                                this.outer(piece.start, Generator.AREA, true),
                                this.outer(piece.end, Generator.AREA, true), false)
                        );
                    } catch (e) {
                        console.log(e);
                    }
                }
                for (let piece of extraPieces) {
                    try {
                        newFrontier.push(
                            new AffineRay(
                                this.outer(piece.start, Generator.AREA, true),
                                this.outer(piece.end, Generator.AREA, true), false));
                    } catch (e) {
                    }
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    private symplecticPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        const v1 = new Vector2(-1, 0);
        const diff = v1.clone();
        const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
        for (let i = 1; i < SYMPLECTIC_PREIMAGE_PIECES; i++) {
            frontier.push(new AffineRay(
                v1.clone().add(diff.clone().multiplyScalar(i * dl)),
                v1.clone().add(diff.clone().multiplyScalar((i + 1) * dl)),
                false));
            // frontier.push(new AffineRay(
            //     v2.clone().sub(diff.clone().multiplyScalar(i * dl)),
            //     v2.clone().sub(diff.clone().multiplyScalar((i + 1) * dl)),
            //     false));
        }
        for (let i = 0; i < iterations; i++) {
            try {
                for (let f of frontier) {
                    preimages.push(f);
                }
            } catch (e) {
                console.log('fail', preimages.length, frontier.length);
                return preimages;
            }
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.slicePreimage(segment, true);
                } catch (e) {
                    continue;
                }
                const extraPieces = [];
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > SYMPLECTIC_PREIMAGE_LENGTH * SYMPLECTIC_PREIMAGE_LENGTH) continue;
                        const l = piece.start.distanceTo(piece.end);
                        // If tiny, skip
                        if (l < dl / 5 || l > dl * 10) continue;
                        // if giant, break apart
                        if (l > 5 * dl) {
                            const n = Math.ceil(l / dl);
                            const dd = l / n;
                            const dv = piece.end.clone().sub(piece.start).normalize();
                            for (let j = 0; j < n; j++) {
                                extraPieces.push(
                                    new AffineRay(
                                        piece.start.clone().addScaledVector(dv, j * dd),
                                        piece.start.clone().addScaledVector(dv, (j + 1) * dd), false)
                                );
                            }
                            continue;
                        }
                        newFrontier.push(
                            new AffineRay(
                                this.outerSymplectic(piece.start, true),
                                this.outerSymplectic(piece.end, true), false));

                    } catch (e) {
                    }
                }
                for (let piece of extraPieces) {
                    try {
                        newFrontier.push(
                            new AffineRay(
                                this.outerSymplectic(piece.start, true),
                                this.outerSymplectic(piece.end, true), false));
                    } catch (e) {
                    }
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    override shape(n: number): Shape {
        const points = [];
        const dTheta = 2 * (Math.PI - this.beta) / n;
        for (let i = 0; i <= n; i++) {
            let theta = i * dTheta - (Math.PI / 2 - this.beta);
            points.push(new Vector2(Math.cos(theta), Math.sin(theta)));
        }
        const shape = new Shape(points);
        shape.closePath();
        return shape;
    }
}