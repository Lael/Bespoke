import {Transformation} from "./transformation";
import {Complex} from "./complex";
import {solveQuadratic} from "./math-helpers";

export class Mobius extends Transformation {
    static readonly IDENTITY = new Mobius(Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE);

    private readonly a: Complex;
    private readonly b: Complex;
    private readonly c: Complex;
    private readonly d: Complex;

    constructor(
        av: Complex | number,
        bv: Complex | number,
        cv: Complex | number,
        dv: Complex | number) {
        super();
        const a: Complex = (av instanceof Complex) ? av : new Complex(av, 0);
        const b: Complex = (bv instanceof Complex) ? bv : new Complex(bv, 0);
        const c: Complex = (cv instanceof Complex) ? cv : new Complex(cv, 0);
        const d: Complex = (dv instanceof Complex) ? dv : new Complex(dv, 0);

        const det = a.times(d).minus(b.times(c));
        if (det.isZero()) throw Error('Degenerate Möbius transformation');
        if (a.isInfinite() || b.isInfinite() || c.isInfinite() || d.isInfinite())
            throw Error('Möbius transformation with infinite coefficient');
        const sd = det.pow(0.5);
        this.a = a.over(sd);
        this.b = b.over(sd);
        this.c = c.over(sd);
        this.d = d.over(sd);
    }

    override apply(z: Complex): Complex {
        if (z.isInfinite()) return this.a.over(this.c);
        const n = this.a.times(z).plus(this.b);
        const d = this.c.times(z).plus(this.d);
        return n.over(d);
    }

    inverse(): Mobius {
        return new Mobius(this.d, this.b.scale(-1), this.c.scale(-1), this.a);
    }

    compose(inner: Mobius) {
        return new Mobius(
            this.a.times(inner.a).plus(this.b.times(inner.c)),
            this.a.times(inner.b).plus(this.b.times(inner.d)),
            this.c.times(inner.a).plus(this.d.times(inner.c)),
            this.c.times(inner.b).plus(this.d.times(inner.d)),
        )
    }

    fixedPoints(): Complex[] {
        if (this.c.isZero() && this.a.equals(this.d)) return [new Complex()];
        if (this.c.isZero()) return [this.b.over(this.d.minus(this.a))];
        return solveQuadratic(this.c, this.d.minus(this.a), this.b.scale(-1));
    }

    static to01Inf(z1: Complex, z2: Complex, z3: Complex): Mobius {
        if (z1.equals(z2) || z2.equals(z3) || z3.equals(z1)) throw Error('Degenerate Möbius transformation');
        if (z1.isInfinite()) {
            return new Mobius(
                Complex.ZERO,
                z3.minus(z2),
                new Complex(-1, 0),
                z3
            );
        }
        if (z2.isInfinite()) {
            return new Mobius(
                Complex.ONE,
                z1.scale(-1),
                Complex.ONE,
                z3.scale(-1)
            );
        }
        if (z3.isInfinite()) {
            return new Mobius(
                new Complex(-1, 0),
                z1,
                Complex.ZERO,
                z1.minus(z2)
            );
        }
        const aa = z2.minus(z3);
        const bb = z1.scale(-1).times(aa);
        const cc = z2.minus(z1);
        const dd = z3.scale(-1).times(cc);

        return new Mobius(aa, bb, cc, dd);
    }


    static mapThree(z1: Complex, z2: Complex, z3: Complex,
                    w1: Complex, w2: Complex, w3: Complex): Mobius {
        return Mobius.to01Inf(w1, w2, w3).inverse().compose(Mobius.to01Inf(z1, z2, z3));
    }

    static pointInversion(p: Complex): Mobius {
        if (p.isZero())
            if (p.modulusSquared() >= 1) throw Error('Non-interior point inversion');
        if (p.isZero()) return new Mobius(new Complex(-1), Complex.ZERO, Complex.ZERO, Complex.ONE);
        return new Mobius(
            1 + p.modulusSquared(),
            p.scale(-2),
            p.conjugate.scale(2),
            -(1 + p.modulusSquared()),
        );
        // const g = new HyperbolicGeodesic(Complex.ZERO, p);
        // return this.mapThree(
        //     p, g.ideal1, g.ideal2,
        //     p, g.ideal2, g.ideal1
        // );
    }

    static rotateAroundPoint(p: Complex, a: number) {
        const b1 = this.blaschke(p);
        const b2 = this.blaschke(p.scale(-1));
        const r = this.rotation(a);
        return b2.compose(r.compose(b1));
    }

    static blaschke(p: Complex) {
        return new Mobius(new Complex(1), p.scale(-1), p.conjugate.scale(-1), new Complex(1));
    }

    override toString(): string {
        return `[(${this.a})z + (${this.b})] / [${this.c}z + (${this.d})]`;
    }

    equals(other: Mobius) {
        return this.a.equals(other.a)
            && this.b.equals(other.b)
            && this.c.equals(other.c)
            && this.d.equals(other.d);
    }

    static rotation(r: number): Mobius {
        return new Mobius(Complex.polar(1, r), Complex.ZERO, Complex.ZERO, Complex.ONE);
    }
}