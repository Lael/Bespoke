import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    AxesHelper,
    BufferGeometry,
    Color,
    InstancedMesh,
    Line,
    LineBasicMaterial,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector2,
    Vector3,
    Vector4
} from 'three';
import * as dat from 'dat.gui';
import {closeEnough} from "../../../math/math-helpers";
import {ParametricGeometry} from "three/examples/jsm/geometries/ParametricGeometry.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {CommonModule} from "@angular/common";

// Colors
const CLEAR_COLOR = new Color(0x000000);
// const DOT_COLOR = new Color(0xFFFFFF);
// const MANIFOLD_COLOR = new Color(0xFF0000);

const xColor = new Color(0xff0000);
const yColor = new Color(0x00ff00);
const zColor = new Color(0x0000ff);
const wColor = new Color(0xff00ff);
const white = new Color(0xffffff);


// Other constants
// const CAMERA_SPEED_XY = 1; // world-space units/second at z=1
// const CAMERA_SPEED_Z = 0.5; // world-space units/second at z=1

enum Projection3D {
    X1 = 'x_1',
    X2 = 'x_2',
    Y1 = 'y_1',
    Y2 = 'y_2',
}

enum Projection2D {
    X1X2 = 'x_1, x_2',
    X1Y1 = 'x_1, y_1',
    X1Y2 = 'x_1, y_2',
    X2Y1 = 'x_2, y_1',
    X2Y2 = 'x_2, y_2',
    Y1Y2 = 'y_1, y_2',
}

type SymplecticParams = {
    use3D: boolean;
    projection2D: Projection2D;
    projection3D: Projection3D;
    iterations: number;
    forward: boolean;
    backward: boolean;
    drawManifold: boolean;
    rescaleY: number;
    record: boolean
};


@Component({
    selector: 'symplectic',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class SymplecticComponent extends ThreeDemoComponent {
    gui: dat.GUI = new dat.GUI();

    cameraDist = 5;
    cameraTheta = Math.PI / 4;
    cameraPhi = Math.PI / 4;

    params: SymplecticParams = {
        use3D: true,
        projection2D: Projection2D.X1X2,
        projection3D: Projection3D.Y2,
        iterations: 100,
        forward: true,
        backward: true,
        drawManifold: true,
        rescaleY: 1,
        record: false,
    };

    start = new Vector4(0, 0, 1, 0);
    orbit: Vector4[] = [];

    drawDirty = true;

    line = new Vector3();
    para1 = new Vector3();
    para2 = new Vector3();

    perspectiveControls: OrbitControls;
    orthographicControls: OrbitControls;

    constructor() {
        super();
        this.updateCamera();
        this.perspectiveCamera.fov = 60;
        this.perspectiveCamera.updateProjectionMatrix();
        this.perspectiveCamera.position.set(5, 5, 5);

        this.perspectiveControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
        // this.perspectiveControls.enablePan = false;

        this.orthographicControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orthographicControls.enableRotate = false;

        this.renderer.setClearColor(CLEAR_COLOR);

        this.updateGUI();
        this.computeOrbit();
    }

    private updateCamera() {
        if (this.params.use3D) {
            // this.perspectiveCamera.position.set(
            //     this.cameraDist * Math.cos(this.cameraPhi) * Math.cos(this.cameraTheta),
            //     this.cameraDist * Math.cos(this.cameraPhi) * Math.sin(this.cameraTheta),
            //     this.cameraDist * Math.sin(this.cameraPhi),
            // );
            this.perspectiveCamera.lookAt(0, 0, 0);
            this.perspectiveCamera.up.set(0, 0, 1);
            this.useOrthographic = false;
            // this.controls.update();
        } else {
            this.useOrthographic = true;
            this.updateOrthographicCamera();
            // this.controls.mouseButtons = { LEFT: MOUSE.PAN };
        }
    }

    private processKeyboardInput(_: number): void {
        // Camera
        // const cameraDiff = new Vector3();
        // if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        // if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        // if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        // if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        // if (cameraDiff.length() !== 0) cameraDiff.normalize();
        // if (!this.params.use3D) {
        //     this.orthographicCamera.position.x += CAMERA_SPEED_XY * dt * cameraDiff.x * this.orthographicDiagonal;
        //     this.orthographicCamera.position.y += CAMERA_SPEED_XY * dt * cameraDiff.y * this.orthographicDiagonal;
        // }
        //
        // let zoomDiff = 1;
        // if (this.keysPressed.get('Space')) zoomDiff += CAMERA_SPEED_Z * dt;
        // if (this.keysPressed.get('ShiftLeft')) zoomDiff -= CAMERA_SPEED_Z * dt;
        // if (!this.params.use3D) {
        //     this.orthographicDiagonal *= zoomDiff;
        // }
        // this.updateCamera();
    }

    override frame(dt: number) {
        this.cameraDist = this.perspectiveCamera.position.length();
        const proj = new Vector2(this.perspectiveCamera.position.x, this.perspectiveCamera.position.y);
        this.cameraTheta = proj.angle();
        this.cameraPhi = new Vector2(this.perspectiveCamera.position.z, proj.length()).angle();

        this.processKeyboardInput(dt);
        if (this.drawDirty) {
            this.drawOrbit();
            this.updateCamera();
            this.drawDirty = false;
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    markDrawDirty(): void {
        this.drawDirty = true;
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const viewFolder = this.gui.addFolder('View');
        viewFolder.add(this.params, 'use3D')
            .name('3D').onFinishChange(this.markDrawDirty.bind(this));
        if (this.params.use3D) {
            viewFolder.add(this.params, 'projection3D', Object.values(Projection3D))
                .name('Project along').onFinishChange(this.markDrawDirty.bind(this));
            viewFolder.add(this.params, 'drawManifold')
                .name('Draw Manifold').onFinishChange(this.markDrawDirty.bind(this));
        } else {
            viewFolder.add(this.params, 'projection2D', Object.values(Projection2D))
                .name('Project onto').onFinishChange(this.markDrawDirty.bind(this));
        }
        viewFolder.add(this.params, 'rescaleY')
            .name('Rescale Y').min(1).max(100).step(1)
            .onFinishChange(this.markDrawDirty.bind(this));
        viewFolder.add(this.params, 'record').name('Record');
        viewFolder.open();

        const MIN = -100;
        const MAX = 100;

        const gameFolder = this.gui.addFolder('Game');
        gameFolder.add(this.params, 'forward')
            .name('Forward').onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.params, 'backward')
            .name('Reverse').onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.params, 'iterations')
            .name('Iterations').min(10).max(1000).step(10).onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'x')
            .name('x_1').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'y')
            .name('x_2').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'z')
            .name('y_1').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'w')
            .name('y_2').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.open();

        this.gui.open();
    }

    qs(vec: Vector4): Vector2 {
        const x1 = vec.x;
        const x2 = vec.y;
        const y1 = vec.z;
        const y2 = vec.w;

        if (closeEnough(y1, x2 * x2 + 2 * x1 * x2) &&
            closeEnough(y2, x1 * x1 + 2 * x1 * x2)) {
            throw Error(`Point on singular manifold: (${x1}, ${x2}, ${y1}, ${y2})`);
        }

        const k1 = (x1 + x2) * (x1 + x2) - x1 * x1 - y1;
        const k2 = (x1 + x2) * (x1 + x2) - x2 * x2 - y2;

        if (k1 === 0 && k2 < 0) {
            // (a + b)^2 - a^2 = 0
            // (a + b)^2 - b^2 = k2 < 0
            // a^2 - b^2 = k2 = a^2 + 2ab
            // -b^2 = 2ab
            // b = -2a OR b = 0 (doesn't work)
            // a^2 - 4a^2 - k2
            // -3a^2 = k2
            const ap = Math.sqrt(-k2 / 3);
            const bp = -2 * ap;
            return new Vector2(ap + x1, bp + x2);
        }

        const aSquared = ((2 * k2 - 4 * k1) + Math.sqrt((4 * k1 - 2 * k2) * (4 * k1 - 2 * k2) + 12 * k2 * k2)) / 6;

        const ap = Math.sqrt(aSquared);
        let bp: number;
        if (ap === 0) {
            bp = Math.sqrt(k1);
        } else {
            bp = 2 * k1 * ap / (3 * aSquared + k2);
        }

        // a = q1 - x1 => q1 = a + x1
        // b = q2 - x2 => q2 = b + x2
        const q1p = ap + x1;
        const q2p = bp + x2;
        return new Vector2(q1p, q2p);
    }

    private setEquations(sp: Vector4, sm: Vector4) {
        // const qs = this.qs(this.start);
        // const q1 = qs.x;
        // const q2 = qs.y;
        // const x1 = this.start.x;
        // const x2 = this.start.y;
        // const y1 = this.start.z;
        // const y2 = this.start.w;
        this.line = lineThroughTwo(
            new Vector2(this.start.x, this.start.y),
            new Vector2(sp.x, sp.y));

        // const a1 =
        //     (2 * q1 * q2
        //         + q2 * q2
        //         - y1
        //         + 4 * x1 * x2
        //         - 8 * q1 * x2
        //         - 2 * q2 * x1
        //         + 2 * x2 * x2
        //         - 2 * x2 * q2) / (2 * (q1 - x1) * (q1 - x1));
        //
        // const b1 = (2 * q1 * q2 + q2 * q2 - y1) / (q1 - x1) - 2 * a1 * q1;
        //
        // const c1 = y1 - a1 * x1 * x1 - b1 * x1

        // this.para1 = new Vector3(a1, b1, c1);
        this.para1 = parabolaThroughThree(
            new Vector2(this.start.x, this.start.z),
            new Vector2(sp.x, sp.z),
            new Vector2(sm.x, sm.z)
        );
        this.para2 = parabolaThroughThree(
            new Vector2(this.start.y, this.start.w),
            new Vector2(sp.y, sp.w),
            new Vector2(sm.y, sm.w)
        );
    }

    iterate(current: Vector4, prev: Vector4): Vector4 {
        const [sp, sm] = [...this.nextPoint(current)];
        const dp = sp.clone().sub(prev).lengthSq();
        const dm = sm.clone().sub(prev).lengthSq();
        if (dm < dp) {
            return sp;
        } else {
            return sm;
        }
    }

    printVector(name: string, v: Vector4): void {
        console.log(`${name}:\n  x1: ${v.x}\n  x2: ${v.y}\n  y1: ${v.z}\n  y2: ${v.w}`);
    }

    computeOrbit() {
        if (this.params.record) {
            this.orbit.push(this.start);
        } else {
            this.orbit = [this.start];
        }
        this.drawDirty = true;
        let sp: Vector4;
        let sm: Vector4;
        try {
            [sp, sm] = [...this.nextPoint(this.start)];
            this.setEquations(sp, sm);
        } catch (e) {
            console.error(e);
            return;
        }

        console.clear();
        this.printVector('Reverse 2', this.iterate(sm, this.start));
        this.printVector('Reverse 1', sm);
        this.printVector('Start', this.start);
        const qs = this.qs(this.start);
        console.log(`q1: ${qs.x}\nq2: ${qs.y}`)
        this.printVector('Forward 1', sp);
        this.printVector('Reverse 2', this.iterate(sp, this.start));


        // arbitrarily designate sp as the ''forward'' direction
        let prev;
        let current;

        if (this.params.forward) {
            prev = this.start.clone();
            current = sp;
            for (let i = 0; i < this.params.iterations; i++) {
                const next = this.iterate(current, prev);
                this.orbit.push(next);
                prev = current;
                current = next;
            }
        }

        if (this.params.backward) {
            prev = this.start.clone();
            current = sm;
            for (let i = 0; i < this.params.iterations; i++) {
                const next = this.iterate(current, prev);
                this.orbit.push(next);
                prev = current;
                current = next;
            }
        }
    }

    nextPoint(vec: Vector4): Vector4[] {
        const x1 = vec.x;
        const x2 = vec.y;
        const y1 = vec.z;
        const y2 = vec.w;

        const q = this.qs(vec);
        const q1p = q.x;
        const q2p = q.y;
        const q1m = 2 * x1 - q1p;
        const q2m = 2 * x2 - q2p;

        // X_1 = 2q_1 - x_1
        // X_2 = 2q_2 - x_2
        // Y_1 = 4 q_1 q_2 + 2 (q_2)^2 - y_1
        // Y_2 = 2 (q_1)^2 + 4 q_1 q_2 - y_2
        const sp = new Vector4(
            2 * q1p - x1,
            2 * q2p - x2,
            4 * q1p * q2p + 2 * q2p * q2p - y1,
            2 * q1p * q1p + 4 * q1p * q2p - y2,
        );

        const sm = new Vector4(
            2 * q1m - x1,
            2 * q2m - x2,
            4 * q1m * q2m + 2 * q2m * q2m - y1,
            2 * q1m * q1m + 4 * q1m * q2m - y2,
        );

        this.confirmSolution(vec, q1p, q2p);
        this.confirmSolution(vec, q1m, q2m);

        return [sp, sm];
    }

    private confirmSolution(vec: Vector4, q1: number, q2: number) {
        const x1 = vec.x;
        const x2 = vec.y;
        const y1 = vec.z;
        const y2 = vec.w;

        const a = q1 - x1;
        const b = q2 - x2;

        const eq1 = closeEnough((a + b) * (a + b) - a * a, (x1 + x2) * (x1 + x2) - x1 * x1 - y1);
        const eq2 = closeEnough((a + b) * (a + b) - b * b, (x1 + x2) * (x1 + x2) - x2 * x2 - y2);
        if (!eq1 || !eq2) throw Error(`Bad solution: (${x1}, ${x2}, ${y1}, ${y2}), (${q1}, ${q2})`);
    }

    drawOrbit() {
        this.scene.clear();
        const axesHelper = new AxesHelper(10);
        const ballGeometry = new SphereGeometry(0.04);
        let lGeometry;
        const lMaterial = new MeshBasicMaterial({color: 0x00ff00, wireframe: true});
        let lMesh;

        const pmax = 50;
        if (this.params.use3D) {
            const points: Vector3[] = [];
            switch (this.params.projection3D) {
            case Projection3D.X1:
                for (let point of this.orbit) points.push(new Vector3(point.y, point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(yColor, zColor, wColor);
                break;
            case Projection3D.X2:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, zColor, wColor);
                break;
            case Projection3D.Y1:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.y, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, yColor, wColor);
                if (this.params.drawManifold) {
                    lGeometry = new ParametricGeometry((u, v, target) => {
                        const x1 = (u - 0.5) * 100;
                        const x2 = (v - 0.5) * 100;
                        const y2 = x1 * x1 + 2 * x1 * x2;
                        target.set(x1, x2, y2 / this.params.rescaleY);
                    }, 51, 51);
                    lMesh = new Mesh(lGeometry, lMaterial);
                    this.scene.add(lMesh);
                }
                break;
            case Projection3D.Y2:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.y, point.z / this.params.rescaleY));
                axesHelper.setColors(xColor, yColor, zColor);

                if (this.params.drawManifold) {
                    // lGeometry = new ParametricGeometry((u, v, target) => {
                    //     const x1 = (u - 0.5) * 100;
                    //     const x2 = (v - 0.5) * 100;
                    //     const y1 = x2 * x2 + 2 * x1 * x2;
                    //     target.set(x1, x2, y1 / this.params.rescaleY);
                    // }, 51, 51);
                    // lMesh = new Mesh(lGeometry, lMaterial);
                    // this.scene.add(lMesh);

                    lGeometry = new ParametricGeometry((u, v, target) => {
                        const x1 = (u - 0.5) * 100;
                        const x2 = (v - 0.5) * 100;
                        const y1 = x2 * x2 + 2 * x1 * x2 + this.start.z;
                        target.set(x1, x2, y1 / this.params.rescaleY);
                    }, 51, 51);
                    lMesh = new Mesh(lGeometry, lMaterial);
                    this.scene.add(lMesh);
                }
                break;
            }
            ballGeometry.translate(points[0].x, points[0].y, points[0].z);
            const pointGeo = new SphereGeometry(0.03);
            const instancedMesh = new InstancedMesh(pointGeo, new MeshBasicMaterial({color: new Color(0xffffff)}), points.length);
            for (let i = 0; i < points.length; i++) {
                instancedMesh.setMatrixAt(i, new Matrix4().makeTranslation(points[i].x, points[i].y, points[i].z));
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedMesh);
            const dotGeometry = new BufferGeometry().setFromPoints(points);
            const dotMaterial = new PointsMaterial({size: 2, sizeAttenuation: false});
            const dots = new Points(dotGeometry, dotMaterial);
            this.scene.add(dots);
        } else {
            const points: Vector2[] = [];
            switch (this.params.projection2D) {
            case Projection2D.X1X2:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.y));
                axesHelper.setColors(xColor, yColor, white);
                // draw line
                let p1, p2;
                const a = this.line.x;
                const b = this.line.y;
                const c = this.line.z;
                const l = 1000;
                if (a === 0) {
                    p1 = new Vector2(-l, -c / b);
                    p2 = new Vector2(l, -c / b);
                } else if (b === 0) {
                    p1 = new Vector2(-c / a, -l);
                    p2 = new Vector2(-c / a, l);
                } else {
                    p1 = new Vector2(-l, -(-l * a + c) / b)
                    p2 = new Vector2(l, -(l * a + c) / b)
                }
                const lm = new LineBasicMaterial({color: 0xff0000});
                const lg = new BufferGeometry().setFromPoints([p1, p2]);
                const line = new Line(lg, lm);
                this.scene.add(line);
                break;
            case Projection2D.X1Y1:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.z / this.params.rescaleY));
                axesHelper.setColors(xColor, zColor, white);
                // draw para1
                const para1Points: Vector2[] = [];
                for (let x1 = -pmax; x1 <= pmax; x1 += 0.1) {
                    para1Points.push(new Vector2(x1, (this.para1.x * x1 * x1 + this.para1.y * x1 + this.para1.z) / this.params.rescaleY));
                }
                const p1m = new LineBasicMaterial({color: 0xff0000});
                const p1g = new BufferGeometry().setFromPoints(para1Points);
                const para1 = new Line(p1g, p1m);
                this.scene.add(para1);
                break;
            case Projection2D.X1Y2:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, wColor, white);
                break;
            case Projection2D.X2Y1:
                for (let point of this.orbit) points.push(new Vector2(point.y, point.z / this.params.rescaleY));
                axesHelper.setColors(yColor, zColor, white);
                break;
            case Projection2D.X2Y2:
                for (let point of this.orbit) points.push(new Vector2(point.y, point.w / this.params.rescaleY));
                axesHelper.setColors(yColor, wColor, white);
                // draw para2
                const para2Points: Vector2[] = [];
                for (let x2 = -pmax; x2 <= pmax; x2 += 0.1) {
                    para2Points.push(new Vector2(x2, (this.para2.x * x2 * x2 + this.para2.y * x2 + this.para2.z) / this.params.rescaleY));
                }
                const p2m = new LineBasicMaterial({color: 0xff0000});
                const p2g = new BufferGeometry().setFromPoints(para2Points);
                const para2 = new Line(p2g, p2m);
                this.scene.add(para2);
                break;
            case Projection2D.Y1Y2:
                for (let point of this.orbit) points.push(new Vector2(point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(zColor, wColor, white);
                break;
            }
            const pointGeo = new SphereGeometry(0.03);
            const instancedMesh = new InstancedMesh(pointGeo, new MeshBasicMaterial({color: new Color(0xffffff)}), points.length);
            for (let i = 0; i < points.length; i++) {
                instancedMesh.setMatrixAt(i, new Matrix4().makeTranslation(points[i].x, points[i].y, 0));
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedMesh);
            ballGeometry.translate(points[0].x, points[0].y, 0);
            const dotGeometry = new BufferGeometry().setFromPoints(points);
            const dotMaterial = new PointsMaterial({size: 1, sizeAttenuation: false});
            const dots = new Points(dotGeometry, dotMaterial);
            this.scene.add(dots);
        }

        this.scene.add(axesHelper);
        // show the starting point
        const ballMaterial = new MeshBasicMaterial({color: new Color(0xaa0044)});
        const ball = new Mesh(ballGeometry, ballMaterial);
        this.scene.add(ball);
    }
}

function lineThroughTwo(p1: Vector2, p2: Vector2): Vector3 {
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    return new Vector3(
        y1 - y2,
        x2 - x1,
        x1 * y2 - x2 * y1
    );
}

function parabolaThroughThree(p1: Vector2, p2: Vector2, p3: Vector2): Vector3 {
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    const x3 = p3.x;
    const y3 = p3.y;
    const x12 = x1 * x1;
    const x22 = x2 * x2;
    const x32 = x3 * x3;

    const r = -(x3 - x1) / (x2 - x1);

    const a = (r * (y2 - y1) + (y3 - y1)) / (r * (x22 - x12) + (x32 - x12));
    const b = (y2 - y1) / (x2 - x1) - a * (x2 + x1);
    const c = y1 - (a * x12 + b * x1);

    return new Vector3(a, b, c);
}