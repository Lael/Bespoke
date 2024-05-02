import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {CommonModule} from "@angular/common";

function partitions(n: number, largestPart: number = n): number[][] {
    if (n <= 0) return [[]];
    if (n == 1) return [[1]];

    let parts = [];
    for (let i = largestPart; i > 0; i--) {
        for (let partition of partitions(n - i, Math.min(n - i, i))) {
            parts.push([i].concat(partition));
        }
    }
    return parts;
}

function distinctPermutations(list: number[]): number[][] {
    if (list.length === 0) return [[]];
    const distinctValues = new Set(list).values();
    const dps = [];
    for (let v of distinctValues) {
        const remainder = [];
        let removed = false;
        for (let el of list) {
            if (el == v && !removed) {
                removed = true;
            } else {
                remainder.push(el);
            }
        }
        for (let dp of distinctPermutations(remainder)) {
            dps.push([v].concat(dp));
        }
    }
    return dps;
}

const SUPERSCRIPTS = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function symmetricPolynomials(degree: number, vars: string[]): string[] {
    if (degree === 0) return ['1'];
    const dimension = vars.length;
    const parts = partitions(degree);
    const polys = [];
    for (let p of parts) {
        if (p.length > dimension) continue;
        while (p.length < dimension) {
            p.push(0);
        }
        const perms = distinctPermutations(p);
        const monomials = [];
        for (let p of perms) {
            let factors = [];
            for (let i = 0; i < p.length; i++) {
                if (p[i] == 0) continue;
                if (p[i] == 1) factors.push(`${vars[i]}`);
                else factors.push(`${vars[i]}${SUPERSCRIPTS[p[i]]}`);
            }
            monomials.push(factors.join(''));
        }
        polys.push(monomials.join(' + '));
    }
    return polys;
}

@Component({
    selector: 'symmetry',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class SymmetricComponent extends ThreeDemoComponent {
    constructor() {
        super();
        console.log(symmetricPolynomials(0, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(1, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(2, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(3, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(4, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(5, ['a', 'b', 'c']));
        console.log(symmetricPolynomials(6, ['a', 'b', 'c']));
    }

    frame(dt: number): void {
    }
}