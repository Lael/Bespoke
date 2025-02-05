import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    Color,
    InstancedMesh,
    Light,
    Line,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    Object3D,
    Points,
    PointsMaterial,
    Shape,
    SphereGeometry,
    Vector2,
    Vector3,
    Vector4
} from 'three';
import * as dat from 'dat.gui';
import {Duality, Generator, Geometry} from "../../../math/billiards/new-billiard";
import {AffinePolygonTable, AffineRay} from "../../../math/billiards/affine-polygon-table";
import {HyperbolicPolygonTable} from "../../../math/billiards/hyperbolic-polygon-table"
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex";
import {AffineOuterBilliardTable, fixTime, SphericalOuterBilliardTable} from "../../../math/billiards/tables";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";
import {AffineSemidiskTable} from "../../../math/billiards/affine-semidisk-table";
import {clamp} from "three/src/math/MathUtils.js";
import {AffineFlexigonTable} from "../../../math/billiards/affine-flexigon-table";
import {CommonModule} from "@angular/common";
import {lpCircle} from "../../../math/billiards/affine-oval-table";
import {SphericalPolygonTable} from "../../../math/billiards/spherical-polygon-table";
import {SpherePoint, SphericalArc, sphericalLerp} from "../../../math/geometry/spherical";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

// Colors
// const CLEAR_COLOR = 0x0a2933;
// const CLEAR_COLOR = 0x000000;
const CLEAR_COLOR = 0xffffff;

const SPHERE_COLOR = 0xffffff;
// const SPHERE_COLOR = 0xFAFAFA;
const PLANE_COLOR = 0xFAFAFA;
// const HYPERBOLIC_PLANE_COLOR = 0xFAFAFA;
const HYPERBOLIC_PLANE_COLOR = 0xffffff;

// const SPHERE_TABLE_COLOR = 0xFAFAFA;
const SPHERE_TABLE_COLOR = 0x0000ff;
// const SPHERE_TABLE_COLOR = 0x283845;
// const SPHERE_SING_COLOR = 0xffdcad;
const SPHERE_SING_COLOR = 0xff0000;
// const SPHERE_SING_COLOR = 0x283845;
// const SPHERE_SING_COLOR = 0xE26612;
// const FILL_COLOR = 0x283845;
const FILL_COLOR = 0x0000ff;
const CHORDS_COLOR = 0xffffff;
// const OUTER_ORBIT_COLOR = 0x0055aa;
// const OUTER_ORBIT_COLOR = 0x44aaff;
const OUTER_ORBIT_COLOR = 0x000000;
const SPHERE_OUTER_ORBIT_COLOR = 0xaaffff;
// const SPHERE_OUTER_ORBIT_COLOR = 0x0055aa;
// const SINGULARITY_COLOR = 0xE26612;
// const SINGULARITY_COLOR = 0xf7a863;
const SINGULARITY_COLOR = 0xff0000;

const START_POINT_COLOR = 0x51e76f;
const END_POINT_COLOR = 0x6f51e7;
const SCAFFOLD_COLOR = 0xff00ff;
const HANDLE_COLOR = 0x990044;
const CIRCLE_CENTER_COLOR = 0x888800;

enum TableType {
    POLYGON = 'Polygon',
    FLEXIGON = 'Flexigon',
    SEMIDISK = 'Semidisk',
    SUPERELLIPSE = 'Superellipse',
}

interface PolygonParams {
    n: number,
    r: number,
}

interface FlexigonParams {
    n: number,
    k: number,
}

interface SuperellipseParams {
    p: number,
}

interface SemidiskParams {
    beta: number,
}

interface TableParams {
    tableType: TableType,
    polygonParams: PolygonParams,
    flexigonParams: FlexigonParams,
    superellipseParams: SuperellipseParams,
    semidiskParams: SemidiskParams,
}

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule]
})
export class BilliardsComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;
    cameraSwitch = true;

    // Parameters
    billiardTypeParams = {
        duality: Duality.OUTER,
        generator: Generator.AREA,
        geometry: Geometry.HYPERBOLIC,
    }

    tableParams: TableParams = {
        tableType: TableType.POLYGON,
        polygonParams: {
            n: 5,
            r: 0.40235,
        },
        flexigonParams: {
            n: 3,
            k: 0.5,
        },
        superellipseParams: {
            p: 1.5,
        },
        semidiskParams: {
            beta: 0,
        }
    }

    drawParams = {
        model: 'Poincaré',
        singularities: true,
        singularityIterations: 100,
        singInterval: 0,
        orbit: false,
        start: false,
        connectEvery: 1,
        derivative: false,
        derivativeBound: 5,
        derivativeStep: -1,
        scaffold: false,
        centers: false,
        stereograph: false,
        headingCoords: false,
        orbitSize: 1,
    }

    gameParams = {
        iterations: 1,
        startTime: 0.123,
        angle: 0.456,
        tilingPolygon: 0,
    }

    // When to update stuff
    tableDirty = true;
    singularityDirty = true;
    derivativeDirty = false;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    // planarPlane: THREE.Mesh;
    // hyperbolicPlane: THREE.Mesh;
    hyperbolicDisk: THREE.Line;
    sphericalSphere: THREE.Mesh;
    polygon = new THREE.Mesh();
    orbit: Object3D[] = [];
    centers: THREE.Object3D[] = [];
    singularities = new THREE.Object3D();
    derivatives = new THREE.Object3D();
    startPoint = new THREE.Mesh();
    nextPoint = new THREE.Mesh();
    scaffold: THREE.Object3D[] = [];
    antiTable = new THREE.Mesh();
    tableMesh = new THREE.Mesh();
    // strip: Mesh;

    // Billiards
    affineOuterTable!: AffineOuterBilliardTable;
    affineTable!: AffinePolygonTable;
    hyperbolicTable!: HyperbolicPolygonTable;
    sphericalTable!: SphericalOuterBilliardTable
    affineOuterStart: Vector2 = new Vector2(-Math.sqrt(2) / 2 - 0.000_1, 0);
    hyperOuterStart: HyperPoint = HyperPoint.fromPoincare(new Vector2(0.5, 0.5));

    lights: Light[] = [];

    constructor() {
        super();
        this.useOrthographic = true;
        this.camera.zoom = 0.95;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.orbitControls.zoomToCursor = true;
        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.affineVertexDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.affineVertexDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.affineVertexDragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        const path = new THREE.Path();

        path.absellipse(0, 0, 1, 1, 0, 2 * Math.PI, true, 0);

        const points = path.getPoints(128);

        const diskGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const diskMaterial = new THREE.LineBasicMaterial({color: 0x000000});
        const planeMaterial = new MeshBasicMaterial({color: PLANE_COLOR});
        const hyperbolicPlaneMaterial = new MeshBasicMaterial({color: HYPERBOLIC_PLANE_COLOR});
        // this.planarPlane = new Mesh(new PlaneGeometry(1000, 1000), planeMaterial);
        // this.planarPlane.position.set(0, 0, -1);
        // this.hyperbolicPlane = new Mesh(new CircleGeometry(1, 120), hyperbolicPlaneMaterial);
        this.hyperbolicDisk = new THREE.Line(diskGeometry, diskMaterial);
        this.sphericalSphere = new Mesh(
            new SphereGeometry(1, 180, 180),
            // new MeshBasicMaterial({color: SPHERE_COLOR}),
            new MeshPhongMaterial({
                transparent: true,
                opacity: 0.95,
                color: SPHERE_COLOR,
            })
        );

        const semiDiskPoints = [];
        for (let i = 0; i <= 90; i++) {
            semiDiskPoints.push(new Vector2(
                Math.cos(i / 90 * Math.PI),
                Math.sin(i / 90 * Math.PI),
            ));
        }

        const startPointGeometry = new THREE.SphereGeometry(0.025);
        const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
        const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

        this.startPoint = new THREE.Mesh(startPointGeometry, startPointMaterial);
        this.nextPoint = new THREE.Mesh(startPointGeometry, endPointMaterial);

        this.resetAffineVertices();

        this.gui = new dat.GUI();
        this.updateGUI();

        const al = new THREE.AmbientLight(0xffffff, 1);
        const dl = new THREE.DirectionalLight(0xffffff, 2);
        dl.position.set(1, 1, 1);
        dl.target = this.sphericalSphere;

        this.lights.push(al, dl);

        // this.strip = new Mesh(new PlaneGeometry(100, Math.sqrt(2)), new MeshBasicMaterial({color: 0xdddddd}));
        // this.strip.position.set(50 + Math.sqrt(2) / 2, Math.sqrt(2), -0.1);
    }

    private processKeyboardInput(dt: number): void {
        if (this.keyJustPressed('KeyC')) {
            this.camera.position.x = 0;
            this.camera.position.y = 0;
            this.camera.zoom = 1;
            this.updateOrthographicCamera();
            this.orbitControls.reset();
        }
        if (this.keyJustPressed('KeyP')) {
            this.printScreen();
        }
        if (this.geometry === Geometry.EUCLIDEAN &&
            this.duality === Duality.OUTER &&
            this.keyJustPressed('KeyK')) {
            this.setKite();
        }
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
        if (this.duality === Duality.OUTER) {
            const startPointDiff = pointDiff.multiplyScalar(0.5 * dt / this.camera.zoom);
            if (this.geometry === Geometry.EUCLIDEAN || this.geometry === Geometry.SPHERICAL) {
                this.affineOuterStart.add(startPointDiff);
                this.orbitDirty = true;
            } else {
                const current = this.hyperOuterStart.resolve(this.model);
                const diff = startPointDiff.multiplyScalar(1 / (1 + current.modulusSquared()));
                const newPoint = current.plus(Complex.fromVector2(diff));
                if (newPoint.modulusSquared() > 0.999) return;
                this.hyperOuterStart = new HyperPoint(newPoint, this.model);
                this.orbitDirty = true;
            }
        } else {
            this.gameParams.startTime += pointDiff.x * 0.05 * dt;
            this.gameParams.startTime = fixTime(this.gameParams.startTime);
            this.gameParams.angle += pointDiff.y * 0.05 * dt;
            this.gameParams.angle = fixTime(this.gameParams.angle);
            this.orbitDirty = true;
            this.updateGUI();
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        const z = 0.5 / this.camera.zoom;
        this.startPoint.scale.set(z, z, z);
        this.nextPoint.scale.set(z, z, z);
        this.draggables.map(d => d.scale.set(z / 2, z / 2, z / 2));
        this.processKeyboardInput(dt);

        if (this.cameraSwitch) {
            this.cameraSwitch = false;
            switch (this.geometry) {
            case Geometry.EUCLIDEAN:
            case Geometry.HYPERBOLIC:
                // this.useOrthographic = true;
                this.orbitControls.reset();
                this.orbitControls.enablePan = true;
                this.orbitControls.enableRotate = false;
                this.orbitControls.zoomToCursor = true;
                // this.orbitControls.
                this.updateOrthographicCamera();
                this.orthographicCamera.rotation.set(0, 0, 0);
                break;
            case Geometry.SPHERICAL:
                if (this.drawParams.stereograph) {
                    this.orbitControls.reset();
                    this.orbitControls.enablePan = true;
                    this.orbitControls.enableRotate = false;
                    this.orbitControls.zoomToCursor = true;
                    this.updateOrthographicCamera();
                    this.orthographicCamera.rotation.set(0, 0, 0);
                } else {
                    this.orbitControls.reset();
                    this.orbitControls.enablePan = false;
                    this.orbitControls.enableRotate = true;
                    this.orbitControls.zoomToCursor = false;
                    this.updateOrthographicCamera();
                    this.orthographicCamera.rotation.set(0, 0, 0);
                }
                break;
            }
        }

        if (this.tableDirty) this.updateTable();
        if (this.singularityDirty && this.drawParams.singularities && this.duality === Duality.OUTER) this.updateSingularities();
        if (this.geometry === Geometry.HYPERBOLIC && this.duality === Duality.OUTER && this.hyperbolicTable.fresh) {
            this.drawHyperbolicPreimages(this.hyperbolicTable.singularities);
            this.hyperbolicTable.fresh = false;
        }
        // if (this.derivativeDirty) this.updateDerivatives();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const billiardFolder = this.gui.addFolder('Billiard Type');
        billiardFolder.add(this.billiardTypeParams, 'duality').options(Object.values(Duality))
            .name('Duality')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'generator').options(Object.values(Generator))
            .name('Generator')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'geometry').options(Object.values(Geometry))
            .name('Geometry')
            .onFinishChange(() => {
                this.cameraSwitch = true;
                if (this.geometry === Geometry.HYPERBOLIC) {
                    switch (this.duality) {
                    case Duality.INNER:
                        this.billiardTypeParams.generator = Generator.LENGTH;
                        break;
                    case Duality.OUTER:
                        this.billiardTypeParams.generator = Generator.AREA;
                        break;
                    }
                    this.tableParams.tableType = TableType.POLYGON;
                }
                this.updateBilliardTypeParams();
            });
        billiardFolder.open();

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this.tableParams, 'tableType').options(Object.values(TableType)).name('Table Type')
            .onFinishChange(() => {
                if (this.tableParams.tableType !== TableType.POLYGON) {
                    this.cameraSwitch = true;
                    this.billiardTypeParams.duality = Duality.OUTER;
                    this.billiardTypeParams.geometry = Geometry.EUCLIDEAN;
                }
                this.updateTableParams();
            });
        switch (this.tableParams.tableType) {
        case TableType.POLYGON:
            tableFolder.add(this.tableParams.polygonParams, 'n').name('n')
                .min(2).max(12).step(1)
                .onFinishChange(this.updateTableParams.bind(this));
            if (this.geometry === Geometry.HYPERBOLIC || this.geometry === Geometry.SPHERICAL) {
                tableFolder.add(this.tableParams.polygonParams, 'r').name('r')
                    .min(0.01).max(2).step(0.001)
                    .onFinishChange(this.updateTableParams.bind(this));
            }
            break;
        case TableType.FLEXIGON:
            tableFolder.add(this.tableParams.flexigonParams, 'n').name('n')
                .min(2).max(12).step(1)
                .onFinishChange(this.updateTableParams.bind(this));
            tableFolder.add(this.tableParams.flexigonParams, 'k').name('k')
                .min(0.01).max(0.99).step(0.01)
                .onFinishChange(this.updateTableParams.bind(this));
            break;
        case TableType.SEMIDISK:
            tableFolder.add(this.tableParams.semidiskParams, 'beta').name('beta')
                .min(-1.57).max(1.57).step(0.01)
                .onFinishChange(this.updateTableParams.bind(this));
            break;
        case TableType.SUPERELLIPSE:
            tableFolder.add(this.tableParams.superellipseParams, 'p').name('p')
                .min(1).max(5).step(0.1)
                .onFinishChange(this.updateTableParams.bind(this));
            break;
        }
        tableFolder.open();

        const drawFolder = this.gui.addFolder('Drawing');
        if (this.geometry === Geometry.HYPERBOLIC) {
            drawFolder.add(this.drawParams, 'model', ['Poincaré', 'Klein'])
                .name('Model').onFinishChange(this.updateDrawParams.bind(this));
        }
        if (this.duality === Duality.OUTER) {
            drawFolder.add(this.drawParams, 'singularities').name('Singularities').onFinishChange(
                this.markDrawDirty.bind(this));
            drawFolder.add(this.drawParams, 'singularityIterations').name('Iterations')
                .min(0).max(
                this.generator === Generator.AREA ? 1000 : 150).step(1)
                .onFinishChange(this.markSingularityDirty.bind(this));
            drawFolder.add(this.drawParams, 'singInterval').name('Interval')
                .min(0).max(12).step(1)
                .onFinishChange(this.markSingularityDirty.bind(this));
            drawFolder.add(this.drawParams, 'connectEvery').name('Connect every')
                .min(0).max(12).step(1)
                .onFinishChange(this.markOrbitDirty.bind(this));
            drawFolder.add(this.drawParams, 'orbitSize').name('Orbit size')
                .min(1).max(5).step(1)
                .onFinishChange(this.markOrbitDirty.bind(this));
        }
        if (this.geometry === Geometry.EUCLIDEAN &&
            ((this.duality === Duality.OUTER && this.generator === Generator.LENGTH) ||
                this.duality === Duality.INNER && this.generator === Generator.AREA)) {
            drawFolder.add(this.drawParams, 'scaffold').name('Scaffold').onFinishChange(
                this.markOrbitDirty.bind(this));
        }
        if (this.geometry === Geometry.EUCLIDEAN && this.duality === Duality.OUTER && this.generator === Generator.LENGTH) {
            drawFolder.add(this.drawParams, 'centers').name('Centers').onFinishChange(
                this.markOrbitDirty.bind(this));
            drawFolder.add(this.drawParams, 'headingCoords').name('Heading Coords').onFinishChange(
                this.markOrbitDirty.bind(this));
            // drawFolder.add(this.drawParams, 'derivative').name('Derivative')
            //     .onFinishChange(this.updateDerivativeParams.bind(this));
            // drawFolder.add(this.drawParams, 'derivativeBound').name('Der. bound')
            //     .min(1).max(50).step(1)
            //     .onFinishChange(this.markDerivativeDirty.bind(this));
            // drawFolder.add(this.drawParams, 'derivativeStep').name('Der. step (log)')
            //     .min(-8).max(0).step(1)
            //     .onFinishChange(this.markDerivativeDirty.bind(this));
        }
        if (this.geometry === Geometry.SPHERICAL) {
            drawFolder.add(this.drawParams, 'stereograph').name('Stereographic').onFinishChange(() => {
                this.cameraSwitch = true;
                this.updateTableParams();
            });
        }
        drawFolder.open();

        const gameFolder = this.gui.addFolder('Game');
        gameFolder.add(this.drawParams, 'orbit').name('Draw Orbit').onChange(this.markDrawDirty.bind(this));
        gameFolder.add(this.drawParams, 'start').name('Start Point').onChange(this.markDrawDirty.bind(this));
        if (this.duality === Duality.INNER) {
            gameFolder.add(this.gameParams, 'startTime')
                .min(0).max(1).step(0.01).name('Start time')
                .onChange(() => {
                    this.orbitDirty = true;
                });
            gameFolder.add(this.gameParams, 'angle')
                .min(0.01).max(0.99).step(0.01).name('Angle')
                .onChange(() => {
                    this.orbitDirty = true;
                });
        }
        gameFolder.add(this.gameParams, 'iterations')
            .min(1).max(20).step(1).name('Iterations (log)')
            .onChange(() => {
                this.orbitDirty = true;
            });
        if (this.duality === Duality.OUTER && this.generator === Generator.AREA) {
            gameFolder.add(this.gameParams, 'tilingPolygon')
                .min(3).max(20).step(1).name('Tiling').onFinishChange(this.makeTiling.bind(this));
        }
        gameFolder.open();

        this.gui.open();
    }

    makeTiling() {
        if (!(this.duality === Duality.OUTER && this.generator === Generator.AREA)
            || this.gameParams.tilingPolygon < 3) {
            return;
        }

        const n = this.tableParams.polygonParams.n;
        const k = this.gameParams.tilingPolygon;
        if (k < 3) return;
        let v = 6 / n + 6 / k;
        if (v === 3 && this.geometry !== Geometry.EUCLIDEAN) {
            this.billiardTypeParams.geometry = Geometry.EUCLIDEAN;
            this.cameraSwitch = true;
            this.updateGUI();
            this.updateTableParams();
        } else if (v > 3 && this.geometry !== Geometry.SPHERICAL) {
            this.billiardTypeParams.geometry = Geometry.SPHERICAL;
            this.cameraSwitch = true;
            this.updateGUI();
        } else if (v < 3 && this.geometry !== Geometry.HYPERBOLIC) {
            this.billiardTypeParams.geometry = Geometry.HYPERBOLIC;
            this.cameraSwitch = true;
            this.updateGUI();
        }

        let r;
        switch (this.geometry) {
        case Geometry.EUCLIDEAN:
            return;
        case Geometry.HYPERBOLIC:
            r = this.hyperbolicTilingRadius();
            break;
        case Geometry.SPHERICAL:
            r = this.sphericalTilingRadius();
            break;
        }
        if (r === undefined) return;

        this.tableParams.polygonParams.r = r;
        this.updateBilliardTypeParams();
    }

    hyperbolicTilingRadius(): number | undefined {
        const n = this.tableParams.polygonParams.n;
        const k = this.gameParams.tilingPolygon;
        const nint = (n - 2) * Math.PI / n;
        const kint = (k - 2) * Math.PI / k;
        if (2 * nint + 2 * kint <= 2 * Math.PI) return undefined;

        const kext = 2 * n * Math.PI / k;

        const t = Math.tan(Math.PI / n) * Math.tan(kext / (2 * n));
        const po = Math.sqrt((1 - t) / (1 + t));
        const ko = HyperPoint.poincareToKlein(po);
        const kl = ko * Math.cos(Math.PI / n);
        return HyperPoint.kleinToTrue(kl);
    }

    sphericalTilingRadius(): number | undefined {
        const n = this.tableParams.polygonParams.n;
        const k = this.gameParams.tilingPolygon;
        if (1 / n + 1 / k <= 1 / 2) return undefined;
        let m = Math.max(n, k);
        let l;
        switch (m) {
        case 3:
            l = Math.PI / 2;
            break;
        case 4:
            l = Math.PI / 3;
            break;
        case 5:
            l = Math.PI / 5;
            break;
        default:
            console.log('nonsense');
            return undefined;
        }
        // need radius of n-gon with side length l
        let a = Math.cos(l);
        let b = Math.cos(2 * Math.PI / n);
        return Math.acos(Math.abs(Math.sqrt((b - a) / (b - 1))));
    }

    setKite() {
        this.tableParams.polygonParams.n = 4;
        this.resetAffineVertices();
        const phiInv = (Math.sqrt(5) - 1) / 2;
        const pi10 = Math.PI / 10;
        this.draggables[0].position.set(0, 1, 0);
        this.draggables[1].position.set(Math.cos(11 * pi10), Math.sin(11 * pi10), 0);
        this.draggables[2].position.set(0, -phiInv, 0);
        this.draggables[3].position.set(Math.cos(19 * pi10), Math.sin(19 * pi10), 0);
        this.updateTable();
        console.log(
            this.draggables[0].position,
            this.draggables[1].position,
            this.draggables[2].position,
            this.draggables[3].position);
    }

    updateBilliardTypeParams() {
        this.updateGUI();
        this.updateTableParams();
    }

    updateDerivativeParams() {
        if (this.drawParams.derivative) {
            this.derivativeDirty = true;
        } else {
            this.scene.remove(this.derivatives);
        }
        this.drawDirty = true;
    }

    updateTableParams() {
        this.updateGUI();
        this.tableDirty = true;
        this.resetAffineVertices();
    }

    updateDrawParams() {
        this.updateTable();
        this.drawDirty = true;
    }

    markSingularityDirty() {
        this.singularityDirty = true;
    }

    markDerivativeDirty() {
        if (this.drawParams.derivative) this.derivativeDirty = true;
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    resetAffineVertices() {
        const points = [];
        this.scene.remove(...this.draggables);
        while (this.draggables.length) this.draggables.pop();
        if (this.geometry === Geometry.EUCLIDEAN && this.tableParams.tableType === TableType.POLYGON) {
            const n = this.tableParams.polygonParams.n;
            const dtheta = Math.PI * 2 / n;
            const offset = Math.PI / n - Math.PI / 2;
            for (let i = 0; i < n; i++) {
                const theta = i * dtheta + offset;
                const c = Complex.polar(1, theta);
                points.push(c.toVector2());
            }
            for (let p of points) {
                const dot = new Mesh(
                    new CircleGeometry(0.05, 16),
                    new MeshBasicMaterial({color: HANDLE_COLOR}));
                dot.translateX(p.x);
                dot.translateY(p.y);
                dot.translateZ(0.01);
                this.draggables.push(dot);
            }
        }
        this.tableDirty = true;
        this.updateTable();
    }

    affineVertexDragStart() {
        this.dragging = true;
    }

    affineVertexDrag() {
        this.updateTable();
    }

    affineVertexDragEnd() {
        this.dragging = false;
        this.updateTable();
    }

    updateTable() {
        this.tableDirty = false;

        this.scene.remove(this.tableMesh);
        let vertices: Vector2[] = [];
        let shape;
        switch (this.geometry) {
        case Geometry.SPHERICAL:
            let spherePoints = [];
            let np = new SpherePoint(new Vector3(0, 0, 1));
            let n = this.tableParams.polygonParams.n;
            for (let i = 0; i < n; i++) {
                let theta = i * 2 * Math.PI / n + Math.PI / 2;
                let ep = new SpherePoint(new Vector3(Math.cos(theta), Math.sin(theta), 0));
                let sp = sphericalLerp(np, ep, this.tableParams.polygonParams.r / (Math.PI / 2))
                spherePoints.push(sp);
            }
            this.sphericalTable = new SphericalPolygonTable(spherePoints);
            break;
        case Geometry.EUCLIDEAN:
            switch (this.tableParams.tableType) {
            case TableType.POLYGON:
                vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
                this.affineTable = new AffinePolygonTable(vertices);
                this.affineOuterTable = new AffinePolygonTable(vertices);
                shape = this.affineOuterTable.shape(vertices.length);
                break;
            case TableType.FLEXIGON:
                this.affineOuterTable = new AffineFlexigonTable(
                    this.tableParams.flexigonParams.n,
                    this.tableParams.flexigonParams.k
                );
                shape = this.affineOuterTable.shape(this.tableParams.flexigonParams.n * 128);
                break;
            case TableType.SEMIDISK:
                this.affineOuterTable = new AffineSemidiskTable(this.tableParams.semidiskParams.beta + Math.PI / 2);
                shape = this.affineOuterTable.shape(90);
                break;
            case TableType.SUPERELLIPSE:
                this.affineOuterTable = lpCircle(this.tableParams.superellipseParams.p);
                shape = this.affineOuterTable.shape(360);
                break;
            }
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
            this.tableMesh = new THREE.Mesh(geometry, material);
            break;
        case Geometry.HYPERBOLIC:
            const hyperPoints = this.hyperbolicPoints();
            this.hyperbolicTable = new HyperbolicPolygonTable(hyperPoints);
            let points = this.hyperbolicTable.interpolateVertices(this.model);
            shape = new Shape(points);
            break;
        default:
            throw Error('Unknown geometry type:' + this.billiardTypeParams.geometry);
        }

        switch (this.geometry) {
        case Geometry.SPHERICAL:
            if (!this.drawParams.stereograph) {
                this.antiTable = this.sphericalTable.mesh(36, SPHERE_SING_COLOR, this.drawParams.stereograph);
                this.antiTable.scale.set(-1, -1, -1);
            }
            this.tableMesh = this.sphericalTable.mesh(36, SPHERE_TABLE_COLOR, this.drawParams.stereograph);
            break;
        case Geometry.EUCLIDEAN:
        case Geometry.HYPERBOLIC:
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
            this.tableMesh = new THREE.Mesh(geometry, material);
            break;
        }

        if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

        this.singularityDirty = true;
        if (this.duality === Duality.OUTER && this.generator === Generator.AREA) this.derivativeDirty = true;
        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateSingularities() {
        this.singularities = new THREE.Object3D();
        // if (this.duality !== Duality.OUTER || this.generator === Generator.AREA || !this.drawParams.singularities) return;
        this.singularityDirty = false;
        let preimages: AffineRay[];
        let points: Vector2[];
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        const si = this.dragging ? Math.min(this.drawParams.singularityIterations, 1) : this.drawParams.singularityIterations;
        switch (this.geometry) {
        case Geometry.SPHERICAL:
            const lsp: Vector3[] = [];
            const spherePreimages = this.sphericalTable.preimages(this.generator, si);
            for (let sp of spherePreimages) {
                const spp = sp.points(36, this.drawParams.stereograph);
                for (let i = 0; i < spp.length - 1; i++) {
                    lsp.push(spp[i], spp[i + 1]);
                }
            }
            this.singularities = new LineSegments(
                new BufferGeometry().setFromPoints(lsp),
                new LineBasicMaterial({color: SPHERE_SING_COLOR})
            );
            this.drawDirty = true;
            return;
        case Geometry.EUCLIDEAN:
            switch (this.tableParams.tableType) {
            case TableType.POLYGON:
            case TableType.FLEXIGON:
                preimages = this.affineOuterTable.preimages(this.generator, si);
                break;
            case TableType.SEMIDISK:
                preimages = this.affineOuterTable.preimages(this.generator, Math.max(si, 10));
                break;
            case TableType.SUPERELLIPSE:
                preimages = [];
                break;
            }
            points = [];
            for (let preimage of preimages) {
                points.push(preimage.start);
                if (preimage.infinite) {
                    const diff = preimage.end.clone().sub(preimage.start);
                    const far = preimage.start.clone().add(diff.normalize().multiplyScalar(100));
                    points.push(far);
                } else {
                    points.push(preimage.end);
                }
            }

            geometry.setFromPoints(points);

            this.singularities = new THREE.LineSegments(geometry, material);
            break;
        case Geometry.HYPERBOLIC:
            this.drawHyperbolicPreimages(
                this.hyperbolicTable.preimages(this.generator, this.drawParams.singularityIterations, this.drawParams.singInterval)
            );
            break;
        default:
            throw Error('Unknown geometry');
        }

        this.drawDirty = true;
    }

    updateDerivatives() {
        if (!this.derivativeDirty) return;
        this.derivativeDirty = false;
        try {
            this.scene.remove(this.derivatives);
        } catch (e) {
        }
        const values = new Map<Vector2, Vector4>();
        const delta = 0.000_001;
        const bound = this.drawParams.derivativeBound;
        const step = Math.pow(2,
            this.dragging ? Math.max(this.drawParams.derivativeStep, -1) : this.drawParams.derivativeStep
        );
        let table;
        switch (this.geometry) {
        case Geometry.EUCLIDEAN:
            table = this.affineTable;
            break;
        case Geometry.HYPERBOLIC:
        case Geometry.SPHERICAL:
            return;
        }
        for (let i = -bound; i <= bound; i += step) {
            for (let j = -bound; j < bound; j += step) {
                const start = new Vector2(i, j);
                const ia = table.iterateOuter(new Vector2(i, j), this.generator, 1)[0];
                if (ia.length != 2) continue;
                const xa = table.iterateOuter(new Vector2(i + delta, j), this.generator, 1)[0];
                if (xa.length != 2) continue;
                const ya = table.iterateOuter(new Vector2(i, j + delta), this.generator, 1)[0];
                if (ya.length != 2) continue;
                const image = ia[1];
                const dx = xa[1].sub(image);
                const dy = ya[1].sub(image);
                const det = dx.cross(dy) / (delta * delta);
                const rotX = dx.angle();
                const rotY = dy.angle() - Math.PI / 2;
                const tangentPoint = table.rightTangentPoint(start);
                let d = image.distanceTo(tangentPoint) - start.distanceTo(tangentPoint);
                if (Math.abs(det) < 0.000_000_1) continue;
                values.set(start, new Vector4(
                    det,
                    rotX,
                    rotY,
                    d
                ));
            }
        }
        const geometry = new BoxGeometry(step, step, step);
        const material = new MeshBasicMaterial({color: new Color(0xffffff)});
        const im = new InstancedMesh(geometry, material, values.size);
        let i = 0;
        for (let [pos, val] of values.entries()) {
            const lv = Math.log(val.x);

            const s = 0.25;
            im.setMatrixAt(i, new Matrix4().makeTranslation(pos.x, pos.y, -step * 2));
            im.setColorAt(i, new Color().setRGB(
                lv < 0 ? Math.pow(clamp(-lv, 0, 1), s) : 0,
                lv > 0 ? Math.pow(clamp(lv, 0, 1), s) : 0,
                val.w,
            ));
            i++;
        }
        im.instanceMatrix.needsUpdate = true;
        this.derivatives = im;
        this.drawDirty = true;
    }

    private drawHyperbolicPreimages(preimages: HyperGeodesic[]): void {
        console.log('drawing', preimages.length, 'preimages');
        this.scene.remove(this.singularities);
        const points = [];
        for (let preimage of preimages) {
            const preimagePoints = preimage.interpolate(this.model, preimage.start, true).map(c => c.toVector2());
            for (let i = 0; i < preimagePoints.length - 1; i++) {
                points.push(preimagePoints[i]);
                points.push(preimagePoints[i + 1]);
            }
        }
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(points);
        this.singularities = new THREE.LineSegments(geometry, material);
        if (this.drawParams.singularities) this.scene.add(this.singularities);
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;

        this.scaffold = [];
        this.centers = [];

        let startPointPosition: Vector2;
        let nextPointPosition: Vector2;
        let geometry;
        let material;
        const scaffoldmat = new LineBasicMaterial({color: SCAFFOLD_COLOR});
        const it = this.dragging ? Math.min(this.iterations, 2) : this.iterations;
        switch (this.geometry) {
        case Geometry.SPHERICAL:
            switch (this.duality) {
            case Duality.INNER:
                break;
            case Duality.OUTER:
                if (this.generator === Generator.LENGTH) return;
                let theta = this.affineOuterStart.x;
                let phi = this.affineOuterStart.y;
                let orbit = this.sphericalTable.iterateOuter(new SpherePoint(
                    new Vector3(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi),
                    )
                ), this.iterations);

                const ce = this.drawParams.connectEvery;
                if (ce === 0) {
                    let vectors;
                    if (this.drawParams.stereograph) {
                        vectors = orbit[0].map(sp => sp.stereographic);
                    } else {
                        vectors = orbit[0].map(sp => sp.coords.clone().multiplyScalar(1.001));
                    }
                    this.orbit = [
                        new Points(
                            new BufferGeometry().setFromPoints(vectors),
                            new PointsMaterial({color: SPHERE_OUTER_ORBIT_COLOR})
                        )
                    ];
                } else if (ce === 1) {
                    const line = [];
                    for (let i = 0; i < orbit[0].length - 1; i++) {
                        line.push(...new SphericalArc(orbit[0][i], orbit[1][i]).points(36, this.drawParams.stereograph));
                        line.push(...new SphericalArc(orbit[1][i], orbit[0][i + 1]).points(36, this.drawParams.stereograph));
                    }
                    this.orbit = [
                        new Line(
                            new BufferGeometry().setFromPoints(line),
                            new LineBasicMaterial({color: SPHERE_OUTER_ORBIT_COLOR}),
                        )
                    ];
                } else {
                    let paths: Vector3[][] = [];
                    for (let i = 0; i < ce; i++) {
                        paths.push([]);
                    }
                    for (let i = 0; i < orbit[0].length - 1; i++) {
                        paths[i % ce].push(...new SphericalArc(orbit[0][i], orbit[0][i + 1]).points(36, this.drawParams.stereograph));
                    }
                    this.orbit = paths.map(path => new Line(
                        new BufferGeometry().setFromPoints(path),
                        new LineBasicMaterial({color: SPHERE_OUTER_ORBIT_COLOR}),
                    ));
                }

                if (orbit.length === 0) return;
                let start = this.drawParams.stereograph ? orbit[0][0].stereographic : orbit[0][0].coords;
                this.startPoint.position.set(start.x, start.y, start.z);
                if (orbit[0].length > 1) {
                    let end = this.drawParams.stereograph ? orbit[0][1].stereographic : orbit[0][1].coords;
                    this.nextPoint.visible = true;
                    this.nextPoint.position.set(end.x, end.y, end.z);
                } else {
                    this.nextPoint.visible = false;
                }
                break;
            }
            return;
        case Geometry.EUCLIDEAN:
            switch (this.duality) {
            case Duality.INNER:
                const chords = this.affineTable.iterateInner(
                    {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                    this.generator,
                    it,
                );
                if (chords.length === 0) {
                    this.orbit = [];
                    return;
                }
                if (chords.length > 1 && this.generator === Generator.AREA && this.drawParams.scaffold) {
                    // Line segment from
                    const p1 = this.affineTable.point(chords[0].startTime);
                    const p2 = this.affineTable.point(chords[0].endTime);
                    const h2 = this.affineTable.tangentHeading(chords[0].endTime);
                    const diff = new Vector2(Math.cos(h2), Math.sin(h2)).multiplyScalar(10);
                    const p3 = this.affineTable.point(chords[1].endTime);
                    const sc = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    sc.geometry.setFromPoints([p1, p3]);
                    const tl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    tl.geometry.setFromPoints([p2.clone().add(diff), p2.clone().sub(diff)]);
                    this.scaffold.push(sc, tl);
                }
                const points = chords.map(chord => chord.p1);
                points.push(chords[chords.length - 1].p2);

                startPointPosition = points[0];
                nextPointPosition = points[1];

                geometry = new THREE.BufferGeometry().setFromPoints(points);

                material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});

                this.orbit = [new THREE.Line(geometry, material)];
                break;
            case Duality.OUTER:
                let table = this.affineOuterTable;
                const result = table.iterateOuter(this.affineOuterStart, this.generator, it, this.drawParams.centers);
                const orbit = result[0];
                // const orbit = result[0].filter(polygon => polygon.x > Math.sqrt(2) / 2 && polygon.y > Math.sqrt(2) / 2 && polygon.y < 3 * Math.sqrt(2) / 2);
                // for (let i = 0; i < orbit.length - 1; i++) {
                //     console.log(orbit[i + 1].clone().sub(orbit[i]));
                // }
                const centers = result[1];
                if (this.generator === Generator.LENGTH && this.drawParams.scaffold && orbit.length > 1) {
                    const ac = table.outerLengthCircle(this.affineOuterStart, false);

                    const path = new THREE.Path();
                    path.absellipse(ac.center.x, ac.center.y, ac.radius, ac.radius, 0, 2 * Math.PI, true, 0);
                    const diskPoints = path.getPoints(Math.max(32, ac.radius * 4));

                    const diskGeometry = new THREE.BufferGeometry().setFromPoints(diskPoints.concat([diskPoints[0]]));
                    this.scaffold.push(new THREE.Line(diskGeometry, scaffoldmat));

                    const rp = table.leftTangentPoint(orbit[0]);
                    const fp = table.rightTangentPoint(orbit[0]);
                    // const tp = table.rightTangentPoint(ac);
                    const dr = orbit[0].clone().sub(rp).normalize().multiplyScalar(100);
                    const df = orbit[0].clone().sub(fp).normalize().multiplyScalar(100);
                    const rtl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    const ftl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    rtl.geometry.setFromPoints([orbit[0].clone().add(dr), rp.clone().sub(dr)]);
                    ftl.geometry.setFromPoints([orbit[0].clone().add(df), fp.clone().sub(df)]);
                    this.scaffold.push(rtl, ftl);
                    // if (table instanceof AffineFlexigonTable) {
                    //     const tl = table.rightTangentLine(ac);
                    // }
                    if (orbit.length > 1) {
                        const tp = table.rightTangentPoint(orbit[1]);
                        const ttl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                        const df = orbit[0].clone().sub(orbit[1]).normalize().multiplyScalar(100);
                        const dt = orbit[1].clone().sub(tp).normalize().multiplyScalar(100);
                        ttl.geometry.setFromPoints([orbit[1].clone().add(dt), tp.clone().sub(dt)]);
                        this.scaffold.push(ttl);
                    }
                }
                startPointPosition = this.affineOuterStart;
                nextPointPosition = orbit.length > 1 ? orbit[1] : startPointPosition;

                if (this.drawParams.connectEvery == 0) {
                    const o = this.drawParams.headingCoords ? orbit.map(p => {
                        // return new Vector2(10 * Math.atan(polygon.length()), polygon.angle());
                        return table.headingCoords(p);
                    }) : orbit;
                    const pts = new Points(new BufferGeometry().setFromPoints(o), new PointsMaterial({
                        color: OUTER_ORBIT_COLOR,
                        size: this.drawParams.orbitSize,
                    }));
                    this.orbit = [pts];
                    if (result.length > 1 && this.generator === Generator.LENGTH && this.drawParams.centers) {
                        this.centers = [new THREE.Points(
                            new BufferGeometry().setFromPoints(result[1]),
                            new PointsMaterial({
                                color: CIRCLE_CENTER_COLOR,
                                size: this.drawParams.orbitSize,
                            })
                        )];
                    }
                    break;
                }
                // connectEvery > 0
                const seqs: Vector2[][] = [];
                const cseqs: Vector2[][] = [];
                for (let i = 0; i < this.drawParams.connectEvery; i++) {
                    seqs.push([]);
                    cseqs.push([]);
                }
                for (let i = 0; i < orbit.length; i++) {
                    seqs[i % this.drawParams.connectEvery].push(orbit[i]);
                }
                for (let i = 0; i < centers.length; i++) {
                    if (this.drawParams.centers) cseqs[i % this.drawParams.connectEvery].push(centers[i]);
                }
                this.orbit = [];
                for (let i = 0; i < seqs.length; i++) {
                    geometry = new THREE.BufferGeometry().setFromPoints(seqs[i]);
                    material = new LineBasicMaterial({
                        color: OUTER_ORBIT_COLOR,
                        linewidth: this.drawParams.orbitSize,
                    });
                    this.orbit.push(new THREE.Line(geometry, material));
                }
                if (this.drawParams.centers) {
                    for (let i = 0; i < cseqs.length; i++) {
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints(cseqs[i]);
                        const lineMaterial = new LineBasicMaterial({
                            color: CIRCLE_CENTER_COLOR,
                            linewidth: this.drawParams.orbitSize
                        });
                        this.centers.push(new THREE.Line(lineGeometry, lineMaterial));
                    }
                }
                break;
            default:
                throw Error('Unknown duality');
            }
            break;
        case Geometry.HYPERBOLIC:
            let points: Vector2[];
            switch (this.duality) {
            case Duality.INNER:
                const chords = this.hyperbolicTable.iterateInner(
                    {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                    this.generator,
                    this.iterations);
                points = [];
                for (let chord of chords) {
                    points.push(...chord.interpolate(this.model, chord.start).map(c => c.toVector2()));
                }
                if (chords.length === 0) {
                    this.orbit = [];
                    this.nextPoint = new THREE.Mesh();
                    return;
                }
                geometry = new THREE.BufferGeometry().setFromPoints(points);
                material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});
                this.orbit = [new THREE.Line(geometry, material)];
                startPointPosition = chords[0].start.resolve(this.model).toVector2();
                nextPointPosition = chords[0].end.resolve(this.model).toVector2();
                break;
            case Duality.OUTER:
                const orbit = this.hyperbolicTable.iterateOuter(this.hyperOuterStart, this.generator, this.iterations);
                startPointPosition = this.hyperOuterStart.resolve(this.model).toVector2();
                if (orbit.length > 1) nextPointPosition = orbit[1].resolve(this.model).toVector2();
                else nextPointPosition = orbit[0].resolve(this.model).toVector2();

                if (this.drawParams.connectEvery == 0) {
                    // geometry = new THREE.CircleGeometry(0.005, 16);
                    // material = new THREE.MeshBasicMaterial({color: OUTER_ORBIT_COLOR});
                    // this.orbit = [new THREE.InstancedMesh(geometry, material, orbit.length)];
                    // for (let i = 0; i < orbit.length; i++) {
                    //     (this.orbit[0] as THREE.InstancedMesh)
                    //         .setMatrixAt(i, new Matrix4().makeTranslation(
                    //             orbit[i].resolve(this.model).x,
                    //             orbit[i].resolve(this.model).y,
                    //             0));
                    // }
                    // (this.orbit[0] as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                    this.orbit = [new THREE.Points(
                        new BufferGeometry().setFromPoints(orbit.map(pt => pt.resolve(this.model).toVector2())),
                        new PointsMaterial({color: OUTER_ORBIT_COLOR})
                    )];
                    break;
                }
                // connectEvery > 0
                points = [];
                for (let i = 0; i < orbit.length - 1; i++) {
                    const o1 = orbit[i];
                    const o2 = orbit[i + 1];
                    const g = new HyperGeodesic(o1, o2);
                    points.push(...g.interpolate(
                        this.model,
                        g.start,
                        true).map(c => c.toVector2()));
                }
                geometry = new THREE.BufferGeometry().setFromPoints(points);
                material = new THREE.LineBasicMaterial({color: OUTER_ORBIT_COLOR});
                this.orbit = [new THREE.Line(geometry, material)];
                break;
            default:
                throw Error('Unknown duality');
            }
            break;
        default:
            throw Error('Unknown geometry');
        }
        this.startPoint.position.set(startPointPosition.x, startPointPosition.y, 0.001);
        this.nextPoint.position.set(nextPointPosition.x, nextPointPosition.y, 0.001);
        this.nextPoint.visible = true;

        this.drawDirty = true;
    }

    updateDraw() {
        this.drawDirty = false;
        this.scene.clear();
        this.scene.add(this.tableMesh);
        // this.scene.add(this.strip);

        if (this.tableParams.tableType === TableType.POLYGON) {
            this.scene.add(...this.draggables);
        }

        switch (this.geometry) {
        case Geometry.EUCLIDEAN:
            // this.scene.add(this.planarPlane);
            break;
        case Geometry.HYPERBOLIC:
            // this.scene.add(this.hyperbolicPlane);
            this.scene.add(this.hyperbolicDisk);
            break;
        case Geometry.SPHERICAL:
            if (!this.drawParams.stereograph) {
                this.scene.add(this.antiTable);
                this.scene.add(this.sphericalSphere);
                this.scene.add(...this.lights);
            }
            break;
        }

        if (this.duality === Duality.OUTER && this.drawParams.singularities) this.scene.add(this.singularities);

        if (this.drawParams.derivative) this.scene.add(this.derivatives);

        if (this.drawParams.scaffold && this.scaffold.length > 0) this.scene.add(...this.scaffold);

        if (this.drawParams.orbit) {
            this.scene.add(...this.orbit);
        }
        if (this.drawParams.start) {
            this.scene.add(this.startPoint);
            this.scene.add(this.nextPoint);
        }
        if (this.drawParams.centers) this.scene.add(...this.centers);
    }

    get geometry(): Geometry {
        return this.billiardTypeParams.geometry;
    }

    get duality(): Duality {
        return this.billiardTypeParams.duality;
    }

    get generator(): Generator {
        return this.billiardTypeParams.generator;
    }

    get model(): HyperbolicModel {
        return this.drawParams.model === 'Poincaré' ? HyperbolicModel.POINCARE : HyperbolicModel.KLEIN;
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations) - 1;
    }

    private hyperbolicPoints(): HyperPoint[] {
        const points = [];
        const n = this.tableParams.polygonParams.n;
        const r = this.tableParams.polygonParams.r;
        const dtheta = Math.PI * 2 / n;
        const offset = Math.PI / n - Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const theta = i * dtheta + offset;
            const c = Complex.polar(HyperPoint.trueToPoincare(r), theta);
            points.push(HyperPoint.fromPoincare(c));
        }
        return points;
    }

    // hyperbolicNecklaces(steps: number): HyperbolicPolygon[][] {
    //     const n = this.tableParams.polygonParams.n;
    //     const k = this.gameParams.tilingPolygon;
    //     const l = this.hyperbolicTilingRadius();
    //     if (!l) {
    //         return [[this.hyperbolicTable.polygon]];
    //     }
    //     const polygons = [[this.hyperbolicTable.polygon]];
    //     let oldFrontier: HyperPoint[] = [];
    //     for (let i = 0; i < steps; i++) {
    //         const newFrontier = [];
    //         for (let polygon of polygons[polygons.length - 1]) {
    //             for (let v of polygon.vertices) {
    //                 for (let f of oldFrontier) {
    //                     if (v.distance(f) > l / 2) {
    //                         newFrontier.push(v);
    //                     }
    //                 }
    //             }
    //         }
    //         const newPolygons: HyperbolicPolygon[] = [];
    //         const q = i % 2 == 0 ? k : n;
    //         for (let j = 0; j < newFrontier.length; j++) {
    //             const v1 = newFrontier[j];
    //             const v2 = newFrontier[(j + 1) % newFrontier.length];
    //             // need to check first and last
    //             let already = false;
    //             if (newPolygons.length > 0) {
    //                 for (let polygon of [newPolygons[0], newPolygons[newPolygons.length - 1]]) {
    //                     let av1 = false;
    //                     let av2 = false;
    //                     for (let v of polygon.vertices) {
    //                         if (v.distance(v1) < l / 2) av1 = true;
    //                         if (v.distance(v2) < l / 2) av2 = true;
    //                     }
    //                     if (av1 && av2) {
    //                         already = true;
    //                         break;
    //                     }
    //                 }
    //             }
    //             if (already) continue;
    //             newPolygons.push(HyperbolicPolygon.regular(q, v2, v1));
    //         }
    //         oldFrontier = newFrontier;
    //         polygons.push(newPolygons);
    //     }
    // }
}
