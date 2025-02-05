// import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
// import {CommonModule} from "@angular/common";
// import {convexHull, PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
// import {BufferGeometry, Points, PointsMaterial, Vector2, Vector3} from "three";
// import {LineSegments2} from "three/examples/jsm/lines/LineSegments2";
// import {Line2} from "three/examples/jsm/lines/Line2";
// import {Line as GeoLine} from "../../../math/geometry/line";
// import {Complex} from "../../../math/complex";
// import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry";
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
// import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
//
// @Component({
//     selector: 'billiards-table',
//     templateUrl: '../../widgets/three-demo/three-demo.component.html',
//     styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
//     imports: [CommonModule],
//     standalone: true,
// })
// export class BilliardsTableComponent extends PolygonPickerComponent implements OnChanges {
//
//     n = 3;
//     iterations = 10;
//     everyOther = false;
//     rescale = false;
//     convex = true;
//     drawVertices = true;
//     drawEdges = true;
//
//
//     @Output() iterates = new EventEmitter<Vector2[][]>();
//
//     override ngOnChanges(changes: SimpleChanges) {
//         this.markDirty();
//     }
//
//     images: LineSegments2 = new LineSegments2();
//     finalImage: Line2 = new Line2();
//     affineFinal: Line2 = new Line2();
//
//     // gui: GUI;
//
//     constructor() {
//         super();
//         this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
//         this.useOrthographic = true;
//         this.reset(this.n, 0, 0);
//         // this.gui = new GUI();
//         // this.updateGUI();
//     }
//
//     // updateGUI() {
//     //     this.gui.destroy();
//     //     this.gui = new GUI();
//     //     this.gui.add(this., 'n').min(3).max(24).step(1).onChange(() => {
//     //         this.reset(this.n, 0, 0);
//     //         this.markDirty();
//     //     })
//     //     this.gui.add(this., 'iterations').name('Iterations').min(1).max(1000).step(1).onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'everyOther').name('Hide every other').onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'showAffine').name('Show affine image').onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'rescale').name('Rescale').onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'convex').name('Convex').onFinishChange(() => {
//     //         this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'vertices').name('Vertices').onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     this.gui.add(this., 'edges').name('Edges').onFinishChange(() => {
//     //         this.markDirty();
//     //     });
//     //     // this.gui.add(this., 'inner').name('Inner').onFinishChange(() => {
//     //     //     this.showAffine = this.inner;
//     //     //     this.markDirty();
//     //     // });
//     //     this.gui.open();
//     // }
//
//     // override ngOnDestroy() {
//     //     super.ngOnDestroy();
//     //     this.gui.destroy();
//     // }
//
//     override processKeyboardInput(dt: number) {
//
//     }
//
//     override frame(dt: number) {
//         const recompute = this.dirty;
//         super.frame(dt);
//         if (recompute) {
//             this.iterate();
//             if (this.edges) this.scene.add(this.images);
//             this.scene.add(this.finalImage);
//         }
//     }
//
//     // override reset() {
//     //
//     // }
//
//     iterate() {
//         const ls = [];
//         let vertices = this.draggables.map((v) => new Vector2(v.position.x, v.position.y));
//         let polygon = this.convex ? convexHull(vertices)[0] : vertices;
//         let iVertices = [];
//         let finalPolygon = polygon;
//         let area = convexArea(polygon);
//         let q = quantity(polygon);
//         let n = polygon.length;
//         const iterates: Vector2[][] = [];
//         for (let i = 0; i < this.iterations; i++) {
//             let newPolygon = [];
//
//             let err = false;
//             if (this.inner) {
//                 let lines: GeoLine[] = [];
//                 for (let j = 0; j < n; j++) {
//                     let v1 = polygon[j];
//                     let v2 = polygon[(j + 1) % n];
//                     let v3 = polygon[(j + 2) % n];
//                     lines.push(GeoLine.srcDir(new Complex(v2.x, v2.y), new Complex(v3.x - v1.x, v3.y - v1.y)));
//                 }
//                 try {
//                     for (let j = 0; j < n; j++) {
//                         let l1 = lines[j];
//                         let l2 = lines[(j + 1) % n];
//                         newPolygon.push(l1.intersectLine(l2).toVector2())
//                     }
//                 } catch (e) {
//                     console.log(e);
//                     err = true;
//                     break;
//                 }
//                 if (this.rescale) {
//                     let sa = Math.sqrt(area / convexArea(newPolygon));
//                     for (let j = 0; j < n; j++) {
//                         newPolygon[j] = newPolygon[j].multiplyScalar(sa);
//                     }
//                 }
//                 if (i % 2 == 1 || !this.everyOther) iVertices.push(...newPolygon);
//             } else {
//                 try {
//                     for (let j = 0; j < n; j++) {
//                         // What does this do???
//                         let v0 = polygon[(j - 1 + n) % n];
//                         let v1 = polygon[j];
//                         let v2 = polygon[(j + 1) % n];
//                         let v3 = polygon[(j + 2) % n];
//                         let s1 = v1.clone().sub(v0).normalize();
//                         let s2 = v2.clone().sub(v1).normalize();
//                         let s3 = v3.clone().sub(v2).normalize();
//                         let b1 = s1.clone().add(s2);
//                         let b2 = s2.clone().add(s3).multiplyScalar(-1);
//                         let l1 = GeoLine.srcDir(v1, b1);
//                         let l2 = GeoLine.srcDir(v2, b2);
//                         let center = l1.intersectLine(l2);
//                         newPolygon.push(GeoLine.throughTwoPoints(v1, v2).project(center).toVector2());
//                     }
//                 } catch (e) {
//                     console.log(e);
//                     err = true;
//                     break;
//                 }
//             }
//
//
//             if (err) break;
//
//             if (i % 2 == 1 || !this.everyOther) {
//                 for (let j = 0; j < n; j++) {
//                     let p1 = newPolygon[j];
//                     let p2 = newPolygon[(j + 1) % n];
//                     ls.push(p1, p2);
//                 }
//                 finalPolygon = newPolygon;
//                 iterates.push(newPolygon);
//             }
//
//             let newQ = quantity(newPolygon);
//             // console.log(newQ, newQ / q);
//             q = newQ;
//
//             polygon = newPolygon;
//         }
//
//         this.iterates.emit(iterates);
//
//         if (this.edges) {
//             this.images = new LineSegments2(
//                 new LineSegmentsGeometry().setPositions(ls.flatMap(v => [v.x, v.y, 0])),
//                 new LineMaterial({color: 0xaa44aa, linewidth: IMAGE_EDGE_WIDTH, resolution: this.resolution}));
//         }
//         this.finalImage = new Line2(
//             new LineGeometry().setPositions(finalPolygon.concat([finalPolygon[0]]).flatMap((v) => [v.x, v.y, 0])),
//             new LineMaterial({color: 0x008800, linewidth: FINAL_EDGE_WIDTH, resolution: this.resolution})
//         );
//
//         if (this.vertices) {
//             this.scene.add(new Points(new BufferGeometry().setFromPoints(iVertices), new PointsMaterial({
//                 color: 0xaa44aa,
//                 size: 4
//             })))
//         }
//
//         if (this.inner) {
//             const at = affineTransformation(finalPolygon);
//             let affinePoints = finalPolygon.map((v) => {
//                 let tv = new Vector3(v.x, v.y, 1).applyMatrix3(at);
//                 return new Vector2(tv.x / tv.z, tv.y / tv.z);
//             });
//
//             // if (affinePoints.length === 6) {
//             //     const newAffinePoints = [
//             //         affinePoints[0],
//             //         affinePoints[2],
//             //         affinePoints[4],
//             //         affinePoints[0],
//             //         affinePoints[1],
//             //         affinePoints[3],
//             //         affinePoints[5],
//             //         affinePoints[1],
//             //         affinePoints[2],
//             //         affinePoints[3],
//             //         affinePoints[4],
//             //         affinePoints[5],
//             //     ];
//             //     affinePoints = newAffinePoints;
//             // }
//
//             const aps = affinePoints.concat(affinePoints[0]).flatMap((ap) => [ap.x, ap.y, 0]);
//
//             this.affineFinal = new Line2(
//                 new LineGeometry().setPositions(aps),
//                 new LineMaterial({
//                     color: 0x884400, linewidth: FINAL_EDGE_WIDTH,
//                     resolution: this.resolution,
//                 })
//             );
//             this.affineFinal.translateX(2);
//         }
//     }
// }
//
// function normalizePolygon(vertices: Vector2[]): Vector2[] {
//     const mt = mapThree(vertices);
//     return vertices.map(v => {
//         const tv = new Vector3(v.x, v.y, 1).applyMatrix3(mt);
//         return new Vector2(tv.x, tv.y);
//     });
// }
//
// function quantity(vertices: Vector2[]) {
//     const n = vertices.length;
//     if (n === 5) {
//         let nv = normalizePolygon(vertices);
//         let x1 = nv[4].x;
//         let y1 = nv[4].y;