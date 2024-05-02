import {closeEnough} from "./math-helpers";
import {Vector2} from "three";

export class Complex {

    static readonly ZERO: Complex = new Complex(0, 0);
    static readonly ONE: Complex = new Complex(1, 0);
    static readonly I = new Complex(0, 1);
    static readonly INFINITY = new Complex(Infinity, Infinity);

    private arg?: number;
    private mod?: number;
    private mod2?: number;

    constructor(readonly real: number = 0, readonly imag: number = 0) {
        if (isNaN(real) || isNaN(imag)) {
            throw new Error('Cannot pass NaN to complex.');
        }
    }

    static polar(radius: number, angle: number): Complex {
        if (!isFinite(radius)) return Complex.INFINITY;
        if (!isFinite(angle)) throw Error('Angle cannot be infinite');
        return new Complex(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
        );
    }

    static fromVector2(vec: Vector2): Complex {
        return new Complex(vec.x, vec.y);
    }

    toVector2(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    get x(): number {
        return this.real;
    }

    get y(): number {
        return this.imag;
    }

    isInfinite(): boolean {
        return !this.isFinite();
    }

    isFinite(): boolean {
        return isFinite(this.real) && isFinite(this.imag);
    }

    isZero(): boolean {
        return this.modulusSquared() < 0.000_000_01 * 0.000_000_01;
    }

    modulus(): number {
        if (this.mod === undefined) {
            if (this.isInfinite()) this.mod = Infinity;
            else this.mod = Math.sqrt(this.modulusSquared());
        }
        return this.mod;
    }

    modulusSquared(): number {
        if (this.mod2 === undefined) {
            if (this.isInfinite()) this.mod2 = Infinity;
            else this.mod2 = this.real * this.real + this.imag * this.imag;
        }
        return this.mod2;
    }

    normalize(l: number = 1): Complex {
        if (isNaN(l)) throw Error('Normalizing length is NaN');
        if (this.isZero()) throw Error('Cannot normalize 0');
        return new Complex(this.real, this.imag).scale(l / this.modulus())
    }

    argument(): number {
        if (this.isInfinite()) throw Error('Infinity has no argument');
        if (this.isZero()) throw Error('Zero has no argument');
        if (this.arg === undefined) this.arg = Math.atan2(this.imag, this.real);
        return this.arg;
    }

    get conjugate(): Complex {
        return new Complex(this.real, -this.imag);
    }

    plus(other: Complex): Complex {
        if (this.isInfinite() && other.isInfinite()) throw Error('Undefined complex operation: inf + inf');
        if (this.isInfinite() || other.isInfinite()) return Complex.INFINITY;
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    minus(other: Complex): Complex {
        return this.plus(other.scale(-1));
    }

    scale(d: number): Complex {
        return new Complex(this.real * d, this.imag * d);
    }

    times(other: Complex): Complex {
        if (this.isInfinite() && other.isZero()) {
            throw Error('Indeterminate form: inf * 0');
        }
        if (this.isZero() && other.isInfinite()) {
            throw Error('Indeterminate form: 0 * inf');
        }
        if (this.isInfinite() || other.isInfinite()) {
            return Complex.INFINITY;
        }
        return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real);
    }

    over(other: Complex): Complex {
        if (this.isInfinite() && other.isInfinite()) {
            throw Error('Indeterminate form: inf / inf');
        }
        if (this.isZero() && other.isZero()) {
            throw Error('Indeterminate form: 0 / 0');
        }
        if (other.isZero()) return Complex.INFINITY;
        if (other.isInfinite()) return Complex.ZERO;
        return this.times(other.conjugate).scale(1 / other.modulusSquared());
    }

    sqrt(): Complex {
        return this.pow(0.5);
    }

    pow(p: number): Complex {
        if (!isFinite(p)) throw Error('Non-finite powers are not supported');
        if (this.isZero()) return Complex.ZERO;
        if (this.isInfinite()) {
            if (p === 0) throw Error('Indeterminate form: inf ^ 0');
            return Complex.INFINITY;
        }
        const r = Math.pow(this.modulus(), p);
        const a = this.argument() * p;
        return Complex.polar(r, a);
    }

    distance(other: Complex): number {
        return this.minus(other).modulus();
    }

    distanceSquared(other: Complex): number {
        return this.minus(other).modulusSquared();
    }

    heading(p: Complex) {
        return p.minus(this).argument();
    }

    toString(): string {
        if (this.isInfinite()) return 'inf';
        if (this.isZero()) return '0';
        if (this.real === 0) return `${Complex.decimal(this.imag)}i`
        if (this.imag === 0) return `${Complex.decimal(this.real)}`
        if (this.imag < 0) return `${Complex.decimal(this.real)} - ${Complex.decimal(Math.abs(this.imag))}i`
        return `${Complex.decimal(this.real)} + ${Complex.decimal(this.imag)}i`
    }

    private static decimal(v: number, places: number = 3): number {
        const t = Math.pow(10, places);
        return Math.round(v * t) / t;
    }

    equals(other: Complex): boolean {
        if (this.isInfinite()) return other.isInfinite();
        return closeEnough(this.distanceSquared(other), 0);
    }

    static lerp(z1: Complex, z2: Complex, t: number) {
        if (z1.isInfinite() && z2.isInfinite()) return this.INFINITY;
        if (z1.isInfinite() || z2.isInfinite()) throw Error('lerp to infinity');
        if (t < 0 || t > 1) throw Error('lerp factor not in [0, 1]');
        return z1.plus(z2.minus(z1).scale(t));
    }

    cross(other: Complex) {
        return this.x * other.y - this.y * other.x;
    }

    dot(other: Complex) {
        return this.x * other.x + this.y * other.y;
    }
}