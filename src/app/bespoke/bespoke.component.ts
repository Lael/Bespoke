import {Component} from "@angular/core";
import {MatTabsModule} from "@angular/material/tabs";
import {MatIconModule} from "@angular/material/icon";
import {MatDivider} from "@angular/material/divider";
import {MatCard, MatCardHeader} from "@angular/material/card";

// enum BespokeObject {
//     Point,
//     Line,
//     Circle,
//     // LineSegment,
//     // Ray,
//     // Vector,
//     // Polygon,
//     // Function,
// }

// type Data = {
//     [key: string]: number | number[] | Data | Data[] | null;
// };
//
// interface Point extends Data {
//     x: number,
//     y: number,
// }
//
// interface Line extends Data {
//     a: number,
//     b: number,
//     c: number,
// }
//
// interface Circle extends Data {
//     center: Point,
//     radius: number,
// }
//
// interface Polygon extends Data {
//     vertices: Point[],
// }
//
// class Pipe<T extends Data> {
//     input: Input<T>;
//     output: Output<T>;
//     data: T;
// }
//
// class Input<T extends Data> {
//     name: string;
//     pipe: Pipe<T> | null = null;
//
//     get data(): T | null {
//         return this.pipe?.data || null;
//     }
// }
//
// class Output<T extends Data> {
//     name: string;
//     pipes: Pipe<T>[] = [];
// }
//
// class Node {
//     inputs: Map<string, Input<Data>>;
//     outputs: Map<string, Output<Data>>;
//     map: (input: Data[]) => Data[];
//
//     constructor() {
//     }
// }
//
// const lineThrough = new Node()

@Component({
    templateUrl: "bespoke.component.html",
    styleUrl: "bespoke.component.sass",
    imports: [MatTabsModule, MatIconModule, MatDivider, MatCard, MatCardHeader],
    standalone: true,
})
export class BespokeComponent {
    onResize() {
    }
}