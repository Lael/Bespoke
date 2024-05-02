import {
    halfPlaneToKlein,
    halfPlaneToPoincare,
    HyperGeodesic,
    HyperPoint,
    kleinToHalfPlane,
    kleinToPoincare,
    poincareToHalfPlane,
    poincareToKlein
} from './hyperbolic';
import {Complex} from "../complex";
import {HyperPolygon, IdealArc} from "./hyper-polygon";

describe('Hyperbolic Geometry', () => {
    describe('Converters', () => {
        it('converts poincare to klein', () => {
            expect(poincareToKlein(new Complex(0.5, 0))).toEqual(new Complex(0.8, 0));
        });

        it('converts klein to poincare', () => {
            expect(kleinToPoincare(new Complex(0.8, 0))).toEqual(new Complex(0.5, 0));
        });

        it('converts poincare to half geometry', () => {
            expect(poincareToHalfPlane(Complex.ZERO).equals(new Complex(0, 1))).toBeTrue();
            expect(poincareToHalfPlane(new Complex(0, -1)).equals(Complex.ZERO)).toBeTrue();
            expect(poincareToHalfPlane(Complex.ONE).equals(Complex.ONE)).toBeTrue();
            expect(poincareToHalfPlane(new Complex(0, 1)).isInfinite()).toBeTrue();
        });

        it('converts half geometry to poincare', () => {
            expect(halfPlaneToPoincare(new Complex(0, 1)).equals(Complex.ZERO)).toBeTrue();
            expect(halfPlaneToPoincare(Complex.ZERO).equals(new Complex(0, -1))).toBeTrue();
            expect(halfPlaneToPoincare(Complex.ONE).equals(Complex.ONE)).toBeTrue();
            expect(halfPlaneToPoincare(Complex.INFINITY).equals(new Complex(0, 1))).toBeTrue();
        });

        it('converts klein to half geometry', () => {
            expect(kleinToHalfPlane(Complex.ZERO).equals(new Complex(0, 1))).toBeTrue();
            expect(kleinToHalfPlane(new Complex(0, -1)).equals(Complex.ZERO)).toBeTrue();
            expect(kleinToHalfPlane(Complex.ONE).equals(Complex.ONE)).toBeTrue();
            expect(kleinToHalfPlane(new Complex(0, 1)).isInfinite()).toBeTrue();
        });

        it('converts half geometry to klein', () => {
            expect(halfPlaneToKlein(new Complex(0, 1)).equals(Complex.ZERO)).toBeTrue();
            expect(halfPlaneToKlein(Complex.ZERO).equals(new Complex(0, -1))).toBeTrue();
            expect(halfPlaneToKlein(Complex.ONE).equals(Complex.ONE)).toBeTrue();
            expect(halfPlaneToKlein(Complex.INFINITY).equals(new Complex(0, 1))).toBeTrue();
        });
    });

    describe('HyperPoint', () => {
        it('validates Poincaré points', () => {
            expect(function () {
                HyperPoint.fromPoincare(new Complex(0.5, 0.5));
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromPoincare(new Complex(0.1, 0.2).normalize());
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromPoincare(new Complex(0.1, 0.2).normalize(1.1));
            }).toThrow();

            expect(function () {
                HyperPoint.fromPoincare(Complex.INFINITY);
            }).toThrow();
        });

        it('validates Klein points', () => {
            expect(function () {
                HyperPoint.fromKlein(new Complex(0.5, 0.5));
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromKlein(new Complex(0.1, 0.2).normalize());
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromKlein(new Complex(0.1, 0.2).normalize(1.1));
            }).toThrow();

            expect(function () {
                HyperPoint.fromKlein(Complex.INFINITY);
            }).toThrow();
        });

        it('validates half-geometry points', () => {
            expect(function () {
                HyperPoint.fromHalfPlane(new Complex(0.5, 0.5));
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromHalfPlane(new Complex(0.1, 0.0));
            }).not.toThrow();

            expect(function () {
                HyperPoint.fromHalfPlane(new Complex(0.1, -0.2));
            }).toThrow();

            expect(function () {
                HyperPoint.fromHalfPlane(Complex.INFINITY);
            }).not.toThrow();
        });

        it('checks equality', () => {
            const p1 = HyperPoint.fromPoincare(new Complex(0.5, 0));
            const p2 = HyperPoint.fromKlein(new Complex(0.8, 0));
            expect(p1.equals(p2)).toBeTrue();
        })
    });

    describe('HyperGeodesic', () => {
        it('computes winding number', () => {
            const p0 = HyperPoint.fromKlein(Complex.ZERO);
            const p1 = HyperPoint.fromKlein(new Complex(0.5, 0.5));
            const p2 = HyperPoint.fromKlein(new Complex(-0.5, 0.5));
            const p3 = HyperPoint.fromKlein(new Complex(0, 1));
            const g = new HyperGeodesic(p1, p2);
            expect(g.wind(p0)).toEqual(Math.PI / 2);
            expect(g.wind(p3)).toEqual(-Math.PI / 2);
        });
    });

    describe('IdealArc', () => {
        it('computes winding number anti-clockwise small', () => {
            const arc = new IdealArc(
                HyperPoint.fromPoincare(Complex.ONE),
                HyperPoint.fromPoincare(new Complex(1, 1).normalize()),
                HyperPoint.fromPoincare(new Complex(0, 1)));
            expect(arc.wind(HyperPoint.fromKlein(Complex.ZERO))).toEqual(Math.PI / 2);
            expect(arc.wind(HyperPoint.fromKlein(new Complex(0.5, 0.5)))).toEqual(Math.PI);
        });

        it('computes winding number anti-clockwise large', () => {
            const arc = new IdealArc(
                HyperPoint.fromPoincare(Complex.ONE),
                HyperPoint.fromPoincare(new Complex(-1, 1).normalize()),
                HyperPoint.fromPoincare(new Complex(0, -1)));
            expect(arc.wind(HyperPoint.fromKlein(Complex.ZERO))).toEqual(3 * Math.PI / 2);
            expect(arc.wind(HyperPoint.fromKlein(new Complex(0.5, -0.5)))).toEqual(Math.PI);
        });

        it('computes winding number clockwise small', () => {
            const arc = new IdealArc(
                HyperPoint.fromPoincare(new Complex(0, 1)),
                HyperPoint.fromPoincare(new Complex(1, 1).normalize()),
                HyperPoint.fromPoincare(Complex.ONE));
            expect(arc.wind(HyperPoint.fromKlein(Complex.ZERO))).toEqual(-Math.PI / 2);
            expect(arc.wind(HyperPoint.fromKlein(new Complex(0.5, 0.5)))).toEqual(-Math.PI);
        });

        it('computes winding number clockwise large', () => {
            const arc = new IdealArc(
                HyperPoint.fromPoincare(new Complex(0, -1)),
                HyperPoint.fromPoincare(new Complex(-1, 1).normalize()),
                HyperPoint.fromPoincare(Complex.ONE));
            expect(arc.wind(HyperPoint.fromKlein(Complex.ZERO))).toEqual(-3 * Math.PI / 2);
            expect(arc.wind(HyperPoint.fromKlein(new Complex(0.5, -0.5)))).toEqual(-Math.PI);
        });
    });

    describe('HyperPolygon', () => {
        it('computes convex intersection without ideal arcs', () => {
            const p0 = HyperPoint.fromKlein(Complex.ZERO);
            const p1 = HyperPoint.fromKlein(new Complex(0.5, 0));
            const p2 = HyperPoint.fromKlein(new Complex(0.5, 0.5));
            const p3 = HyperPoint.fromKlein(new Complex(0, 0.5));

            const p4 = HyperPoint.fromKlein(new Complex(-0.25, -0.25));
            const p5 = HyperPoint.fromKlein(new Complex(0.25, -0.25));
            const p6 = HyperPoint.fromKlein(new Complex(0.25, 0.25));
            const p7 = HyperPoint.fromKlein(new Complex(-0.25, 0.25));

            const poly1 = HyperPolygon.fromVertices(p0, p1, p2, p3);
            const poly2 = HyperPolygon.fromVertices(p4, p5, p6, p7);

            const intersection = poly1.convexIntersect(poly2);

            expect(intersection).toBeDefined();
            expect(intersection?.geodesics.length).toEqual(4);
            expect(intersection?.arcs.length).toEqual(0);
            expect(intersection?.containsPoint(p0, false)).toBeTrue();
            expect(intersection?.containsPoint(p6, false)).toBeTrue();
            expect(intersection?.containsPoint(p0, true)).toBeFalse();
            expect(intersection?.containsPoint(p6, true)).toBeFalse();
        });

        it('computes convex intersection with ideal arcs', () => {
            const p0 = HyperPoint.fromKlein(Complex.ZERO);
            const p1 = HyperPoint.fromKlein(Complex.polar(1, 0));
            const p2 = HyperPoint.fromKlein(Complex.polar(1, Math.PI / 4));
            const p3 = HyperPoint.fromKlein(Complex.polar(1, 2 * Math.PI / 4));
            const p4 = HyperPoint.fromKlein(Complex.polar(1, 3 * Math.PI / 4));

            const poly1 = new HyperPolygon([
                new HyperGeodesic(p0, p1),
                new IdealArc(p1, p2, p3),
                new HyperGeodesic(p3, p0),
            ]);
            const poly2 = new HyperPolygon([
                new HyperGeodesic(p0, p2),
                new IdealArc(p2, p3, p4),
                new HyperGeodesic(p4, p0),
            ]);

            const intersection = poly1.convexIntersect(poly2);

            expect(intersection).toBeDefined();
            expect(intersection?.geodesics.length).toEqual(2);
            expect(intersection?.arcs.length).toEqual(1);
            expect(intersection?.containsPoint(p2, false)).toBeTrue();
            expect(intersection?.containsPoint(p3, false)).toBeTrue();
            expect(intersection?.containsPoint(p2, true)).toBeFalse();
            expect(intersection?.containsPoint(p3, true)).toBeFalse();
        });
    })
});
