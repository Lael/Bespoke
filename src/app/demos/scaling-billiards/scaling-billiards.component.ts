import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
    BoxGeometry,
    BufferGeometry,
    Color,
    InstancedMesh,
    Line,
    LineBasicMaterial,
    Matrix4,
    MeshBasicMaterial,
    Object3D,
    Points,
    PointsMaterial,
    Vector2
} from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {lpCircle} from "../../../math/billiards/affine-oval-table";
import {CommonModule} from "@angular/common";

// Colors
const CLEAR_COLOR = 0x0a2933;
const FILL_COLOR = 0xffffff;
const BORDER_COLOR = 0xffffff;
// const CHORDS_COLOR = 0x000000;
const OUTER_ORBIT_COLOR = 0x3adecb;
// const SINGULARITY_COLOR = 0xff7f5e;
const START_POINT_COLOR = 0x51e76f;
const END_POINT_COLOR = 0x6f51e7;
// const SCAFFOLD_COLOR = 0xffbbff;
// const HANDLE_COLOR = 0x990044;
// const CIRCLE_CENTER_COLOR = 0xf5dd90;

// const CG1 = 0x0a2933;
const CG1 = 0x2afae2;
// const CG2 = 0x2e2dc9;
const CG3 = 0xe76f51;

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class ScalingBilliardsComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;

    // Parameters

    tableParams = {
        p: 3,
        xScale: 1,
    };

    drawParams = {
        orbit: true,
        orbitPaths: false,
        scaffold: false,
    }

    gameParams = {
        scaleFactor: 0.95,
        iterations: 12,
    }

    // When to update stuff
    tableDirty = true;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    polygon = new THREE.Mesh();
    border = new THREE.Line();
    orbit = new THREE.Object3D();
    startPointDisk = new THREE.Mesh();
    nextPoint = new THREE.Mesh();
    scaffold: THREE.Object3D[] = [];
    currentOrbit: Vector2[] = [];
    savedOrbit: Vector2[] = [];
    scaledOrbits: Object3D[] = [];

    grid: InstancedMesh | null = null;

    // Billiards
    table = lpCircle(this.tableParams.p, this.tableParams.xScale);
    start: Vector2 = new Vector2(-4, 1);

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.camera.zoom = 1 / 10;
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.startPointDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.startPointDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.startPointDragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        const startPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const nextPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
        const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

        this.startPointDisk = new THREE.Mesh(startPointGeometry, startPointMaterial);
        this.nextPoint = new THREE.Mesh(nextPointGeometry, endPointMaterial);
        this.draggables.push(this.startPointDisk);
        this.startPointDisk.position.set(this.start.x, this.start.y, 0);

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    private processKeyboardInput(dt: number): void {
        // Test point
        const pointDiff = new Vector2();
        if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
        if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
        if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
        if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
        if (pointDiff.length() === 0) return;
        pointDiff.normalize();
        if (this.keysPressed.get('ShiftLeft')) pointDiff.multiplyScalar(0.1);
        if (this.keysPressed.get('AltLeft')) pointDiff.multiplyScalar(0.01);
        const startPointDiff = pointDiff.multiplyScalar(0.5 * dt / this.orthographicCamera.zoom);
        this.start.add(startPointDiff);
        this.orbitDirty = true;
    }

    private saveOrbit() {
        this.savedOrbit.push(...this.currentOrbit)
        this.savedOrbit.sort((a, b) => a.angle() - b.angle());
        this.savedOrbit.push(this.savedOrbit[0]);
        this.scaledOrbits.push(new Points(
            new BufferGeometry().setFromPoints(this.savedOrbit),
            new PointsMaterial({color: OUTER_ORBIT_COLOR})
        ));
    }

    private iterate() {
        try {
            const scaledOrbit = this.savedOrbit.map(p => this.mapPoint(p, this.gameParams.scaleFactor));
            this.savedOrbit = scaledOrbit;
            // const n = 30.0;
            // const t = Math.pow(Math.min(this.scaledOrbits.length, n) / n, 1.5);
            const t = 1 - Math.exp(-this.scaledOrbits.length / 8);
            // const t1 = Math.exp(-this.scaledOrbits.length / 10);
            // const t2 = Math.exp(-Math.pow(this.scaledOrbits.length - 20, 2) / 100) * (1 - t1);
            // const t3 = 1 - (t1 + t2);
            // const color =
            //     new Color(CG1).multiplyScalar(t1).add(
            //         new Color(CG2).multiplyScalar(t2).add(
            //             new Color(CG3).multiplyScalar(t3)));
            const color = new Color(CG3).multiplyScalar(t).add(new Color(CG1).multiplyScalar(1 - t));
            this.scaledOrbits.push(new Points(
                new BufferGeometry().setFromPoints(scaledOrbit),
                new PointsMaterial({color})
            ));
        } catch (e) {
            console.log(e);
        }
        this.markDrawDirty();
    }

    private clear() {
        this.savedOrbit = [];
        this.scaledOrbits = [];
        this.markDrawDirty();
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);
        switch (e.code) {
        case 'KeyS':
            this.saveOrbit();
            break;
        case 'KeyI':
            this.iterate();
            break;
        case 'KeyC':
            this.clear();
            break;
        case 'KeyX':
            const oldPosition = this.camera.position;
            this.camera.position.set(0, 0, oldPosition.z);
            this.orbitControls.target.set(0, 0, 0);
            this.orbitControls.update();
            break;
        case 'KeyP':
            this.printScreen();
            break;
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);

        if (this.tableDirty) this.updateTable();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();
    }

    updateGrid() {
        const threshold = 2.5;
        const iterations = 20;
        const values = new Map<Vector2, number>();
        const bound = 2;
        const step = Math.pow(2, -6);
        console.log('starting', new Date());
        for (let i = -bound; i <= bound; i += step) {
            for (let j = -Math.sqrt(bound * bound - i * i); j <= Math.sqrt(bound * bound - i * i); j += step) {
                let v = new Vector2(i, j);
                let value = 1;
                for (let k = 0; k < iterations; k++) {
                    if (v.length() > threshold) {
                        value = k / (1.5 * iterations);
                        break;
                    }
                    try {
                        v = this.inverseMapPoint(v, this.gameParams.scaleFactor);
                    } catch (e) {
                        value = 0;
                        break;
                    }
                }
                values.set(new Vector2(i, j), value);
            }
        }
        console.log('finishing', new Date());
        const geometry = new BoxGeometry(step, step, step);
        const material = new MeshBasicMaterial({color: new Color(0xffffff)});
        const im = new InstancedMesh(geometry, material, values.size);
        let i = 0;
        for (let [pos, val] of values.entries()) {
            im.setMatrixAt(i, new Matrix4().makeTranslation(pos.x, pos.y, -step * 2));
            im.setColorAt(i, new Color(CLEAR_COLOR).multiplyScalar(1 - val).add(new Color(0xff0000).multiplyScalar(val)));
            i++;
        }
        im.instanceMatrix.needsUpdate = true;
        this.grid = im;
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const drawFolder = this.gui.addFolder('Drawing');
        drawFolder.add(this.drawParams, 'orbitPaths').name('Orbit Paths').onFinishChange(
            this.markOrbitDirty.bind(this));
        drawFolder.open();

        const gameFolder = this.gui.addFolder('Game');
        gameFolder.add(this.tableParams, 'p')
            .min(1).max(5).name('Superellipse')
            .onFinishChange(this.markTableDirty.bind(this));
        gameFolder.add(this.gameParams, 'scaleFactor')
            .min(0.1).max(1).step(0.0001).name('Decay')
            .onFinishChange(() => {
                this.orbitDirty = true;
            });
        gameFolder.add(this.gameParams, 'iterations')
            .min(1).max(20).step(1).name('Iterations (log)')
            .onFinishChange(() => {
                this.orbitDirty = true;
            });
        gameFolder.open();

        this.gui.open();
    }

    markTableDirty() {
        this.tableDirty = true;
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    startPointDragStart() {
        this.dragging = true;
    }

    startPointDrag() {
        this.start.x = this.startPointDisk.position.x;
        this.start.y = this.startPointDisk.position.y;
        this.orbitDirty = true;
    }

    startPointDragEnd() {
        this.dragging = false;
        this.orbitDirty = true;
    }

    updateTable() {
        this.tableDirty = false;
        this.savedOrbit = [];
        this.scaledOrbits = [];

        this.scene.remove(this.polygon);
        this.scene.remove(this.border);

        this.table = lpCircle(this.tableParams.p, this.tableParams.xScale);

        let vertices: Vector2[] = this.table.points(256);

        let shape = new THREE.Shape(vertices);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
        this.polygon = new THREE.Mesh(geometry, material);
        this.border = new THREE.Line(
            new BufferGeometry().setFromPoints(vertices.concat([vertices[0]])),
            new LineBasicMaterial({color: BORDER_COLOR})
        );

        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;
        // this.updateGrid();
        this.scene.remove(this.orbit);
        this.startPointDisk.position.set(this.start.x, this.start.y, 0);

        for (let s of this.scaffold) {
            this.scene.remove(s);
        }
        this.scaffold = [];

        const iterations = this.dragging ? Math.min(this.iterations, 2) : this.iterations;

        const orbitPoints = [];

        let current = this.start.clone();
        for (let i = 0; i < iterations; i++) {
            orbitPoints.push(current);
            try {
                current = this.mapPoint(current);
            } catch (e) {
                console.log(e);
                break;
            }
        }

        if (orbitPoints.length >= 2) {
            this.nextPoint.position.set(orbitPoints[1].x, orbitPoints[1].y, 0);
        } else {
            this.nextPoint.position.set(0, 0, 0);
        }

        if (this.drawParams.orbitPaths) {
            this.orbit = new Line(new BufferGeometry().setFromPoints(orbitPoints), new LineBasicMaterial({color: OUTER_ORBIT_COLOR}));
        } else {
            this.orbit = new Points(new BufferGeometry().setFromPoints(orbitPoints), new PointsMaterial({color: OUTER_ORBIT_COLOR}));
        }
        this.currentOrbit = orbitPoints;
    }

    inverseMapPoint(p: Vector2, scaleFactor: number = 1): Vector2 {
        const tp = this.table.leftTangentPoint(p);
        return tp.add(tp.clone().sub(p).multiplyScalar(1 / scaleFactor));
    }

    mapPoint(p: Vector2, scaleFactor: number = 1): Vector2 {
        const tp = this.table.rightTangentPoint(p);
        return tp.add(tp.clone().sub(p).multiplyScalar(scaleFactor));
    }

    updateDraw() {
        this.drawDirty = false;
        this.scene.clear();

        this.scene.add(this.polygon);
        // this.scene.add(this.border);

        if (this.drawParams.scaffold) {
            for (let s of this.scaffold) this.scene.add(s);
        }

        if (this.drawParams.orbit) {
            this.scene.add(this.orbit);
            // this.scene.add(this.startPointDisk);
            // this.scene.add(this.nextPoint);
            for (let ps of this.scaledOrbits) {
                this.scene.add(ps);
            }
        }

        if (this.grid) this.scene.add(this.grid);
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations) - 1;
    }
}