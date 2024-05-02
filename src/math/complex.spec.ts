import {Complex} from './complex';

describe('Complex', () => {
    describe('properties', () => {
        it('should compute magnitude', () => {
            const c = new Complex(1, 2);
            expect(c.modulus()).toEqual(Math.sqrt(5));
            expect(c.modulusSquared()).toEqual(5);
            expect(Complex.INFINITY.modulus()).toEqual(Number.POSITIVE_INFINITY);
        });

        it('should compute argument', () => {
            expect(function () {
                (Complex.ZERO).argument();
            }).toThrowError('Zero has no argument');
            expect(new Complex(0, 1).argument()).toEqual(Math.PI / 2);
            expect(new Complex(-1, 0).argument()).toEqual(Math.PI);
        });

        it('')
    });
    describe('arithmetic', () => {
        it('should add complex numbers', () => {
            expect(new Complex(1, 2).plus(new Complex(3, 4)))
                .toEqual(new Complex(4, 6));
            expect(new Complex(1, 2).plus(Complex.INFINITY)).toEqual(Complex.INFINITY);
        });
    });
});
