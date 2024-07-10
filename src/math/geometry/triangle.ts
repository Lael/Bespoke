import {BufferGeometry, Line as ThreeLine, LineBasicMaterial, Vector2, Vector3} from "three";
import {closeEnough, includedAngle} from "../math-helpers";
import {Line} from "./line";
import {Complex} from "../complex";
import {AffineCircle} from "./affine-circle";

export class Triangle {
    constructor(
        readonly p1: Vector2,
        readonly p2: Vector2,
        readonly p3: Vector2,
    ) {
    }

    get angleA(): number {
        return includedAngle(this.p3, this.p1, this.p2);
    }

    get angleB(): number {
        return includedAngle(this.p1, this.p2, this.p3);
    }

    get angleC(): number {
        return includedAngle(this.p2, this.p3, this.p1);
    }

    get angles(): Vector3 {
        return new Vector3(
            this.angleA,
            this.angleB,
            this.angleC,
        );
    }

    get sideA(): number {
        return this.p2.distanceTo(this.p3);
    }

    get sideB(): number {
        return this.p3.distanceTo(this.p1);
    }

    get sideC(): number {
        return this.p1.distanceTo(this.p2);
    }

    get area(): number {
        return Math.abs(this.p2.clone().sub(this.p1).cross(this.p3.clone().sub(this.p1))) / 2.0;
    }


    extouch(): Triangle {
        return Triangle.fromThreeSides(
            Math.sqrt(this.sideA * this.sideA - this.area * this.area / (this.sideB * this.sideC)),
            Math.sqrt(this.sideB * this.sideB - this.area * this.area / (this.sideC * this.sideA)),
            Math.sqrt(this.sideC * this.sideC - this.area * this.area / (this.sideA * this.sideB)),
        );
    }

    guessTouch(): Triangle {
        // a'2 = 2*a2 - sA / 2
        // b'c' =
        // cos(A') = (a'2 - b'2 - c'2)/(2b'c')
        const sA = Math.sin(this.angleA);
        const sB = Math.sin(this.angleB);
        const sC = Math.sin(this.angleC);
        const sABC = sA * sB * sC;
        const sA2 = Math.pow(sA, 2);
        const sB2 = Math.pow(sB, 2);
        const sC2 = Math.pow(sC, 2);
        return Triangle.fromThreeAngles(
            Math.PI - Math.acos(
                (4 * (sA2 - sB2 - sC2) - sABC * (sA - sB - sC)) / (2 * Math.sqrt((4 * sB2 - sB * sABC) * (4 * sC2 - sC * sABC)))
            ),
            Math.PI - Math.acos(
                (4 * (sB2 - sC2 - sA2) - sABC * (sB - sC - sA)) / (2 * Math.sqrt((4 * sC2 - sC * sABC) * (4 * sA2 - sA * sABC)))
            ),
            Math.PI - Math.acos(
                (4 * (sC2 - sA2 - sB2) - sABC * (sC - sA - sB)) / (2 * Math.sqrt((4 * sA2 - sA * sABC) * (4 * sB2 - sB * sABC)))
            ),
        );
        // const ap2 = 2 * sA / (sB * sC) - sA / 2;
        // const bp2 = 2 * sB / (sC * sA) - sB / 2;
        // const cp2 = 2 * sC / (sA * sB) - sC / 2;
        // const ap = Math.sqrt(ap2);
        // const bp = Math.sqrt(bp2);
        // const cp = Math.sqrt(cp2);
        // return Triangle.fromThreeAngles(
        //     Math.PI - Math.acos((ap2 - bp2 - cp2) / (2 * bp * cp)),
        //     Math.PI - Math.acos((bp2 - cp2 - ap2) / (2 * cp * ap)),
        //     Math.PI - Math.acos((cp2 - ap2 - bp2) / (2 * ap * bp)),
        // );
    }

    evolve(dt: number): Triangle {
        const vertices = [this.p1, this.p2, this.p3];
        const newVertices = [];
        for (let j = 0; j < 3; j++) {
            const vp = vertices[(j + 2) % 3];
            const v = vertices[j];
            const vn = vertices[(j + 1) % 3];

            const u = v.clone().sub(vp).normalize().add(vn.clone().sub(v).normalize());

            const newV = v.add(u.multiplyScalar(dt));
            newVertices.push(newV);
        }
        return new Triangle(newVertices[0], newVertices[1], newVertices[2]);
    }

    static fromThreeAngles(angleA: number,
                           angleB: number,
                           angleC: number = -1): Triangle {
        if (angleC == -1) angleC = Math.PI - angleA - angleB;
        if (angleA < 0 || angleB < 0 || angleC < 0 || !closeEnough(angleA + angleB + angleC, Math.PI)) {
            throw Error(`invalid trio of angles: ${angleA}, ${angleB}, ${angleC}, ${angleA + angleB + angleC}`);
        }
        const l1 = Line.srcDir(new Complex(), Complex.polar(1, angleA));
        const l2 = Line.srcDir(new Complex(1, 0), Complex.polar(1, Math.PI - angleB));
        const p3 = l1.intersectLine(l2);
        return new Triangle(new Vector2(), new Vector2(1, 0), new Vector2(p3.x, p3.y)).withArea(1);
    }

    static fromThreeSides(sideA: number, sideB: number, sideC: number): Triangle {
        if (sideA <= 0 || sideB <= 0 || sideC <= 0 ||
            sideA + sideB <= sideC ||
            sideB + sideC <= sideA ||
            sideC + sideA <= sideB) {
            throw Error('invalid trio of side lengths');
        }

        let c1 = new AffineCircle(new Complex(), sideB);
        let c2 = new AffineCircle(new Complex(sideC, 0), sideA);
        let intersections = c1.intersectCircle(c2);
        for (let i of intersections) {
            if (i.y >= 0) return new Triangle(new Vector2(), new Vector2(sideC, 0), i.toVector2());
        }
        throw Error('failed to make triangle from three sides');
    }

    get line(): ThreeLine {
        return new ThreeLine(
            new BufferGeometry().setFromPoints([
                this.p1,
                this.p2,
                this.p3,
                this.p1,
            ]),
            new LineBasicMaterial({color: 0x8888ff})
        );
    }

    withPerimeter(p: number = 1): Triangle {
        const s = p / this.perimeter;
        this.p1.multiplyScalar(s);
        this.p2.multiplyScalar(s);
        this.p3.multiplyScalar(s);
        return this;
    }

    withArea(a: number = 1): Triangle {
        const s = Math.sqrt(a / this.area);
        this.p1.multiplyScalar(s);
        this.p2.multiplyScalar(s);
        this.p3.multiplyScalar(s);
        return this;
    }

    get perimeter(): number {
        return this.p1.distanceTo(this.p2) + this.p2.distanceTo(this.p3) + this.p3.distanceTo(this.p1);
    }

    centroid(): Vector2 {
        return this.p1.clone().add(this.p2).add(this.p3).multiplyScalar(1. / 3);
    }

    translate(v: Vector2): Triangle {
        this.p1.add(v);
        this.p2.add(v);
        this.p3.add(v);
        return this;
    }
}