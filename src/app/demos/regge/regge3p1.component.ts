import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {Component} from "@angular/core";
import {CommonModule} from "@angular/common";
import {BufferGeometry, LineBasicMaterial, LineSegments, Vector3, Vector4} from "three";
import {closeEnough} from "../../../math/math-helpers";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {GUI} from "dat.gui";

class Space {
    constructor(readonly point: Vector4,
                readonly normal: Vector4) {
    }

    distanceToPoint(p: Vector4): number {
        return p.clone().sub(this.point).dot(this.normal);
    }

    containsPoint(p: Vector4) {
        return closeEnough(this.distanceToPoint(p), 0);
    }
}

class Lorentz {
    gamma: Vector4;

    constructor(readonly v: Vector3) {
        const v2 = v.lengthSq();
        if (v2 >= 1) {
            throw Error('Nonsense Lorentz');
        }
        this.gamma = new Vector4(
            Math.pow(1 - v.x * v.x, -0.5),
            Math.pow(1 - v.y * v.y, -0.5),
            Math.pow(1 - v.z * v.z, -0.5),
            Math.pow(1 - v2, -0.5),
        );
    }


    transform(p: Vector4): Vector4 {
        return new Vector4(
            this.gamma.x * (p.x - p.w * this.v.x),
            this.gamma.y * (p.y - p.w * this.v.y),
            this.gamma.z * (p.z - p.w * this.v.z),
            this.gamma.w * (p.w - p.x * this.v.x - p.y * this.v.y - p.z * this.v.z),
        );
    }
}

class LineSegment4 {
    constructor(readonly v1: Vector4,
                readonly v2: Vector4) {
    }

    intersectPlane(space: Space): Vector4[] {
        const c = this.vector.dot(space.normal);
        if (closeEnough(c, 0)) return [];
        // think of line as v1 + t (v2 - v1)
        // think of space as (x - polygon).n = 0
        // (v1 + t (v2 - v1) - polygon).n = 0
        // t = (v1-polygon).n / (v2-v1).n
        const t = space.point.clone().sub(this.v1).dot(space.normal) / c;
        if (t > 0 && t < 1) {
            const point = this.v1.clone().addScaledVector(this.vector, t);
            if (!space.containsPoint(point)) {
                console.log('bizarre');
            }
            return [point];
        }
        return [];
    }

    get length(): number {
        return this.vector.length();
    }

    get vector(): Vector4 {
        return this.v2.clone().sub(this.v1);
    }
}

class Triangle {
    constructor(readonly v1: Vector4,
                readonly v2: Vector4,
                readonly v3: Vector4) {
    }

    slice(lorentz: Lorentz, time: number): Vector4[] {
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

        const space = new Space(new Vector4(0, 0, 0, time), new Vector4(0, 0, 0, 1));
        let p1 = new LineSegment4(lv2, lv3).intersectPlane(space);
        let p2 = new LineSegment4(lv3, lv1).intersectPlane(space);
        let p3 = new LineSegment4(lv1, lv2).intersectPlane(space);

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
        readonly v1: Vector4,
        readonly v2: Vector4,
        readonly v3: Vector4,
        readonly v4: Vector4) {
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

    slice(lorentz: Lorentz, time: number): Vector4[] {
        const vertices = [];
        for (let t of this.triangles) {
            const s = t.slice(lorentz, time);
            vertices.push(...s);
        }
        return vertices;
    }
}

class Simplex {
    tetrahedra: Tetrahedron[] = [];

    constructor(readonly v1: Vector4,
                readonly v2: Vector4,
                readonly v3: Vector4,
                readonly v4: Vector4,
                readonly v5: Vector4) {
        this.tetrahedra.push(new Tetrahedron(v1, v2, v3, v4));
        this.tetrahedra.push(new Tetrahedron(v1, v2, v3, v5));
        this.tetrahedra.push(new Tetrahedron(v1, v2, v4, v5));
        this.tetrahedra.push(new Tetrahedron(v1, v3, v4, v5));
        this.tetrahedra.push(new Tetrahedron(v2, v3, v4, v5));
    }

    slice(lorentz: Lorentz, time: number): Vector4[] {
        const vertices = [];
        for (let t of this.tetrahedra) {
            const s = t.slice(lorentz, time);
            vertices.push(...s);
        }
        return vertices;
    }
}

@Component({
    selector: 'regge3p1',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class Regge3p1Component extends ThreeDemoComponent {
    simplices: Simplex[] = [];
    orbitControls: OrbitControls;

    params = {
        t: 0,
        theta: 0,
        phi: Math.PI / 2,
        speed: 0,
    }

    dirty = true;
    gui = new GUI();

    constructor() {
        super();
        // this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

        const iR = 2;
        const jR = 2;
        const kR = 2;
        const lR = 2;

        for (let i = -iR; i < iR; i++) {
            for (let j = -jR; j < jR; j++) {
                for (let k = -kR; k < kR; k++) {
                    for (let l = -lR; l < lR; l++) {
                        const t = new Vector4(i, j, k, l);
                        let v0000 = new Vector4(0, 0, 0, (l) % 2).add(t);
                        let v0001 = new Vector4(0, 0, 0, (1 + l) % 2).add(t);
                        let v0010 = new Vector4(0, 0, 1, (l) % 2).add(t);
                        let v0011 = new Vector4(0, 0, 1, (1 + l) % 2).add(t);
                        let v0100 = new Vector4(0, 1, 0, (l) % 2).add(t);
                        let v0101 = new Vector4(0, 1, 0, (1 + l) % 2).add(t);
                        let v0110 = new Vector4(0, 1, 1, (l) % 2).add(t);
                        let v0111 = new Vector4(0, 1, 1, (1 + l) % 2).add(t);
                        let v1000 = new Vector4(1, 0, 0, (l) % 2).add(t);
                        let v1001 = new Vector4(1, 0, 0, (1 + l) % 2).add(t);
                        let v1010 = new Vector4(1, 0, 1, (l) % 2).add(t);
                        let v1011 = new Vector4(1, 0, 1, (1 + l) % 2).add(t);
                        let v1100 = new Vector4(1, 1, 0, (l) % 2).add(t);
                        let v1101 = new Vector4(1, 1, 0, (1 + l) % 2).add(t);
                        let v1110 = new Vector4(1, 1, 1, (l) % 2).add(t);
                        let v1111 = new Vector4(1, 1, 1, (1 + l) % 2).add(t);
                        this.simplices.push(new Simplex(v0000, v0001, v0011, v0111, v1111)); // 1234
                        this.simplices.push(new Simplex(v0000, v0010, v0011, v0111, v1111)); // 1243
                        this.simplices.push(new Simplex(v0000, v0001, v0101, v0111, v1111)); // 1324
                        this.simplices.push(new Simplex(v0000, v0010, v0110, v0111, v1111)); // 1342
                        this.simplices.push(new Simplex(v0000, v0100, v0101, v0111, v1111)); // 1423
                        this.simplices.push(new Simplex(v0000, v0100, v0110, v0111, v1111)); // 1432
                        this.simplices.push(new Simplex(v0000, v0001, v0011, v1011, v1111)); // 2134
                        this.simplices.push(new Simplex(v0000, v0010, v0011, v1011, v1111)); // 2143
                        this.simplices.push(new Simplex(v0000, v0001, v0101, v1101, v1111)); // 2314
                        this.simplices.push(new Simplex(v0000, v0010, v0110, v1110, v1111)); // 2341
                        this.simplices.push(new Simplex(v0000, v0100, v0101, v1101, v1111)); // 2413
                        this.simplices.push(new Simplex(v0000, v0100, v0110, v1110, v1111)); // 2431
                        this.simplices.push(new Simplex(v0000, v0001, v1001, v1011, v1111)); // 3124
                        this.simplices.push(new Simplex(v0000, v0010, v1010, v1011, v1111)); // 3142
                        this.simplices.push(new Simplex(v0000, v0001, v1001, v1101, v1111)); // 3214
                        this.simplices.push(new Simplex(v0000, v0010, v1010, v1110, v1111)); // 3241
                        this.simplices.push(new Simplex(v0000, v0100, v1100, v1101, v1111)); // 3412
                        this.simplices.push(new Simplex(v0000, v0100, v1100, v1110, v1111)); // 3421
                        this.simplices.push(new Simplex(v0000, v1000, v1001, v1011, v1111)); // 4123
                        this.simplices.push(new Simplex(v0000, v1000, v1010, v1011, v1111)); // 4132
                        this.simplices.push(new Simplex(v0000, v1000, v1001, v1101, v1111)); // 4213
                        this.simplices.push(new Simplex(v0000, v1000, v1010, v1110, v1111)); // 4231
                        this.simplices.push(new Simplex(v0000, v1000, v1100, v1101, v1111)); // 4312
                        this.simplices.push(new Simplex(v0000, v1000, v1100, v1110, v1111)); // 4321
                    }
                }
            }
        }

        this.updateGUI();
    }


    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        const drawFolder = this.gui.addFolder('Draw');
        drawFolder.add(this.params, 't').min(-5).max(5).step(0.01).onChange(() => {
            this.dirty = true
        });
        const lorentzFolder = this.gui.addFolder('Lorentz');
        lorentzFolder.add(this.params, 'theta')
            .min(-3.14).max(3.14).step(0.01)
            .name('Theta').onChange(() => {
            this.dirty = true
        });
        lorentzFolder.add(this.params, 'phi').name('Phi')
            .min(0.01).max(3.14).step(0.01).onChange(() => {
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
            let vertices = [];
            const lorentz = this.lorentz;
            for (let t of this.simplices) {
                vertices.push(...t.slice(lorentz, this.params.t));
            }
            this.scene.add(new LineSegments(new BufferGeometry().setFromPoints(
                vertices.map(v => new Vector3(v.x, v.y, v.z))
            ), new LineBasicMaterial({color: 0xff0000})));
        }
    }

    get lorentz() {
        return new Lorentz(new Vector3(
            this.params.speed * Math.cos(this.params.theta) * Math.sin(this.params.phi),
            this.params.speed * Math.sin(this.params.theta) * Math.sin(this.params.phi),
            Math.cos(this.params.phi),
        ));
    }
}