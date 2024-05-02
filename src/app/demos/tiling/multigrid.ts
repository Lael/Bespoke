import {Vector2} from "three";

export class Multigrid {
    readonly n: number;
    readonly radials: Vector2[] = [];

    constructor(readonly offsets: number[],
                readonly scale: number = 1,
                readonly angleOffset: number = 0) {
        this.n = offsets.length;
        if (this.n < 5) {
            throw Error('multigrid with less than 5 grates');
        }
        if (this.scale <= 0) {
            throw Error('multigrid with less than 5 grates');
        }

        for (let i = 0; i < this.n; i++) {
            this.radials.push(polar(scale, i * Math.PI * 2 / this.n + angleOffset));
        }
    }

    // keyPoints(radius: number): Vector2[][] {
    //     const keyPts: Vector2[][] = [];
    //     for (let i = 0; i < this.n; i++) {
    //         const pts: Vector2[] = [];
    //
    //         for (let i = 0; i < radius / this.scale + 1; i++) {
    //
    //         }
    //
    //         keyPts.push(pts);
    //     }
    // }
    //
    // lines(radius: number) {
    // }
    //
    // intersections(radius: number): Vector2[] {
    //
    // }
}

function polar(r: number, theta: number): Vector2 {
    return new Vector2(r * Math.cos(theta), r * Math.sin(theta));
}