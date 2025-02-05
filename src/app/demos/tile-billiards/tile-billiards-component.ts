import {Component, OnDestroy} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import {CommonModule} from "@angular/common";
import {AffineQuasiregularTiling} from "./affine-quasiregular-tiling";
import {PolygonalTiling} from "./polygonal-tiling";
import {closeEnough} from "../../../math/math-helpers";
import {HyperbolicQuasiregularTiling} from "./hyperbolic-quasiregular-tiling";
import {Vector2} from "three";

const CLEAR_COLOR = 0x0a2933;

enum Geometry {
    AFFINE,
    HYPERBOLIC,
    SPHERICAL
}

const DIR_SPEED: number = 0.3;
const START_SPEED: number = 0.1;

@Component({
    selector: 'tiling-billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class TileBilliardsComponent extends ThreeDemoComponent implements OnDestroy {
    orbitControls: OrbitControls;
    n: number = 3;
    m: number = 6;
    depth: number = 20;
    logIterations: number = 1;
    geometry: Geometry = Geometry.AFFINE;
    start: Vector2 = new Vector2();
    direction: number = 0.1234;

    private tiling: PolygonalTiling<any, any> | undefined = undefined;
    private gui: dat.GUI;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.orbitControls.zoomToCursor = true;

        this.renderer.setClearColor(CLEAR_COLOR);

        this.gui = new dat.GUI();
        this.updateGUI();
        this.resetTiling();

        this.helpTitle = 'Tiling Billiards';
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    private resetTiling() {
        const c = 2.0 / this.n + 2.0 / this.m;
        if (closeEnough(c, 1)) {
            // Affine
            this.geometry = Geometry.AFFINE;
            this.tiling = new AffineQuasiregularTiling(this.n, this.m);
            this.tiling.generate(this.depth);
        } else if (c < 1.0) {
            // Hyperbolic
            this.geometry = Geometry.HYPERBOLIC;
            this.tiling = new HyperbolicQuasiregularTiling(this.n, this.m);
            this.tiling.generate(Math.min(this.depth, 10));
        } else {
            // Spherical
            this.geometry = Geometry.SPHERICAL;
            // Depth is meaningless here: we will always generate the whole tiling.
        }
        this.play();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        this.scene.clear();
        this.tiling?.draw(this.scene);
        // draw the starting point
        switch (this.geometry) {

        }
    }

    processKeyboardInput(dt: number) {
        this.showHelp = !!this.keysPressed.get('KeyH');
        let dd = 0;
        if (this.keyHeld('BracketLeft')) dd += dt * DIR_SPEED;
        if (this.keyHeld('BracketRight')) dd -= dt * DIR_SPEED;

        let ds = new Vector2();
        if (this.keyHeld('KeyA')) ds.x -= 1;
        if (this.keyHeld('KeyD')) ds.x += 1;
        if (this.keyHeld('KeyS')) ds.y -= 1;
        if (this.keyHeld('KeyW')) ds.y += 1;
        if (ds.length() != 0) ds.normalize().multiplyScalar(dt * START_SPEED)

        this.direction += dd;
        this.start.x += ds.x;
        this.start.y += ds.y;
        this.play();
    }

    play() {
        this.tiling?.play(Math.pow(2, this.logIterations), this.start, this.direction);
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();
        let tilingFolder = this.gui.addFolder('Tiling');
        tilingFolder.add(this, 'n', 3, 10, 1)
            .onFinishChange(this.resetTiling.bind(this));
        tilingFolder.add(this, 'm', 3, 10, 1)
            .onFinishChange(this.resetTiling.bind(this));
        tilingFolder.add(this, 'depth', 1, 100, 1)
            .onFinishChange(this.resetTiling.bind(this));
        tilingFolder.open();

        let billiardFolder = this.gui.addFolder('Tiling Billiards');
        billiardFolder.add(this, 'logIterations', 1, 20, 1)
            .name('log2(iters)')
            .onFinishChange(this.play.bind(this));
        billiardFolder.open();

        this.gui.open();
    }
}