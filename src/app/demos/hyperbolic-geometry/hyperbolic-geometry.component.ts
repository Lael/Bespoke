import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
    BufferGeometry,
    CircleGeometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Raycaster,
    ShapeGeometry,
    Vector2
} from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Mobius} from "../../../math/mobius";
import {Complex} from "../../../math/complex";
import {lpCircle} from "../../../math/billiards/affine-oval-table";
import {CommonModule} from "@angular/common";
import {DragControls} from "three/examples/jsm/controls/DragControls.js";

// Colors
const CLEAR_COLOR = 0x0a2933;
const DISK_COLOR = 0xf9f4e9;
const ORIGIN_COLOR = 0x881111;
const DOT_COLOR = 0x111111;
const LINE_COLOR = 0x111188;


interface HyperbolicCircle {
    center: HyperPoint,
    radius: number,
}

// interface HypercircleArc {
//     p1: HyperPoint,
//     p2: HyperPoint,
// }

enum ToolMode {
    Point = 'Point',
    Circle = 'Circle',
    Line = 'Line',
    MagLine = 'MagLine',
    Delete = 'Delete',
}

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
    imports: [CommonModule],
    standalone: true,
})
export class HyperbolicGeometryComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;
    p1: HyperPoint | null = null;
    center: HyperPoint | null = null;

    // Parameters
    params = {
        modelPoincare: true,
        modelKlein: false,
        toolPoint: true,
        toolLine: false,
        toolMagLine: false,
        toolCircle: false,
        toolDelete: false,

        magCurvature: 0,

        // dx: true,
        // dilat: false,
        // special: false,

        xMin: -5,
        xMax: 5,
        xStep: 0.125,

        yMin: 0.125,
        yMax: 5,
        yStep: 0.125,

        vectorScale: 0.0625,
    };

    oldModel = this.model;

    translation = Mobius.blaschke(new Complex());
    originHandle: Mesh;

    // GUI
    gui: dat.GUI;

    // Stuff on the screen
    disk = new Mesh();
    points = new Map<Mesh, HyperPoint>();
    circles = new Map<Line, HyperbolicCircle>();
    lines = new Map<Line, { p1: HyperPoint, p2: HyperPoint }>();

    // VF stuff
    // halfPlane = new Mesh();
    // dx: ArrowHelper[] = [];
    // dilat: ArrowHelper[] = [];
    // special: ArrowHelper[] = [];

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.dragStart.bind(this));
        this.dragControls.addEventListener('drag', this.drag.bind(this));
        this.dragControls.addEventListener('dragend', this.dragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        const diskGeometry = new THREE.CircleGeometry(1, 256);
        const diskMaterial = new THREE.MeshBasicMaterial({color: DISK_COLOR});

        this.disk = new THREE.Mesh(diskGeometry, diskMaterial);

        let shape = new THREE.Shape(lpCircle(0.5).points(256).map(p => p.multiplyScalar(0.025)));
        this.originHandle = new Mesh(new ShapeGeometry(shape),
            new THREE.MeshBasicMaterial({color: ORIGIN_COLOR}));
        this.draggables.push(this.originHandle);

        this.gui = new dat.GUI();
        this.updateGUI();

        // for (let i = 0; i <= 3; i++) {
        //     const hp = HyperPoint.fromPoincare(Complex.polar(0.999, i * Math.PI / 2));
        //     const vec = hp.poincare.toVector2();
        //     const dot = new Mesh(new CircleGeometry(0.005, 32), new MeshBasicMaterial({color: DOT_COLOR}));
        //     dot.position.set(vec.x, vec.y, 0);
        //     this.points.set(dot, hp);
        // }

        // this.halfPlane = new Mesh(
        //     new PlaneGeometry(1000, 500), new MeshBasicMaterial({color: DISK_COLOR})
        // );
        // this.halfPlane.translateY(250)
        //
        // this.computeVFs();
    }

    // lengthToColor(l: number) {
    //     const len = Math.atan(l * this.params.vectorScale * 4) / (Math.PI / 2);
    //     return new Color(0x00aaaa).multiplyScalar(1 - len).add(new Color(0xaa0000).multiplyScalar(len));
    // }


    // computeVFs() {
    //     this.dx = [];
    //     this.dilat = [];
    //     this.special = [];
    //     for (let x = this.params.xMin; x <= this.params.xMax; x += this.params.xStep) {
    //         for (let y = this.params.yMin; y <= this.params.yMax; y += this.params.yStep) {
    //             const position = new Vector3(x - this.params.xStep / 2, y - this.params.yStep / 2, 0)
    //             this.dx.push(new ArrowHelper(new Vector3(1, 0, 0), position, this.params.vectorScale, 0x000000, 0.02, 0.02));
    //             const dilatLen = Math.sqrt(x * x + y * y);
    //             const dilatColor = this.lengthToColor(dilatLen);
    //             this.dilat.push(new ArrowHelper(new Vector3(x, y, 0).normalize(), position, Math.atan(dilatLen * this.params.vectorScale) / (Math.PI / 2), dilatColor, 0.02, 0.02));
    //             const specialDir = new Vector3((x * x - y * y), 2 * x * y, 0);
    //             const specialLen = specialDir.length();
    //             const specialColor = this.lengthToColor(specialLen);
    //             this.special.push(new ArrowHelper(specialDir.clone().normalize(), position, Math.atan(specialLen * this.params.vectorScale) / (Math.PI / 2), specialColor, 0.02, 0.02));
    //         }
    //     }
    // }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.updateDraw();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const setModel = (model: HyperbolicModel) => {
            const originHP = new HyperPoint(new Vector2(this.originHandle.position.x, this.originHandle.position.y),
                this.oldModel);
            this.params.modelPoincare = model === HyperbolicModel.POINCARE;
            this.params.modelKlein = model === HyperbolicModel.KLEIN;
            this.updateGUI();
            const originVec = originHP.resolve(this.model);
            this.originHandle.position.set(originVec.x, originVec.y, 0);
            this.oldModel = this.model;
        }

        const modelFolder = this.gui.addFolder('Model');
        modelFolder.add(this.params, 'modelPoincare').name('Poincaré')
            .listen().onChange(() => setModel(HyperbolicModel.POINCARE));
        modelFolder.add(this.params, 'modelKlein').name('Klein')
            .onChange(() => setModel(HyperbolicModel.KLEIN));
        modelFolder.open();

        const setToolMode = (mode: ToolMode) => {
            this.params.toolPoint = mode === ToolMode.Point;
            this.params.toolLine = mode === ToolMode.Line;
            this.params.toolMagLine = mode === ToolMode.MagLine;
            this.params.toolCircle = mode === ToolMode.Circle;
            this.params.toolDelete = mode === ToolMode.Delete;
            this.updateGUI();
        }

        const toolFolder = this.gui.addFolder('Tool');
        toolFolder.add(this.params, 'toolPoint').name('Point')
            .listen().onChange(() => setToolMode(ToolMode.Point));
        toolFolder.add(this.params, 'toolLine').name('Line')
            .listen().onChange(() => setToolMode(ToolMode.Line));
        toolFolder.add(this.params, 'toolMagLine').name('Magnetic')
            .listen().onChange(() => setToolMode(ToolMode.MagLine));
        toolFolder.add(this.params, 'magCurvature').name('Magnetic κ').min(0).max(1).step(0.01);
        // toolFolder.add(this.params, 'toolCircle').name('Circle')
        //     .listen().onChange(() => setToolMode(ToolMode.Circle));
        toolFolder.add(this.params, 'toolDelete').name('Delete')
            .listen().onChange(() => setToolMode(ToolMode.Delete));
        toolFolder.open();

        // this.gui.add(this.params, 'dx').name('∂x');
        // this.gui.add(this.params, 'dilat').name('Dilation');
        // this.gui.add(this.params, 'special').name('Special Conformal');

        this.gui.open();
    }

    untranslatedHyperpoint(x: number, y: number): HyperPoint {
        const pt = new HyperPoint(new Vector2(x, y), this.model);
        return HyperPoint.fromPoincare(this.translation.inverse().apply(pt.poincare));
    }

    override mousedown(e: MouseEvent) {
        super.mousedown(e);
        if (e.buttons !== 1 || !(e.target instanceof HTMLCanvasElement)) return;
        if (this.dragging) {
            return;
        }

        const aspectRatio = this.renderer.domElement.clientWidth / this.renderer.domElement.clientHeight;
        const sx = (2 * e.clientX / this.renderer.domElement.clientWidth - 1) * aspectRatio / this.camera.zoom;
        const sy = (1 - 2 * e.clientY / this.renderer.domElement.clientHeight) / this.camera.zoom;

        if (sx * sx + sy * sy > 0.999) return;

        let pt = new HyperPoint(new Vector2(sx, sy), this.model);
        let hp = HyperPoint.fromPoincare(this.translation.inverse().apply(pt.poincare));
        const vec = hp.resolve(this.model);

        const rc = new Raycaster();
        rc.setFromCamera(new Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        ), this.camera);
        rc.params.Line!.threshold = 0.05;

        const pointIntersections = rc.intersectObjects(Array.from(this.points.keys()));
        const lineIntersections = rc.intersectObjects(Array.from(this.lines.keys()));
        const circleIntersections = rc.intersectObjects(Array.from(this.circles.keys()));

        switch (this.toolMode) {
        case ToolMode.Point:
            if (pointIntersections.length > 0) {
                break;
            }
            const dot = new Mesh(new CircleGeometry(0.005, 32), new MeshBasicMaterial({color: DOT_COLOR}));
            dot.position.set(vec.x, vec.y, 0);
            this.points.set(dot, hp);
            break;
        case ToolMode.Circle:
            if (pointIntersections.length > 0) {
                hp = this.untranslatedHyperpoint(pointIntersections[0].object.position.x, pointIntersections[0].object.position.y);
            }
            if (this.center === null) {
                this.center = hp;
            } else {
                const radius = this.center.distance(hp);
                const circle = this.makeCircle(this.center, radius);
                this.circles.set(circle, {center: HyperPoint.fromPoincare(this.center.poincare), radius});
                this.center = null;
            }
            break;
        case ToolMode.Line:
            if (pointIntersections.length > 0) {
                hp = this.untranslatedHyperpoint(pointIntersections[0].object.position.x, pointIntersections[0].object.position.y);
            } else {
                break;
            }
            if (this.p1 === null) {
                this.p1 = hp;
            } else {
                const p = HyperPoint.fromPoincare(this.p1.poincare);
                const g = new HyperGeodesic(p, hp);
                const gi = new HyperGeodesic(g.ip, g.iq);
                const arc = this.makeArc(gi);
                this.lines.set(arc, {p1: g.ip, p2: g.iq});
                this.p1 = null;
            }
            break;
        case ToolMode.MagLine:
            break
        case ToolMode.Delete:
            for (let td of pointIntersections) {
                this.points.delete(td.object as Mesh);
            }
            if (lineIntersections.length > 0) {
                this.lines.delete(lineIntersections[0].object as Line);
            }
            if (circleIntersections.length > 0) {
                this.circles.delete(circleIntersections[0].object as Line);
            }
        }
    }

    makeArc(g: HyperGeodesic): Line {
        const points = g.interpolate(this.model, g.ip);
        return new Line(
            new BufferGeometry().setFromPoints(points.map(p => p.toVector2())),
            new LineBasicMaterial({color: LINE_COLOR}),
        );
    }

    getCirclePoints(center: HyperPoint, radius: number): HyperPoint[] {
        const numPoints = 256;
        const pr = HyperPoint.trueToPoincare(radius);
        const points: HyperPoint[] = [];
        const slide = Mobius.blaschke(center.poincare.scale(-1));
        for (let i = 0; i <= numPoints; i++) {
            const theta = Math.PI * 2 * i / numPoints;
            points.push(
                HyperPoint.fromPoincare(slide.apply(new Complex(pr * Math.cos(theta), pr * Math.sin(theta))))
            );
        }
        return points;
    }

    makeCircle(center: HyperPoint, radius: number): Line {
        const points = this.getCirclePoints(center, radius);
        return new Line(
            new BufferGeometry().setFromPoints(points.map(p => p.resolve(this.model).toVector2())),
            new LineBasicMaterial({color: LINE_COLOR}),
        );
    }

    override mousemove(e: MouseEvent) {
        super.mousemove(e);
        // if (!this.dragState) return;

    }

    override mouseup(e: MouseEvent) {
        super.mouseup(e);
        // this.dragState = false;
    }

    dragStart() {
        this.dragging = true;
    }

    drag() {
        if (this.originHandle.position.length() > 0.999) this.originHandle.position.copy(
            this.originHandle.position.clone().normalize().multiplyScalar(0.999)
        );
        const hp = new HyperPoint(new Complex(-this.originHandle.position.x, -this.originHandle.position.y), this.model);
        this.translation = Mobius.blaschke(hp.poincare);
    }

    dragEnd() {
        this.dragging = false;
    }


    updateDraw() {
        this.scene.clear();
        // this.scene.add(this.halfPlane);
        this.scene.add(this.disk);
        this.scene.add(this.originHandle);

        // if (this.params.dx) this.scene.add(...this.dx);
        // if (this.params.dilat) this.scene.add(...this.dilat);
        // if (this.params.special) this.scene.add(...this.special);

        for (let [dot, hp] of this.points.entries()) {
            const p = HyperPoint.fromPoincare(this.translation.apply(hp.poincare)).resolve(this.model);
            dot.position.set(p.x, p.y, 0);
            this.scene.add(dot);
        }

        for (let [arc, {p1, p2}] of this.lines.entries()) {
            const g = new HyperGeodesic(
                HyperPoint.fromPoincare(this.translation.apply(p1.poincare)),
                HyperPoint.fromPoincare(this.translation.apply(p2.poincare)));
            const points = g.interpolate(this.model, g.ip);
            arc.geometry.setFromPoints(points.map(p => p.toVector2()));
            this.scene.add(arc);
        }

        for (let [circle, {center, radius}] of this.circles.entries()) {
            const points = this.getCirclePoints(center, radius).map(p => {
                const tp = HyperPoint.fromPoincare(this.translation.apply(p.poincare));
                return tp.resolve(this.model).toVector2()
            });
            circle.geometry.setFromPoints(points);
            this.scene.add(circle);
        }
    }

    get model(): HyperbolicModel {
        if (this.params.modelPoincare) return HyperbolicModel.POINCARE;
        if (this.params.modelKlein) return HyperbolicModel.KLEIN;
        throw Error('no model selected');
    }

    get toolMode(): ToolMode {
        if (this.params.toolPoint) return ToolMode.Point;
        if (this.params.toolLine) return ToolMode.Line;
        if (this.params.toolMagLine) return ToolMode.MagLine;
        if (this.params.toolCircle) return ToolMode.Circle;
        if (this.params.toolDelete) return ToolMode.Delete;
        throw Error('no tool mode selected');
    }
}