import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {convexHull, PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import {BufferGeometry, Matrix3, Points, PointsMaterial, Vector2, Vector3} from "three";
import {Line as GeoLine} from "../../../math/geometry/line";
import {Complex} from "../../../math/complex/complex";
import {CommonModule} from "@angular/common";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import {LineSegmentsGeometry} from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {closeEnough} from "../../../math/math-helpers";

const IMAGE_EDGE_WIDTH = 1;
const FINAL_EDGE_WIDTH = 2;

@Component({
    selector: 'symplectic-table',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    standalone: true,
    imports: [CommonModule]
})
export class SymplecticTableComponent extends PolygonPickerComponent implements OnChanges {

    @Input() n = 5;
    @Input() iterations = 10;
    @Input() everyOther = true;
    @Input() rescale = true;
    @Input() convex = true;
    @Input() inner = true;
    @Input() drawVertices = true;
    @Input() edges = true;

    @Output() iterates = new EventEmitter<Vector2[][]>();

    override ngOnChanges(changes: SimpleChanges) {
        this.markDirty();
    }

    images: LineSegments2 = new LineSegments2();
    finalImage: Line2 = new Line2();
    affineFinal: Line2 = new Line2();

    // gui: GUI;

    constructor() {
        super();
        this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
        this.useOrthographic = true;
        this.reset(this.n, 0, 0);
        // this.gui = new GUI();
        // this.updateGUI();
    }

    // updateGUI() {
    //     this.gui.destroy();
    //     this.gui = new GUI();
    //     this.gui.add(this., 'n').min(3).max(24).step(1).onChange(() => {
    //         this.reset(this.n, 0, 0);
    //         this.markDirty();
    //     })
    //     this.gui.add(this., 'iterations').name('Iterations').min(1).max(1000).step(1).onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'everyOther').name('Hide every other').onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'showAffine').name('Show affine image').onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'rescale').name('Rescale').onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'convex').name('Convex').onFinishChange(() => {
    //         this.restriction = this.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'vertices').name('Vertices').onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     this.gui.add(this., 'edges').name('Edges').onFinishChange(() => {
    //         this.markDirty();
    //     });
    //     // this.gui.add(this., 'inner').name('Inner').onFinishChange(() => {
    //     //     this.showAffine = this.inner;
    //     //     this.markDirty();
    //     // });
    //     this.gui.open();
    // }

    // override ngOnDestroy() {
    //     super.ngOnDestroy();
    //     this.gui.destroy();
    // }

    override processKeyboardInput(dt: number) {
        if (this.keyHeld('KeyW')) {
            this.draggables[1].position.y += dt;
            this.dirty = true;
        }
        if (this.keyHeld('KeyS')) {
            this.draggables[1].position.y -= dt;
            this.dirty = true;
        }
        if (this.keyHeld('KeyD')) {
            this.draggables[0].position.x += dt;
            this.dirty = true;
        }
        if (this.keyHeld('KeyA')) {
            this.draggables[0].position.x -= dt;
            this.dirty = true;
        }
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt)
        const recompute = this.dirty;
        super.frame(dt);
        if (recompute) {
            this.iterate();
            if (this.edges) this.scene.add(this.images);
            this.scene.add(this.finalImage);
        }
    }


    iterate() {
        // console.clear();
        const ls = [];
        let vertices = this.draggables.map((v) => new Vector2(v.position.x, v.position.y));
        let polygon = this.convex ? convexHull(vertices)[0] : vertices;
        let iVertices = [];
        let finalPolygon = polygon;
        let area = convexArea(polygon);
        let q = quantity(polygon);
        let n = polygon.length;
        // for (let v of polygon) {
        //     console.log(v.x, v.y);
        // }

        const iterates: Vector2[][] = [];
        for (let i = 0; i < this.iterations; i++) {
            let newPolygon = [];

            let err = false;
            if (this.inner) {
                let lines: GeoLine[] = [];
                for (let j = 0; j < n; j++) {
                    let v1 = polygon[j];
                    let v2 = polygon[(j + 1) % n];
                    let v3 = polygon[(j + 2) % n];
                    lines.push(GeoLine.srcDir(new Complex(v2.x, v2.y), new Complex(v3.x - v1.x, v3.y - v1.y)));
                }
                try {
                    let offset = i % 2 == 0 ? 2 : 1
                    for (let j = 0 - offset; j < n - offset; j++) {
                        // for (let j = 0; j < n; j++) {
                        let l1 = lines[(j + n) % n];
                        let l2 = lines[(j + n + 1) % n];
                        newPolygon.push(l1.intersectLine(l2).toVector2())
                    }
                } catch (e) {
                    console.log(e);
                    err = true;
                    break;
                }
                if (this.rescale) {
                    let sa = Math.sqrt(area / convexArea(newPolygon));
                    for (let j = 0; j < n; j++) {
                        newPolygon[j] = newPolygon[j].multiplyScalar(sa);
                    }
                }
                if (i % 2 == 1 || !this.everyOther) iVertices.push(...newPolygon);
            } else {
                try {
                    // Assume n = 5;
                    let lines: GeoLine[] = [];
                    for (let i = 0; i < n; i++) {
                        let v1 = polygon[i].clone();
                        let v2 = polygon[(i + 1) % n].clone();
                        lines.push(GeoLine.throughTwoPoints(v1, v2));
                    }

                    let m = new Matrix3().identity();
                    let maps: Matrix3[] = [];
                    if (n % 2 == 1) {
                        for (let i = 0; i < n; i++) {
                            let j = (2 * i) % n;
                            let map = affinity(lines[j], lines[(j + 2) % n], lines[(j + 1) % n]);
                            maps.push(map);
                            m = m.premultiply(map);
                        }
                        // want fixed point of m along lines[0]. Will fall between polygon[0] and m(polygon[0])
                        let v0 = polygon[0].clone();
                        let v1 = polygon[1].clone();
                        let vp = v0.clone().applyMatrix3(m);
                        let dv = vp.clone().sub(v0);
                        let s = v1.clone().sub(v0);
                        let l = dv.dot(s) / s.dot(s);
                        // console.log(m);
                        if (closeEnough(l, -1)) {
                            console.log("no fixed point- shouldn't happen");
                        }
                        let f = l / (1 + l);
                        let v = v0.clone().addScaledVector(dv, f);
                        // console.log(f, v);
                        newPolygon = [v.clone(), new Vector2(), new Vector2(), new Vector2(), new Vector2()];
                        for (let i = 0; i < n; i++) {
                            let j = (2 * i) % n;
                            v = v.applyMatrix3(maps[i]);
                            // console.log(`j=${j}`, v.x, v.x);
                            newPolygon[j] = v.clone();
                        }
                        // let m3 = mapThree(newPolygon);
                        // newPolygon.map(v => v.applyMatrix3(m3));
                        // if (this.rescale) {
                        //     let lx = Number.POSITIVE_INFINITY;
                        //     let hx = Number.NEGATIVE_INFINITY;
                        //     let ly = Number.POSITIVE_INFINITY;
                        //     let hy = Number.NEGATIVE_INFINITY;
                        //     for (let v of newPolygon) {
                        //         if (v.x < lx) lx = v.x;
                        //         if (v.x > hx) hx = v.x;
                        //         if (v.y < ly) ly = v.y;
                        //         if (v.y > hy) hy = v.y;
                        //     }
                        //     let mx = hx - lx;
                        //     let my = hy - ly;
                        //     let s = mx * my;
                        //     let factor = Math.sqrt(area / (s * convexArea(newPolygon)));
                        //     for (let v of newPolygon) {
                        //         v.x *= mx / s;
                        //         v.y *= my / s;
                        //     }
                        // }
                    } else {
                        console.log('even polygon');
                        err = true;
                        break;
                    }
                } catch (e) {
                    console.log(e);
                    err = true;
                    break;
                }
            }

            if (err) break;

            if (i % 2 == 1 || !this.everyOther) {
                for (let j = 0; j < n; j++) {
                    let p1 = newPolygon[j];
                    let p2 = newPolygon[(j + 1) % n];
                    ls.push(p1, p2);
                }
                finalPolygon = newPolygon;
                iterates.push(newPolygon);
                let newQ = quantity(newPolygon);
                let diff = [];
                for (let i = 0; i < q.length; i++) {
                    diff.push(newQ[i] / q[i]);
                }
                // console.log(newQ, diff);
                q = newQ;
            }

            polygon = newPolygon;
        }

        this.iterates.emit(iterates);

        if (this.edges) {
            this.images = new LineSegments2(
                new LineSegmentsGeometry().setPositions(ls.flatMap(v => [v.x, v.y, 0])),
                new LineMaterial({color: 0xaa44aa, linewidth: IMAGE_EDGE_WIDTH, resolution: this.resolution}));
        }
        this.finalImage = new Line2(
            new LineGeometry().setPositions(finalPolygon.concat([finalPolygon[0]]).flatMap((v) => [v.x, v.y, 0])),
            new LineMaterial({
                color: 0x008800,
                linewidth: FINAL_EDGE_WIDTH,
                resolution: this.resolution
            })
        );

        if (this.drawVertices) {
            this.scene.add(new Points(new BufferGeometry().setFromPoints(iVertices), new PointsMaterial({
                color: 0xaa44aa,
                size: 4
            })))
        }

        if (this.inner) {
            const at = affineTransformation(finalPolygon);
            let affinePoints = finalPolygon.map((v) => {
                let tv = new Vector3(v.x, v.y, 1).applyMatrix3(at);
                return new Vector2(tv.x / tv.z, tv.y / tv.z);
            });

            // if (affinePoints.length === 6) {
            //     const newAffinePoints = [
            //         affinePoints[0],
            //         affinePoints[2],
            //         affinePoints[4],
            //         affinePoints[0],
            //         affinePoints[1],
            //         affinePoints[3],
            //         affinePoints[5],
            //         affinePoints[1],
            //         affinePoints[2],
            //         affinePoints[3],
            //         affinePoints[4],
            //         affinePoints[5],
            //     ];
            //     affinePoints = newAffinePoints;
            // }

            const aps = affinePoints.concat(affinePoints[0]).flatMap((ap) => [ap.x, ap.y, 0]);

            this.affineFinal = new Line2(
                new LineGeometry().setPositions(aps),
                new LineMaterial({
                    color: 0x884400, linewidth: FINAL_EDGE_WIDTH,
                    resolution: this.resolution,
                })
            );
            this.affineFinal.translateX(2);
        }
    }
}

function normalizePolygon(vertices: Vector2[]): Vector2[] {
    const mt = mapThree(vertices);
    return vertices.map(v => {
        const tv = new Vector3(v.x, v.y, 1).applyMatrix3(mt);
        return new Vector2(tv.x, tv.y);
    });
}

function quantity(vertices: Vector2[]) {
    const n = vertices.length;
    if (n === 5) {
        // let nv = normalizePolygon(vertices);
        // let x1 = nv[4].x;
        // let y1 = nv[4].y;
        // let x2 = nv[0].x;
        // let y2 = nv[0].y;
        // const phi = (Math.sqrt(5) + 1) / 2;
        // const q = new Vector4(x1 - phi, y1 - 1, x2 - 1, y2 - phi).length();
        // // console.log(q);
        // return q;
        let s = 0;
        let a = convexArea(vertices);
        let qs = [];
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % n];
            const v3 = vertices[(i + 2) % n];
            const v4 = vertices[(i + 3) % n];
            let q = v3.clone().sub(v2).cross(v1.clone().sub(v4)) / a;
            s += q * q;
            qs.push(q * q);
        }
        qs.push(s);
        return qs;
    } else if (vertices.length === 6) {
        let a1 = convexArea([vertices[0], vertices[2], vertices[4]]);
        let a2 = convexArea([vertices[1], vertices[3], vertices[5]]);
        return [Math.pow(a1 - a2, 2)];
    }
    return [1];
}

function convexArea(vertices: Vector2[]): number {
    let s = 0;
    let n = vertices.length;
    let v0 = vertices[0];
    for (let i = 1; i < n - 1; i++) {
        let v1 = vertices[i];
        let v2 = vertices[i + 1];
        s += (v1.clone().sub(v0)).cross(v2.clone().sub(v0)) / 2;
    }
    return Math.abs(s);
}

function affineTransformation(vertices: Vector2[]): Matrix3 {
    // if (vertices.length === 6) {
    //     return new Matrix3().identity();
    // }
    let n = vertices.length;
    let v1 = vertices[3 % n].clone().sub(vertices[2]); // should be (1, 0)
    let v2 = vertices[1].clone().sub(vertices[2]); // should be (cos(pi - 2pi / n), sin(pi - 2pi / n))

    let d = vertices[2];

    let theta = Math.PI * (1 - 2 / n);
    // let theta = Math.PI / 2;

    return new Matrix3().set(
        1, 0, -d.x,
        0, 1, -d.y,
        0, 0, 1,
    ).premultiply(
        new Matrix3().set(
            v1.x, v2.x, 0,
            v1.y, v2.y, 0,
            0, 0, 1,
        ).invert()
    ).premultiply(
        new Matrix3().set(
            1, Math.cos(theta), 0,
            0, Math.sin(theta), 0,
            0, 0, 1,
        )
    );
}

function mapThree(vertices: Vector2[]): Matrix3 {
    // if (vertices.length === 6) {
    //     return new Matrix3().identity();
    // }
    let n = vertices.length;
    let v1 = vertices[3 % n].clone().sub(vertices[2]); // should be (1, 0)
    let v2 = vertices[1].clone().sub(vertices[2]); // should be (cos(pi - 2pi / n), sin(pi - 2pi / n))

    let d = vertices[2];

    // let theta = Math.PI * (1 - 2 / n);
    let theta = Math.PI / 2;

    return new Matrix3().set(
        1, 0, -d.x,
        0, 1, -d.y,
        0, 0, 1,
    ).premultiply(
        new Matrix3().set(
            v1.x, v2.x, 0,
            v1.y, v2.y, 0,
            0, 0, 1,
        ).invert()
    ).premultiply(
        new Matrix3().set(
            1, Math.cos(theta), 0,
            0, Math.sin(theta), 0,
            0, 0, 1,
        )
    );
}

function projectiveTransformation(vertices: Vector2[]): Matrix3 {
    // want to send vertices[4 % n] to (1,1)
    const am = mapThree(vertices);
    const avert = vertices.map(v => {
        const v3 = v.applyMatrix3(am);
        return new Vector2(v3.x, v3.y);
    })
    const x = avert[0].x;
    const y = avert[0].y;
    const pm = new Matrix3().set(
        1 / x, 0, 0,
        0, 1 / y, 0,
        1 / x - 1 / (-1 + x + y), 1 / y - 1 / (-1 + x + y), 1 / (-1 + x + y)
    );

    console.log(new Vector3(0, 1, 1).applyMatrix3(pm));
    console.log(new Vector3(0, 0, 1).applyMatrix3(pm));
    console.log(new Vector3(1, 0, 1).applyMatrix3(pm));
    console.log(new Vector3(x, y, 1).applyMatrix3(pm));

    return am.multiply(pm);
}

// Find the affine transformation which sends points on l1 to points on l2 by projecting along rays parallel to l3
function affinity(l1: GeoLine, l2: GeoLine, l3: GeoLine): Matrix3 {
    let f = l1.intersectLine(l2).toVector2();
    let s = l3.intersectLine(l1).toVector2();
    let d = l3.intersectLine(l2).toVector2();
    let c = new Matrix3(
        s.x - f.x, d.x - s.x, 0,
        s.y - f.y, d.y - s.y, 0,
        0, 0, 1
    );
    let shear = new Matrix3(
        1, 0, 0,
        1, 1, 0,
        0, 0, 1
    );
    let t = new Matrix3().identity().makeTranslation(f.clone());
    let tc = t.clone().multiply(c);
    let tci = tc.clone().invert();
    let m = tc.clone().multiply(shear).multiply(tci);
    let good = closeEnough(f.clone().applyMatrix3(m).distanceTo(f), 0) && closeEnough(s.clone().applyMatrix3(m).distanceTo(d), 0);
    if (!good) {
        console.log(f, s, d);
        console.log(f.clone().applyMatrix3(m));
        console.log(s.clone().applyMatrix3(tci));
        console.log(d.clone().applyMatrix3(tci));
        throw Error('not good');
    }
    return m;
}