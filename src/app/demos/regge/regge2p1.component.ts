import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {
    BufferGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Vector2,
    Vector3
} from "three";
import {closeEnough} from "../../../math/math-helpers";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GUI} from "dat.gui";

class Plane {
    constructor(readonly point: Vector3,
                readonly normal: Vector3) {
    }

    distanceToPoint(p: Vector3): number {
        return p.clone().sub(this.point).dot(this.normal);
    }

    containsPoint(p: Vector3) {
        return closeEnough(this.distanceToPoint(p), 0);
    }
}

class Lorentz {
    gamma: Vector3;

    constructor(readonly v: Vector2) {
        const v2 = v.lengthSq();
        if (v2 >= 1) {
            throw Error('Nonsense Lorentz');
        }
        this.gamma = new Vector3(
            Math.pow(1 - v.x * v.x, -0.5),
            Math.pow(1 - v.y * v.y, -0.5),
            Math.pow(1 - v2, -0.5),
        );
    }


    transform(p: Vector3): Vector3 {
        // x, y, t
        return new Vector3(
            this.gamma.x * (p.x - p.z * this.v.x),
            this.gamma.y * (p.y - p.z * this.v.y),
            this.gamma.z * (p.z - p.x * this.v.x - p.y * this.v.y),
        );
    }
}

class LineSegment3 {
    constructor(readonly v1: Vector3,
                readonly v2: Vector3) {
    }

    intersectPlane(plane: Plane): Vector3[] {
        const c = this.vector.dot(plane.normal);
        if (closeEnough(c, 0)) return [];
        // think of line as v1 + t (v2 - v1)
        // think of plane as (x - p).n = 0
        // (v1 + t (v2 - v1) - p).n = 0
        // t = (v1-p).n / (v2-v1).n
        const t = plane.point.clone().sub(this.v1).dot(plane.normal) / c;
        if (t > 0 && t < 1) {
            const point = this.v1.clone().addScaledVector(this.vector, t);
            if (!plane.containsPoint(point)) {
                console.log('bizarre');
            }
            return [point];
        }
        return [];
    }

    get length(): number {
        return this.v1.distanceTo(this.v2);
    }

    get vector(): Vector3 {
        return this.v2.clone().sub(this.v1);
    }
}

class Triangle {
    constructor(readonly v1: Vector3,
                readonly v2: Vector3,
                readonly v3: Vector3) {
    }

    slice(lorentz: Lorentz, time: number): Vector3[] {
        let lv1 = lorentz.transform(this.v1);
        let lv2 = lorentz.transform(this.v2);
        let lv3 = lorentz.transform(this.v3);
        let c1 = closeEnough(lv1.z, time);
        let c2 = closeEnough(lv2.z, time);
        let c3 = closeEnough(lv3.z, time);

        if (c1 && c2 && c3) return [lv1, lv2, lv2, lv3, lv3, lv1];
        if (c1 && c2) return [lv1, lv2];
        if (c2 && c3) return [lv2, lv3];
        if (c3 && c1) return [lv3, lv1];

        const plane = new Plane(new Vector3(0, 0, time), new Vector3(0, 0, 1));
        let p1 = new LineSegment3(lv2, lv3).intersectPlane(plane);
        let p2 = new LineSegment3(lv3, lv1).intersectPlane(plane);
        let p3 = new LineSegment3(lv1, lv2).intersectPlane(plane);

        let p1l = p1.length === 1;
        let p2l = p2.length === 1;
        let p3l = p3.length === 1;

        if (c1 && p1l) return [lv1, p1[0]];
        if (c2 && p2l) return [lv2, p2[0]];
        if (c3 && p3l) return [lv3, p3[0]];

        if (p1l && p2l) return [p1[0], p2[0]];
        if (p2l && p3l) return [p2[0], p3[0]];
        if (p3l && p1l) return [p3[0], p1[0]];

        return [];
    }
}

class Tetrahedron {
    triangles: Triangle[] = [];

    constructor(
        readonly v1: Vector3,
        readonly v2: Vector3,
        readonly v3: Vector3,
        readonly v4: Vector3) {
        this.triangles.push(new Triangle(v1, v2, v3));
        this.triangles.push(new Triangle(v1, v2, v4));
        this.triangles.push(new Triangle(v1, v3, v4));
        this.triangles.push(new Triangle(v2, v3, v4));
    }

    wireframe(lorentz: Lorentz) {
        const lv1 = lorentz.transform(this.v1);
        const lv2 = lorentz.transform(this.v2);
        const lv3 = lorentz.transform(this.v3);
        const lv4 = lorentz.transform(this.v4);
        return [
            lv1, lv2,
            lv1, lv3,
            lv1, lv4,
            lv2, lv3,
            lv2, lv4,
            lv3, lv4,
        ];
    }

    slice(lorentz: Lorentz, time: number): Vector3[] {
        const vertices = [];
        for (let t of this.triangles) {
            const s = t.slice(lorentz, time);
            vertices.push(...s);
        }
        return vertices;
    }
}

@Component({
    selector: 'regge2p1',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class Regge2p1Component extends ThreeDemoComponent {
    tetrahedra: Tetrahedron[] = [];
    plane: Mesh;
    orbitControls: OrbitControls;

    params = {
        slice: false,
        t: 0,
        theta: 0,
        speed: 0,
    }

    dirty = true;
    gui = new GUI();

    constructor() {
        super();
        // this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

        for (let i = -5; i < 5; i++) {
            for (let j = -5; j < 5; j++) {
                for (let k = -5; k < 5; k++) {
                    const t = new Vector3(i, j, k);
                    let v0 = new Vector3(0, 0, 0).add(t);
                    let v1 = new Vector3(0, 0, 1).add(t);
                    let v2 = new Vector3(0, 1, 0).add(t);
                    let v3 = new Vector3(0, 1, 1).add(t);
                    let v4 = new Vector3(1, 0, 0).add(t);
                    let v5 = new Vector3(1, 0, 1).add(t);
                    let v6 = new Vector3(1, 1, 0).add(t);
                    let v7 = new Vector3(1, 1, 1).add(t);
                    if (k % 2 == 0) {
                        this.tetrahedra.push(new Tetrahedron(v0, v1, v3, v5));
                        this.tetrahedra.push(new Tetrahedron(v0, v2, v3, v6));
                        this.tetrahedra.push(new Tetrahedron(v3, v5, v6, v7));
                        this.tetrahedra.push(new Tetrahedron(v0, v4, v5, v6));
                        this.tetrahedra.push(new Tetrahedron(v0, v3, v5, v6));
                    } else {
                        this.tetrahedra.push(new Tetrahedron(v0, v1, v2, v4));
                        this.tetrahedra.push(new Tetrahedron(v1, v2, v3, v7));
                        this.tetrahedra.push(new Tetrahedron(v1, v2, v4, v7));
                        this.tetrahedra.push(new Tetrahedron(v1, v4, v5, v7));
                        this.tetrahedra.push(new Tetrahedron(v2, v4, v6, v7));
                    }
                }
            }
        }

        this.plane = new Mesh(new PlaneGeometry(12, 12), new MeshBasicMaterial({
            transparent: true,
            opacity: 0.25,
            color: 0xff0000,
        }))

        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        const drawFolder = this.gui.addFolder('Draw');
        drawFolder.add(this.params, 't').min(-5).max(5).step(0.01).onChange(() => {
            this.dirty = true
        });
        drawFolder.add(this.params, 'slice').name('Slice').onChange(() => {
            this.dirty = true
        });
        const lorentzFolder = this.gui.addFolder('Lorentz');
        lorentzFolder.add(this.params, 'theta')
            .min(-3.14).max(3.14).step(0.01)
            .name('Direction').onChange(() => {
            this.dirty = true
        });
        lorentzFolder.add(this.params, 'speed').name('Speed')
            .min(0).max(0.99).step(0.01).onChange(() => {
            this.dirty = true
        });
        drawFolder.open();
        lorentzFolder.open();
        this.gui.open();
    }

    frame(dt: number): void {
        if (this.dirty) {
            this.dirty = false;
            this.scene.clear();
            if (this.params.slice) {
                let vertices = [];
                for (let t of this.tetrahedra) {
                    vertices.push(...t.slice(this.lorentz, this.params.t));
                }
                this.scene.add(new LineSegments(new BufferGeometry().setFromPoints(vertices), new LineBasicMaterial({color: 0xff0000})));
            } else {
                let vertices = [];
                for (let t of this.tetrahedra) {
                    vertices.push(...t.wireframe(this.lorentz));
                }
                this.plane.position.set(0, 0, this.params.t);
                this.scene.add(this.plane)
                this.scene.add(new LineSegments(new BufferGeometry().setFromPoints(vertices), new LineBasicMaterial({color: 0xffffff})));
            }
        }
    }

    get lorentz() {
        return new Lorentz(new Vector2(this.params.speed * Math.cos(this.params.theta), this.params.speed * Math.sin(this.params.theta)));
    }
}