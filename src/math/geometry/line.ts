import {Complex} from "../complex";
import {closeEnough} from "../math-helpers";
import {Vector2} from "three";

export class Line {
    readonly a: number;
    readonly b: number;
    readonly c: number;

    constructor(a: number,
                b: number,
                c: number) {
        if (!(isFinite(a) && isFinite(b) && isFinite(c))) throw Error('Line with non-finite coefficients');
        const l = new Complex(a, b).modulus();
        if (l === 0) throw Error('Degenerate line');
        this.a = a / l;
        this.b = b / l;
        this.c = c / l;
    }

    static srcDir(src: Complex | Vector2, dir: Complex | Vector2): Line {
        let s: Complex;
        let d: Complex;
        if (src instanceof Vector2) s = Complex.fromVector2(src);
        else s = src;
        if (dir instanceof Vector2) d = Complex.fromVector2(dir);
        else d = dir;
        if (d.isZero()) {
            throw new Error('Degenerate line');
        }
        const m = d.times(Complex.I);
        return new Line(
            m.x,
            m.y,
            -(m.x * s.x + m.y * s.y)
        );
    }

    static throughTwoPoints(c1: Complex | Vector2, c2: Complex | Vector2): Line {
        let p1: Complex;
        if (c1 instanceof Vector2) p1 = Complex.fromVector2(c1);
        else p1 = c1;
        let p2: Complex;
        if (c2 instanceof Vector2) p2 = Complex.fromVector2(c2);
        else p2 = c2;
        return Line.srcDir(p1, p2.minus(p1));
    }

    static bisector(p1: Complex, p2: Complex): Line {
        const dir = p2.minus(p1).times(Complex.I);
        return Line.srcDir(p1.plus(p2).scale(0.5), dir);
    }

    intersectLine(other: Line): Complex {
        const d = this.a * other.b - this.b * other.a;
        if (closeEnough(d, 0)) throw Error('Parallel lines do not intersect');
        const solution = new Complex(
            -other.b * this.c + this.b * other.c,
            other.a * this.c - this.a * other.c,
        ).scale(1 / d);
        if (!this.containsPoint(solution) || !other.containsPoint(solution)) {
            throw Error('Bad intersection');
        }
        return solution;
    }

    containsPoint(p: Complex): boolean {
        return closeEnough(this.a * p.x + this.b * p.y + this.c, 0);
    }

    perpAtPoint(p: Complex | Vector2): Line {
        return new Line(this.b, -this.a, -this.b * p.x + this.a * p.y);
    }

    project(p: Complex | Vector2) {
        return this.intersectLine(this.perpAtPoint(p));
    }

    get slope(): number {
        return -this.a / this.b;
    }
}