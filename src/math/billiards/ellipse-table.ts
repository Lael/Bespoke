import {BufferGeometry, Line, LineBasicMaterial, Path, Vector2} from "three";
import {Line as GeoLine} from "../geometry/line";
import {Complex} from "../complex";
import {AffineCircle} from "../geometry/affine-circle";
import {normalizeAngle} from "../math-helpers";

export class EllipseTable {
    drawable: Line;
    a: number;
    b: number;

    constructor(e: number) {
        // assume area = 1
        // ab = 1;
        this.b = Math.pow(1 - e * e, -0.25);
        this.a = 1 / this.b;

        const path = new Path();
        path.absellipse(0, 0, this.a, this.b, 0, 2 * Math.PI, true, 0);
        const points = path.getPoints(128);

        this.drawable = new Line(
            new BufferGeometry().setFromPoints(points),
            new LineBasicMaterial({color: 0xffffff})
        );
    }

    point(t: number): Vector2 {
        return new Vector2(
            this.a * Math.cos(t * 2 * Math.PI),
            this.b * Math.sin(t * 2 * Math.PI),
        )
    }

    tangent(t: number): Vector2 {
        return new Vector2(
            -this.a * Math.sin(t * 2 * Math.PI),
            this.b * Math.cos(t * 2 * Math.PI),
        ).normalize();
    }

    cast(t: number, alpha: number): Vector2 {
        const start = this.point(t);
        const v = this.tangent(t).rotateAround(new Vector2(), alpha * Math.PI);
        const line = GeoLine.srcDir(
            new Complex(start.x / this.a, start.y / this.b),
            new Complex(v.x / this.a, v.y / this.b)
        );

        const intersections = new AffineCircle(new Complex(), 1).intersectLine(line);
        for (let i of intersections) {
            let iv = new Vector2(i.x * this.a, i.y * this.b);
            if (iv.distanceTo(start) < 0.000_001) continue;
            const newT = normalizeAngle(i.argument(), 0) / (2 * Math.PI);

            const endPoint = this.point(newT);
            const endTangent = this.tangent(newT);
            const newAlpha = normalizeAngle(Math.PI + (endTangent.angle() - (start.sub(endPoint)).angle())) / Math.PI;
            return new Vector2(newT, newAlpha);
        }
        throw Error('no intersection');
    }
}