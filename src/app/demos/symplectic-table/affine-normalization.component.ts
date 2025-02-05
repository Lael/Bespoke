import {Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {
    BufferGeometry,
    CircleGeometry,
    Color,
    Line, LineBasicMaterial,
    LineSegments,
    Matrix3,
    Mesh,
    MeshBasicMaterial,
    Vector2,
    Vector3
} from "three";
import {CommonModule} from "@angular/common";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial.js";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry.js";
import {Line2} from "three/examples/jsm/lines/Line2.js";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {LineSegment} from "../../../math/geometry/line-segment";
import {LineSegments2} from "three/examples/jsm/lines/LineSegments2.js";
import _default from "chart.js/dist/core/core.interaction";
import point = _default.modes.point;
import {Complex} from "../../../math/complex";


const IMAGE_EDGE_WIDTH = 1;
const FINAL_EDGE_WIDTH = 2;
const ITERATE_COLOR = 0x880088;
const FINAL_COLOR = 0x008800;

@Component({
    selector: 'affine-normalization',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class AffineNormalizationComponent extends ThreeDemoComponent implements OnChanges {

    @Input() iterates?: Vector2[][];
    @Input() normalize: boolean = false;
    @Input() projective: boolean = false;
    orbitControls: OrbitControls;

    images: Line2[] = [];
    finalImageA: Line2 | undefined = undefined;
    finalImageB: Line2 | undefined = undefined;
    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.renderer.setClearColor(new Color(0xfafafa));
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.zoomToCursor = true;
    }

    override frame() {
        if (this.dirty) {
            this.dirty = false;
            this.scene.clear();
            this.images = [];
            if (this.iterates === undefined || this.iterates.length == 0) return;
            const trace = [];
            let n = this.iterates[0].length;
            console.clear();
            let ppa = -1;
            let minPpa = 12 * Math.sqrt(3);
            for (let i = 0; i < this.iterates.length - 1; i++) {
                // for (let i = 0; i < 1; i++) {
                const points = normalizePolygon(this.iterates[i], this.normalize, this.projective);
                let p = perimeter([points[1], points[3], points[5 % n]]);
                let a = area([points[1], points[3], points[5 % n]]);
                let newPpa = p * p / a;
                if (ppa > 0) {
                    let d = newPpa - minPpa;
                    if (d > 1e-12) console.log(d, d / (ppa - minPpa));
                }
                ppa = newPpa;
                const loop = points.concat(points[0]);
                trace.push(points[0]);
                const line2 = new Line2(
                    new LineGeometry().setPositions(loop.flatMap((v) => [v.x, v.y, 0])),
                    new LineMaterial({
                        color: ITERATE_COLOR,
                        resolution: this.resolution,
                        linewidth: IMAGE_EDGE_WIDTH
                    })
                );
                this.images.push(line2);

            }
            if (this.iterates.length > 1) {
                let points = normalizePolygon(this.iterates[this.iterates.length - 2], this.normalize, this.projective);
                let loop = points.concat(points[0]);
                this.finalImageA = new Line2(
                    new LineGeometry().setPositions(loop.flatMap((v) => [v.x, v.y, 0])),
                    new LineMaterial({
                        color: FINAL_COLOR,
                        resolution: this.resolution,
                        linewidth: FINAL_EDGE_WIDTH
                    })
                );
                points = normalizePolygon(this.iterates[this.iterates.length - 1], this.normalize, this.projective, 0);
                loop = points.concat(points[0]);
                this.finalImageB = new Line2(
                    new LineGeometry().setPositions(loop.flatMap((v) => [v.x, v.y, 0])),
                    new LineMaterial({
                        color: FINAL_COLOR,
                        resolution: this.resolution,
                        linewidth: FINAL_EDGE_WIDTH
                    })
                );
                // this.scene.add(...this.images);
                this.scene.add(this.finalImageA);
                this.scene.add(this.finalImageB);
            }
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.dirty = true;
    }
}

function normalizePolygon(vertices: Vector2[], normalize: boolean, projective: boolean, offset = 0): Vector2[] {
    let mt: Matrix3;
    if (projective) {
        mt = mapFour(vertices, normalize);
    } else {
        let n = vertices.length;
        mt = mapThree([
            vertices[(0 + offset) % n],
            vertices[(2 + offset) % n],
            vertices[(4 + offset) % n],
        ], normalize);
    }
    return vertices.map(v => {
        const tv = new Vector3(v.x, v.y, 1).applyMatrix3(mt);
        return projective ? new Vector2(tv.x / tv.z, tv.y / tv.z)
            : new Vector2(tv.x, tv.y);
    });
}

function mapThree(vertices: Vector2[], normalize: boolean): Matrix3 {
    // if (vertices.length === 6) {
    //     return new Matrix3().identity();
    // }
    let n = vertices.length;
    let v1 = vertices[3 % n].clone().sub(vertices[2]); // should be (1, 0)
    let v2 = vertices[1].clone().sub(vertices[2]); // should be (cos(pi - 2pi / n), sin(pi - 2pi / n))

    let d = vertices[2];

    let theta = normalize ? Math.PI * (1 - 2 / n) : Math.PI / 2;

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

function mapFour(vertices: Vector2[], normalize: boolean) {
    let n = vertices.length;
    const a = fourToBasis(vertices[0], vertices[1], vertices[2], vertices[3]);
    let b: Matrix3;
    if (!normalize) {
        b = fourToBasis(
            new Vector2(1, 1),
            new Vector2(0, 1),
            new Vector2(0, 0),
            new Vector2(1, 0),
        );
    } else {
        b = fourToBasis(
            Complex.polar(1, 1 * 2 * Math.PI / n).toVector2(),
            Complex.polar(1, 2 * 2 * Math.PI / n).toVector2(),
            Complex.polar(1, 3 * 2 * Math.PI / n).toVector2(),
            Complex.polar(1, 4 * 2 * Math.PI / n).toVector2(),
        );
    }
    return b.multiply(a.invert());
}

function fourToBasis(v1: Vector2, v2: Vector2, v3: Vector2, v4: Vector2): Matrix3 {
    const c = new Vector3(
        v4.x,
        v4.y,
        1
    ).applyMatrix3(new Matrix3(
        v1.x, v2.x, v3.x,
        v1.y, v2.y, v3.y,
        1, 1, 1
    ).invert());
    return new Matrix3(
        c.x * v1.x, c.y * v2.x, c.z * v3.x,
        c.x * v1.y, c.y * v2.y, c.z * v3.y,
        c.x, c.y, c.z,
    );

}

function perimeter(vertices: Vector2[]) {
    let n = vertices.length;
    let p = 0;
    for (let i = 0; i < n; i++) {
        p += vertices[i].distanceTo(vertices[(i + 1) % n]);
    }
    return p;
}

function area(vertices: Vector2[]) {
    let n = vertices.length;
    let a = 0;
    for (let i = 0; i < n; i++) {
        a += vertices[i].cross(vertices[(i + 1) % n]);
    }
    return a / 2;
}