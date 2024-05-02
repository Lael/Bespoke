import {Component} from "@angular/core";
import {convexHull, PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import {GUI} from "dat.gui";
import {
    BufferGeometry,
    Line,
    LineBasicMaterial,
    LineSegments,
    Matrix3,
    Points,
    PointsMaterial,
    Vector2,
    Vector3,
    Vector4
} from "three";
import {Line as GeoLine} from "../../../math/geometry/line";
import {Complex} from "../../../math/complex";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'triangle-map',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PolygonMapComponent extends PolygonPickerComponent {
    params = {
        n: 3,
        iterations: 10,
        everyOther: false,
        showAffine: false,
        rescale: false,
        convex: true,
        inner: true,
        vertices: true,
        edges: true,
    }

    images: LineSegments = new LineSegments();
    finalImage: Line = new Line();
    affineFinal: Line = new Line();

    gui: GUI;

    constructor() {
        super();
        this.restriction = this.params.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
        this.useOrthographic = true;
        this.reset(this.params.n, 0, 0);
        this.gui = new GUI();
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        this.gui.add(this.params, 'n').min(3).max(24).step(1).onChange(() => {
            this.reset(this.params.n, 0, 0);
            this.markDirty();
        })
        this.gui.add(this.params, 'iterations').name('Iterations').min(1).max(1000).step(1).onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'everyOther').name('Hide every other').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'showAffine').name('Show affine image').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'rescale').name('Rescale').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'convex').name('Convex').onFinishChange(() => {
            this.restriction = this.params.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
            this.markDirty();
        });
        this.gui.add(this.params, 'vertices').name('Vertices').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'edges').name('Edges').onFinishChange(() => {
            this.markDirty();
        });
        // this.gui.add(this.params, 'inner').name('Inner').onFinishChange(() => {
        //     this.params.showAffine = this.params.inner;
        //     this.markDirty();
        // });
        this.gui.open();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override processKeyboardInput(dt: number) {

    }

    override frame(dt: number) {
        const recompute = this.dirty;
        super.frame(dt);
        if (recompute) {
            this.iterate();
            if (this.params.edges) this.scene.add(this.images);
            this.scene.add(this.finalImage);
            if (this.params.showAffine) this.scene.add(this.affineFinal);
        }
    }

    // override reset() {
    //
    // }

    iterate() {
        console.clear();
        const ls = [];
        let vertices = this.draggables.map((v) => new Vector2(v.position.x, v.position.y));
        let polygon = this.params.convex ? convexHull(vertices)[0] : vertices;
        let iVertices = [];
        let finalPolygon = polygon;
        let area = convexArea(polygon);
        let q = quantity(polygon);
        let n = polygon.length;
        for (let i = 0; i < this.params.iterations; i++) {
            let newPolygon = [];

            let err = false;
            if (this.params.inner) {
                let lines: GeoLine[] = [];
                for (let j = 0; j < n; j++) {
                    let v1 = polygon[j];
                    let v2 = polygon[(j + 1) % n];
                    let v3 = polygon[(j + 2) % n];
                    lines.push(GeoLine.srcDir(new Complex(v2.x, v2.y), new Complex(v3.x - v1.x, v3.y - v1.y)));
                }
                try {
                    for (let j = 0; j < n; j++) {
                        let l1 = lines[j];
                        let l2 = lines[(j + 1) % n];
                        newPolygon.push(l1.intersectLine(l2).toVector2())
                    }
                } catch (e) {
                    console.log(e);
                    err = true;
                    break;
                }
                if (this.params.rescale) {
                    let sa = Math.sqrt(area / convexArea(newPolygon));
                    for (let j = 0; j < n; j++) {
                        newPolygon[j] = newPolygon[j].multiplyScalar(sa);
                    }
                }
                if (i % 2 == 1 || !this.params.everyOther) iVertices.push(...newPolygon);
            } else {
                try {
                    for (let j = 0; j < n; j++) {
                        // What does this do???
                        let v0 = polygon[(j - 1 + n) % n];
                        let v1 = polygon[j];
                        let v2 = polygon[(j + 1) % n];
                        let v3 = polygon[(j + 2) % n];
                        let s1 = v1.clone().sub(v0).normalize();
                        let s2 = v2.clone().sub(v1).normalize();
                        let s3 = v3.clone().sub(v2).normalize();
                        let b1 = s1.clone().add(s2);
                        let b2 = s2.clone().add(s3).multiplyScalar(-1);
                        let l1 = GeoLine.srcDir(v1, b1);
                        let l2 = GeoLine.srcDir(v2, b2);
                        let center = l1.intersectLine(l2);
                        newPolygon.push(GeoLine.throughTwoPoints(v1, v2).project(center).toVector2());
                    }
                } catch (e) {
                    console.log(e);
                    err = true;
                    break;
                }
            }


            if (err) break;

            if (i % 2 == 1 || !this.params.everyOther) {
                for (let j = 0; j < n; j++) {
                    let p1 = newPolygon[j];
                    let p2 = newPolygon[(j + 1) % n];
                    ls.push(p1, p2);
                }
                finalPolygon = newPolygon;
            }

            let newQ = quantity(newPolygon);
            // console.log(newQ, newQ / q);
            q = newQ;

            polygon = newPolygon;
        }

        if (this.params.edges) {
            this.images = new LineSegments(new BufferGeometry().setFromPoints(ls), new LineBasicMaterial({color: 0xaa44aa}));
        }
        this.finalImage = new Line(
            new BufferGeometry().setFromPoints(finalPolygon.concat([finalPolygon[0]])),
            new LineBasicMaterial({color: 0x008800})
        );

        if (this.params.vertices) {
            this.scene.add(new Points(new BufferGeometry().setFromPoints(iVertices), new PointsMaterial({
                color: 0xaa44aa,
                size: 2
            })))
        }

        if (this.params.inner) {
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

            this.affineFinal = new Line(
                new BufferGeometry().setFromPoints(affinePoints.concat(affinePoints[0])),
                new LineBasicMaterial({color: 0xaa8800})
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
        let nv = normalizePolygon(vertices);
        let x1 = nv[4].x;
        let y1 = nv[4].y;
        let x2 = nv[0].x;
        let y2 = nv[0].y;
        const phi = (Math.sqrt(5) + 1) / 2;
        const q = new Vector4(x1 - phi, y1 - 1, x2 - 1, y2 - phi).length();
        console.log(q);
        return q;
        // let s = 0;
        // for (let i = 0; i < n; i++) {
        //     const v1 = vertices[i];
        //     const v2 = vertices[(i + 1) % n];
        //     const v3 = vertices[(i + 2) % n];
        //     const v4 = vertices[(i + 3) % n];
        //     s += Math.pow(v3.clone().sub(v2).cross(v1.clone().sub(v4)), 2);
        // }
        // return s / Math.pow(convexArea(vertices), 2);
    } else if (vertices.length === 6) {
        let a1 = convexArea([vertices[0], vertices[2], vertices[4]]);
        let a2 = convexArea([vertices[1], vertices[3], vertices[5]]);
        return Math.pow(a1 - a2, 2);
    }
    return 1;
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