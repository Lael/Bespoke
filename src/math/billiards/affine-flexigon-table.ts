import {AffineOuterBilliardTable, fixTime} from "./tables";
import {Vector2} from "three";
import {Complex} from "../complex";
import {AffineCircle} from "../geometry/affine-circle";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {ArcSegment} from "../geometry/arc-segment";

export class AffineFlexigonTable extends AffineOuterBilliardTable {

    readonly vertices: Vector2[] = [];
    readonly centers: Vector2[] = [];
    readonly angles: Vector2[] = [];
    readonly segments: ArcSegment[] = [];

    constructor(readonly n: number, readonly k: number) {
        super();
        if (k <= 0 || k > 1 || !Number.isInteger(n) || n < 2) {
            throw Error("bad parameters");
        }

        let offset = (n === 2) ? 0 : Math.PI / 2;
        for (let i = 0; i < n; i++) {
            this.vertices.push(Complex.polar(1, Math.PI * 2 / n * i + offset).toVector2());
        }
        let r = 1. / k;
        let l = this.vertices[0].distanceTo(this.vertices[1]) / 2;
        let d = Math.sqrt(r * r - l * l);
        for (let i = 0; i < n; i++) {
            let v1 = this.vertices[i];
            let v2 = this.vertices[(i + 1) % this.n];
            let m = v1.clone().lerp(v2, 0.5);
            let dv = v2.clone().sub(v1).normalize();
            let c = m.add(new Vector2(-dv.y, dv.x).multiplyScalar(d));
            this.centers.push(c);
            let a1 = v1.clone().sub(c).angle();
            let a2 = normalizeAngle(v2.clone().sub(c).angle(), a1);
            this.angles.push(new Vector2(a1, a2));
            this.segments.push(new ArcSegment(Complex.fromVector2(c), r, a1, a2));
        }
    }

    containsPoint(point: Vector2): boolean {
        for (let s of this.segments) {
            if (!s.circle.containsPoint(Complex.fromVector2(point))) return false;
        }
        return true;
    }

    leftTangentLine(circle: AffineCircle): Line {
        for (let s of this.segments) {
            try {
                let ls = s.circle.leftTangentLineSegment(circle);
                if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
            } catch (e) {
            }
        }
        for (let i = 0; i < this.n; i++) {
            const v2 = this.vertices[(i + 1) % this.n];
            const a2 = this.angles[i].y + Math.PI / 2;
            const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
            const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
            const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
            const cp = circle.rightTangentPoint(Complex.fromVector2(v2));
            const d = v2.clone().sub(cp.toVector2());
            if (d.cross(s2) >= 0 && d.cross(s3) <= 0) return Line.throughTwoPoints(cp, v2.clone());
        }
        throw Error("no left tangent line");
    }

    rightTangentLine(circle: AffineCircle): Line {
        for (let i = 0; i < this.n; i++) {
            let s = this.segments[i];
            try {
                let ls = s.circle.rightTangentLineSegment(circle);
                let as = this.angles[i];
                let h = normalizeAngle(s.center.heading(ls.end), as.x);
                if (h < normalizeAngle(as.y, as.x)) {
                    return ls.line;
                }
            } catch (e) {
                // console.log(e);
            }
        }
        for (let i = 0; i < this.n; i++) {
            const v = this.vertices[(i + 1) % this.n];
            const a2 = this.angles[i].y + Math.PI / 2;
            const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
            const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
            const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
            const cp = circle.leftTangentPoint(Complex.fromVector2(v));
            const d = cp.toVector2().sub(v);
            if (closeEnough(d.length(), 0)) continue;
            if (d.cross(s2) >= 0 && d.cross(s3) <= 0) return Line.throughTwoPoints(cp, v.clone());
        }
        throw Error("no right tangent line");
    }

    leftTangentPoint(point: Vector2): Vector2 {
        for (let s of this.segments) {
            try {
                let p = s.circle.leftTangentPoint(Complex.fromVector2(point)).toVector2();
                if (this.pointOnBoundary(p)) return p;
            } catch (e) {

            }
        }
        for (let i = 0; i < this.n; i++) {
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            const a2 = this.angles[i].y + Math.PI / 2;
            const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
            const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
            const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
            const d2 = point.clone().sub(v2);
            const d3 = point.clone().sub(v3);
            if (s2.cross(d2) >= 0 && s3.cross(d3) <= 0) return v2;
        }
        throw Error("no left tangent point");
    }

    rightTangentPoint(point: Vector2): Vector2 {
        for (let s of this.segments) {
            try {
                let p = s.circle.rightTangentPoint(Complex.fromVector2(point)).toVector2();
                if (this.pointOnBoundary(p)) return p;
            } catch (e) {
            }
        }
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const a2 = this.angles[i].y + Math.PI / 2;
            const s2 = new Vector2(Math.cos(a2), Math.sin(a2));
            const a3 = this.angles[(i + 1) % this.n].x + Math.PI / 2;
            const s3 = new Vector2(Math.cos(a3), Math.sin(a3));
            const d1 = point.clone().sub(v1);
            const d2 = point.clone().sub(v2);
            if (s2.cross(d1) <= 0 && s3.cross(d2) >= 0) return v2;
        }
        throw Error("no right tangent point");
    }

    point(time: number): Vector2 {
        let t = fixTime(time);
        let i = Math.floor(t * this.n);
        let v1 = this.vertices[i];
        let v2 = this.vertices[(i + 1) % this.n];
        let alpha = t * this.n - i;
        if (this.k === 0) return v1.clone().lerp(v2, alpha);
        let c = this.centers[i];
        let theta = this.angles[i].x * (1 - alpha) + this.angles[i].y * alpha;
        return c.clone().add(new Vector2(1. / this.k * Math.cos(theta), 1. / this.k * Math.sin(theta)));
    }

    pointOnBoundary(point: Vector2): boolean {
        for (let s of this.segments) {
            if (s.containsPoint(Complex.fromVector2(point))) return true;
        }
        return false;
    }

    tangentHeading(time: number): number | undefined {
        let t = fixTime(time);
        let i = Math.floor(t * this.n);
        let v1 = this.vertices[i];
        let v2 = this.vertices[(i + 1) % this.n];
        let alpha = t * this.n - i;
        if (this.k === 0) return v2.clone().sub(v1).angle();
        let theta = this.angles[i].x * (1 - alpha) + this.angles[i].y * alpha;
        return normalizeAngle(theta + Math.PI / 2);
    }

    time(point: Vector2): number {
        return 0;
    }
}