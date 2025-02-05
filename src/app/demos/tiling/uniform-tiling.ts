// import {closeEnough} from "../../../math/math-helpers";
// import {Vector2} from "three";
//
// class TilingVertex {
//     constructor(readonly point: Vector2,
//                 readonly parent?: TilingVertex | undefined,
//                 readonly left?: number,
//                 readonly right?: number) {
//     }
// }
//
// class RegularTile {
//     readonly vertices: Vector2[];
//     constructor(n: number, v1: Vector2, v2: Vector2) {
//         let diff = v2.clone().sub(v1);
//         const int = (n - 2) * Math.PI / n;
//         this.vertices = [v1.clone(), v2.clone()];
//         let current = v2.clone();
//         for (let i = 0; i < n-1; i++) {
//             diff.rotateAround(new Vector2(), int);
//             current = current.add(diff);
//             this.vertices.push(current);
//         }
//     }
// }
//
// export class UniformTiling {
//     constructor(readonly ns: number[]) {
//         let cone = 0;
//         for (let n of ns) {
//             cone += (n - 2) / n;
//         }
//         if (!closeEnough(cone, 2)) throw Error('Internal angles do not line up well');
//     }
//
//     generate(depth: number): Vector2[][] {
//         const root = new Vector2(0, 0);
//         const frontier: TilingVertex[] = [];
//         const tiles: RegularTile[] = [];
//
//         let next = new Vector2(1, 0);
//         let frontier =
//         for (let n of this.ns) {
//             const tile.ts = new RegularTile(n, root, next);
//             next = tile.ts.vertices[n - 1];
//         }
//
//         return tiles.map(t => t.vertices);
//     }
// }