import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    ArrowHelper,
    BufferGeometry,
    Color,
    Line,
    Mesh,
    MeshBasicMaterial,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector2,
    Vector3
} from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {EllipseTable} from "../../../math/billiards/ellipse-table";
import {randFloat} from "three/src/math/MathUtils";
import {CommonModule} from "@angular/common";

// Colors
const CLEAR_COLOR = 0x0a2933;
// const FILL_COLOR = 0xffffff;
// const BORDER_COLOR = 0xffffff;
// const CHORDS_COLOR = 0x000000;
// const OUTER_ORBIT_COLOR = 0x3adecb;
// const SINGULARITY_COLOR = 0xff7f5e;
// const START_POINT_COLOR = 0x51e76f;
// const END_POINT_COLOR = 0x6f51e7;
// const SCAFFOLD_COLOR = 0xffbbff;
// const HANDLE_COLOR = 0x990044;
// const CIRCLE_CENTER_COLOR = 0xf5dd90;

// const CG1 = 0x0a2933;
// const CG1 = 0x2afae2;
// const CG2 = 0x2e2dc9;
// const CG3 = 0xe76f51;

@Component({
    selector: 'phase',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class PhaseComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;

    // Parameters
    params = {
        e: 0,
        t: 0,
        alpha: 0.5,
        iters: 0,
        clear: true,
        showPhase: false,
    };

    table: EllipseTable = new EllipseTable(this.params.e);

    start: Mesh;
    chord: ArrowHelper;
    trajectory: Line;
    phaseSpace: Line;
    orbits: Points[] = [];

    orbitDirty = true;

    gui: dat.GUI;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;

        this.renderer.setClearColor(CLEAR_COLOR);

        this.start = new Mesh(
            new SphereGeometry(1),
            new MeshBasicMaterial({color: 0xff0000})
        );
        this.chord = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0));
        this.phaseSpace = new Line(new BufferGeometry().setFromPoints([
            new Vector2(0, 0),
            new Vector2(1, 0),
            new Vector2(1, 1),
            new Vector2(0, 1),
            new Vector2(0, 0),
        ]), new MeshBasicMaterial({color: 0xffffff}));

        this.phaseSpace.position.set(2, -1, 0);
        this.phaseSpace.scale.set(4, 2, 1);
        this.trajectory = new Line(new BufferGeometry().setFromPoints([]), new MeshBasicMaterial({color: 0x000000}));

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
        const speed = 0.2;
        this.params.t += pointDiff.y * dt * speed;
        while (this.params.t < 0) this.params.t += 1;
        while (this.params.t > 1) this.params.t -= 1;
        this.params.alpha -= pointDiff.x * dt * speed;
        if (this.params.alpha < 0.01) this.params.alpha = 0.01;
        if (this.params.alpha > 0.99) this.params.alpha = 0.99;
        this.orbitDirty = true;
    }

    private iterate() {
        this.orbitDirty = false;
        const startPoint = this.table.point(this.params.t);
        this.start.position.set(startPoint.x, startPoint.y, 0);
        const tangent = this.table.tangent(this.params.t);
        const dir = tangent.rotateAround(new Vector2(), Math.PI * this.params.alpha);
        const image = this.table.cast(this.params.t, this.params.alpha);
        const endPoint = this.table.point(image.x);
        this.chord = new ArrowHelper(
            new Vector3(dir.x, dir.y, 0),
            new Vector3(startPoint.x, startPoint.y, 0),
            startPoint.distanceTo(endPoint) / 2,
            0xffffff,
        );

        let state = new Vector2(this.params.t, this.params.alpha);
        const points = [startPoint];
        const orbit = [];

        for (let i = 0; i < this.iterations; i++) {
            orbit.push(state);
            state = this.table.cast(state.x, state.y);
            points.push(this.table.point(state.x));
        }

        this.trajectory = new Line(new BufferGeometry().setFromPoints(points), new MeshBasicMaterial({color: 0xffffff}));
        const phaseColor = this.params.clear ?
            new Color(0x888888) :
            new Color().setRGB(randFloat(0.2, 0.8), randFloat(0.2, 0.8), randFloat(0.2, 0.8));

        const orbitPoints = new Points(
            new BufferGeometry().setFromPoints(orbit),
            new PointsMaterial({color: phaseColor})
        );
        orbitPoints.position.set(2, -1, 0);
        orbitPoints.scale.set(4, 2, 1);

        this.orbits.push(orbitPoints);
    }

    private clear() {
        this.orbits = [];
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);
        if (e.code === 'KeyC') {
            this.clear();
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);

        if (this.params.clear && this.orbitDirty) {
            this.clear();
        }

        this.scene.clear();
        this.scene.add(this.table.drawable);
        if (this.orbitDirty) this.iterate();
        this.scene.add(this.trajectory);
        this.scene.add(this.chord);
        const z = 0.01 / this.camera.zoom;
        this.start.scale.set(z, z, z);
        this.scene.add(this.start);

        if (this.params.showPhase) {
            this.scene.add(this.phaseSpace);
            this.scene.add(...this.orbits);
        }
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        this.gui.add(this.params, 'e').min(0).max(0.9).step(0.01).name('Eccentricity').onChange(() => {
            this.clear();
            this.table = new EllipseTable(this.params.e);
            this.orbitDirty = true;
        });
        this.gui.add(this.params, 'iters').min(0).max(12).step(1).name('log2(iters)').onFinishChange(() => {
            this.clear();
            this.orbitDirty = true;
        });
        this.gui.add(this.params, 'showPhase').name('Show Phase');
        this.gui.add(this.params, 'clear').name('Clear');

        this.gui.open();
    }

    get iterations(): number {
        return Math.pow(2, this.params.iters);
    }
}