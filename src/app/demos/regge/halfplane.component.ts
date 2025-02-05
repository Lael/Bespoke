import {Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {CommonModule} from "@angular/common";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {
    BufferGeometry,
    CircleGeometry,
    Line,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Shape,
    ShapeGeometry,
    Vector2
} from "three";
import {Complex} from "../../../math/complex";

function inFD(v: Vector2) {
    return Math.abs(v.x) <= 0.5 && v.lengthSq() >= 1;
}

@Component({
    selector: 'halfplane',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class HalfplaneComponent extends ThreeDemoComponent implements OnChanges {
    orbitControls: OrbitControls;

    @Input()
    tau1: number = 0;

    @Input()
    tau2: number = 2;

    @Input()
    alpha: number = 0;

    @Input()
    beta: number = 2;

    @Input()
    quotient: boolean = false;

    dirty = true;
    arcDirty = true;

    backdrop: Object3D[] = [];
    parallelogram: Object3D[] = [];
    geodesic: Line;
    marker: Mesh;
    cutGeodesic: LineSegments;

    constructor() {
        super();
        this.useOrthographic = true;
        this.camera.zoom = 0.25;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enablePan = true;
        this.orbitControls.enableRotate = false;

        this.backdrop.push(new LineSegments(
            new BufferGeometry().setFromPoints([
                new Vector2(-100, 0), new Vector2(100, 0),
                new Vector2(0.5, 0), new Vector2(0.5, 100),
                new Vector2(1.5, 0), new Vector2(1.5, 100),
                new Vector2(2.5, 0), new Vector2(2.5, 100),
                new Vector2(3.5, 0), new Vector2(3.5, 100),
                new Vector2(-0.5, 0), new Vector2(-0.5, 100),
                new Vector2(-1.5, 0), new Vector2(-1.5, 100),
                new Vector2(-2.5, 0), new Vector2(-2.5, 100),
                new Vector2(-3.5, 0), new Vector2(-3.5, 100),
            ]),
            new LineBasicMaterial()
        ));

        const fd = new Shape();
        fd.moveTo(-0.5, 100);
        fd.lineTo(0.5, 100);
        fd.lineTo(0.5, Math.sqrt(3) / 2);
        fd.absarc(0, 0, 1, Math.PI / 3, 2 * Math.PI / 3);
        fd.lineTo(-0.5, 100);

        this.backdrop.push(
            new Mesh(new ShapeGeometry(fd), new MeshBasicMaterial({color: 0x888888}))
        );

        const arc = new Shape();
        arc.absarc(0, 0, 1, 0, Math.PI);

        let fdbg = new BufferGeometry().setFromPoints(arc.getPoints(90));
        let fdbm = new LineBasicMaterial({color: 0xffffff});
        for (let i = -10; i <= 10; i++) {
            let l = new Line(fdbg, fdbm);
            l.position.set(i, 0, 0);

            let l1 = new Line(fdbg, fdbm);
            l1.scale.set(1 / 3, 1 / 3, 1);
            l1.position.x = i + 1 / 3;
            let l2 = new Line(fdbg, fdbm);
            l2.scale.set(1 / 3, 1 / 3, 1);
            l2.position.x = i - 1 / 3;

            this.backdrop.push(l, l1, l2);
        }
        this.geodesic = new Line(fdbg, new LineBasicMaterial({color: 0x00ff00}));

        this.marker = new Mesh(new CircleGeometry(0.05), new MeshBasicMaterial({color: 0xaa00ff}));

        this.scene.add(...this.backdrop);
        this.scene.add(this.geodesic, this.marker);

        this.cutGeodesic = this.rebuildCutGeodesic();
    }

    ngOnChanges(changes: SimpleChanges) {
        this.dirty = true;
        if (changes.hasOwnProperty('alpha') || changes.hasOwnProperty('beta') || changes.hasOwnProperty('quotient')) {
            this.arcDirty = true;
        }
    }

    rebuildCutGeodesic() {
        const lsv = [];
        const divisions = 720;
        const arc = new Shape();
        arc.absarc(this.beta, 0, this.alpha, 0.05, Math.PI - 0.05);
        const pts = arc.getPoints(divisions);
        for (let i = 0; i < pts.length - 1; i++) {
            let v1 = pts[i].clone();
            let v2 = pts[i + 1].clone();
            let sanity = 10;
            let moved = false;
            do {
                sanity -= 1;
                moved = false;
                let m = v1.clone().add(v2).multiplyScalar(0.5);
                while (m.x > 0.5) {
                    m.x -= 1;
                    v1.x -= 1;
                    v2.x -= 1;
                    moved = true;
                }
                while (m.x < -0.5) {
                    m.x += 1;
                    v1.x += 1;
                    v2.x += 1;
                    moved = true;
                }
                let cm = Complex.fromVector2(m);
                if (cm.modulusSquared() < 1) {
                    const m1 = new Complex(-1, 0)
                    cm = m1.over(cm);
                    let c1 = m1.over(Complex.fromVector2(v1));
                    let c2 = m1.over(Complex.fromVector2(v2));
                    m = cm.toVector2();
                    v1 = c1.toVector2();
                    v2 = c2.toVector2();
                    moved = true;
                }
            } while (moved && sanity > 0);
            if (sanity == 0) continue;
            if (!inFD(v1) || !inFD(v2)) continue;
            lsv.push(v1, v2);
        }
        return new LineSegments(new BufferGeometry().setFromPoints(lsv), new LineBasicMaterial({color: 0xffff00}));
    }

    frame(dt: number): void {
        if (this.arcDirty) {
            this.arcDirty = false;
            this.scene.remove(this.cutGeodesic);
            if (this.quotient) {
                this.cutGeodesic = this.rebuildCutGeodesic();
                this.scene.add(this.cutGeodesic);
            }
        }
        if (this.dirty) {
            this.scene.remove(...this.parallelogram);
            this.parallelogram = [];
            this.rebuildParallelogram();
            this.scene.add(...this.parallelogram);
            this.geodesic.position.set(this.beta, 0, 0.01);
            this.geodesic.scale.set(this.alpha, this.alpha, 1);
            this.marker.position.set(this.tau1, this.tau2, 0.01);
        }
    }

    rebuildParallelogram() {
        const lsv = [];
        for (let i = 1; i < 10; i++) {
            lsv.push(new Vector2(i / 10, 0), new Vector2(i / 10 + this.tau1, this.tau2));
            lsv.push(new Vector2(this.tau1 * i / 10, i / 10 * this.tau2), new Vector2(this.tau1 * i / 10 + 1, i / 10 * this.tau2));
        }
        this.parallelogram.push(new LineSegments(new BufferGeometry().setFromPoints(lsv), new LineBasicMaterial({color: 0xffffff})));
        this.parallelogram.push(new LineSegments(new BufferGeometry().setFromPoints([
            new Vector2(0, 0), new Vector2(this.tau1, this.tau2),
            new Vector2(1, 0), new Vector2(this.tau1 + 1, this.tau2),
        ]), new LineBasicMaterial({color: 0xff0000})));
        this.parallelogram.push(new LineSegments(new BufferGeometry().setFromPoints([
            new Vector2(0, 0), new Vector2(1, 0),
            new Vector2(this.tau1, this.tau2), new Vector2(this.tau1 + 1, this.tau2),
        ]), new LineBasicMaterial({color: 0x0000ff})));
    }
}